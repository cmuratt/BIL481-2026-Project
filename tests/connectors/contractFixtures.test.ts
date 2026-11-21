/**
 * Contract fixtures with connector data (API Contract v1.1 §5, §8 Q1 — Arda supplies the
 * domain/meta part; Sefa owns the HTTP error fixtures in the same folder).
 *
 * The four success fixtures are NOT hand-written: they are the real output of
 *   connector handlers → MCP HTTP server (/mcp) → gateway adapter forwardToolQuery
 * with seed '481-FALL-2026' and a test clock fixed at 2026-11-23T09:00:00+03:00 (Monday).
 * `meta.durationMs` is a real measurement (monotonic timer) and therefore varies between runs; it is
 * normalised to 0 in the committed files. Real responses carry the measured value (integer ms).
 * The data are synthetic (`isSimulated: true`).
 *
 * This test fails when connector output and the committed fixtures drift apart.
 * Regenerate after an intentional change:
 *   UPDATE_CONTRACT_FIXTURES=1 npx vitest run tests/connectors/contractFixtures.test.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TOOL_NAMES } from '@campus-orchestrator/shared';
import { startHttpServer, ToolDispatcher } from '../../apps/mcp-server/src/index.js';
import { forwardToolQuery } from '../../apps/api-gateway/src/proxy/mcpProxy.js';
import {
  createCampusConnectors,
  DEFAULT_MOCK_SEED,
  FaultInjectingConnector,
  InMemoryCacheStore,
  loadConnectorConfig,
  registerConnectorHandlers,
  ResilientConnectorExecutor,
} from '../../packages/connectors/src/index.js';
import { TestClock } from './helpers.js';

const FIXTURE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../contracts/fixtures');
const UPDATE = process.env.UPDATE_CONTRACT_FIXTURES === '1';

const guest = {
  studentId: null,
  role: 'GUEST' as const,
  isAuthenticated: false,
  verifiedAt: '2026-11-23T06:00:00.000Z',
  clientIp: '127.0.0.1',
};

const clock = new TestClock('2026-11-23T09:00');
let server: http.Server;
let mcpUrl = '';
let library: FaultInjectingConnector<any, any>;

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const config = loadConnectorConfig({ CONNECTOR_MOCK_SEED: DEFAULT_MOCK_SEED });
  const base = createCampusConnectors(config, clock.now);
  library = new FaultInjectingConnector(base.library);
  const executor = new ResilientConnectorExecutor({ cache: new InMemoryCacheStore(clock.now), clock: clock.now });
  const dispatcher = new ToolDispatcher();
  server = await startHttpServer(0, '127.0.0.1', dispatcher);
  registerConnectorHandlers(dispatcher, { connectors: { ...base, library }, executor, ttlSeconds: config.ttlSeconds, clock: clock.now });
  mcpUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.restoreAllMocks();
});

async function produce(toolName: string, parameters: Record<string, unknown>) {
  const result = await forwardToolQuery({ toolName, parameters, authContext: guest, mcpUrl, now: clock.now });
  expect(result.statusCode).toBe(200);
  const body = result.body as { meta: { durationMs: number } };
  expect(Number.isInteger(body.meta.durationMs)).toBe(true);
  expect(body.meta.durationMs).toBeGreaterThanOrEqual(0);
  body.meta.durationMs = 0; // normalised: see file header
  return body;
}

function check(name: string, body: unknown): void {
  const file = path.join(FIXTURE_DIR, name);
  const text = `${JSON.stringify(body, null, 2)}\n`;
  if (UPDATE) {
    writeFileSync(file, text);
  }
  // Git may check the fixtures out with CRLF on Windows (core.autocrlf); compare content, not line endings.
  expect(readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).toBe(text);
}

describe('Contract fixtures (connector data + meta) match real connector output', () => {
  // Order matters: the stale fixture needs the library entry produced by the library fixture.
  it('query-cafeteria-success.json', async () => {
    const body: any = await produce(TOOL_NAMES.CAFETERIA_MENU, { date: '2026-11-23' });
    expect(body.meta).toMatchObject({ source: 'LIVE', isSimulated: true, isStale: false });
    check('query-cafeteria-success.json', body);
  });

  it('query-shuttle-success.json', async () => {
    const body: any = await produce(TOOL_NAMES.SHUTTLE_SCHEDULE, { route: 'MAIN_RING' });
    expect(body.meta.source).toBe('LIVE');
    check('query-shuttle-success.json', body);
  });

  it('query-library-success.json', async () => {
    const body: any = await produce(TOOL_NAMES.LIBRARY_OCCUPANCY, { floor: 'ALL' });
    expect(body.meta.source).toBe('LIVE');
    check('query-library-success.json', body);
  });

  it('query-stale-success.json (library, TTL expired, injected upstream failure)', async () => {
    clock.advanceSeconds(90); // library TTL 60 s expired, retention 180 s not yet
    library.failAlways();
    const body: any = await produce(TOOL_NAMES.LIBRARY_OCCUPANCY, { floor: 'ALL' });
    library.recover();
    expect(body.meta).toMatchObject({ source: 'STALE', isStale: true, timestamp: '2026-11-23T06:00:00.000Z' });
    check('query-stale-success.json', body);
  });
});
