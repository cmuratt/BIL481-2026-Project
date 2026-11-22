/**
 * A-06: connector metadata reaches the REST response unchanged.
 *
 * Chain under test (all real code, in one process, no Docker):
 *   connector handlers (this package)
 *     → ToolDispatcher + MCP HTTP server `POST /mcp` (apps/mcp-server, startHttpServer)
 *     → gateway adapter forwardToolQuery (apps/api-gateway, real fetch over loopback)
 *     → `{ ok, toolName, data, meta }` of API Contract v1.1 §3.2 / §3.4
 *
 * What this test is NOT: it does not start the Fastify gateway, Redis, the web client or Compose, and
 * it registers the connector handlers on the dispatcher itself because the MCP server still registers
 * the temporary sample handlers at startup (Murat, task M-02). It therefore proves contract
 * compatibility of the connector output, not a deployed end-to-end run.
 */

import type { AddressInfo } from 'node:net';
import type http from 'node:http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { TOOL_NAMES } from '@campus-orchestrator/shared';
import { startHttpServer, ToolDispatcher } from '../../apps/mcp-server/src/index.js';
import { forwardToolQuery } from '../../apps/api-gateway/src/proxy/mcpProxy.js';
import type { AuthenticatedRequestContext } from '../../apps/api-gateway/src/types/auth.js';
import {
  createCampusConnectors,
  createConnectorToolHandlers,
  FaultInjectingConnector,
  InMemoryCacheStore,
  loadConnectorConfig,
  RecordingEventSink,
  registerConnectorHandlers,
  ResilientConnectorExecutor,
} from '../../packages/connectors/src/index.js';
import { TestClock } from './helpers.js';

const clock = new TestClock('2026-11-23T09:00'); // Monday, acceptance clock of Contract §7
const config = loadConnectorConfig({});
const baseConnectors = createCampusConnectors(config, clock.now);
const library = new FaultInjectingConnector(baseConnectors.library);
const log = new RecordingEventSink();
const executor = new ResilientConnectorExecutor({ cache: new InMemoryCacheStore(clock.now), clock: clock.now, onEvent: log.sink });
const deps = { connectors: { ...baseConnectors, library }, executor, ttlSeconds: config.ttlSeconds, clock: clock.now };

let server: http.Server;
let mcpUrl = '';

const guestCtx: AuthenticatedRequestContext = {
  studentId: null,
  role: 'GUEST',
  isAuthenticated: false,
  verifiedAt: '2026-11-23T06:00:00.000Z',
  clientIp: '127.0.0.1',
};
const studentCtx = (studentId: string): AuthenticatedRequestContext => ({
  ...guestCtx,
  studentId,
  role: 'STUDENT',
  isAuthenticated: true,
});

const query = (toolName: string, parameters: unknown, authContext = guestCtx) =>
  forwardToolQuery({ toolName, parameters, authContext, mcpUrl, now: clock.now });

beforeAll(async () => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  const dispatcher = new ToolDispatcher();
  server = await startHttpServer(0, '127.0.0.1', dispatcher);
  // startHttpServer() registers the sample handlers; replace them as M-02 will do at startup.
  registerConnectorHandlers(dispatcher, deps);
  mcpUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  vi.restoreAllMocks();
});

describe('A-06: connector metadata through MCP HTTP + gateway adapter', () => {
  it('cafeteria LIVE: data is the domain object, meta has the five contract fields', async () => {
    const result = await query(TOOL_NAMES.CAFETERIA_MENU, { date: '2026-11-23' });
    expect(result.statusCode).toBe(200);
    const body = result.body as any;
    expect(body.ok).toBe(true);
    expect(body.toolName).toBe('get_cafeteria_menu');
    expect(body.data).toMatchObject({ date: '2026-11-23', available: true });
    expect(body.meta).toEqual({
      isSimulated: true,
      isStale: false,
      source: 'LIVE',
      timestamp: '2026-11-23T06:00:00.000Z',
      durationMs: expect.any(Number),
    });
  });

  it('repeat within TTL: CACHE_HIT and the log shows one connector execution (AC-01.7)', async () => {
    log.clear();
    clock.advanceSeconds(30);
    const second = (await query(TOOL_NAMES.CAFETERIA_MENU, { date: '2026-11-23' })).body as any;
    expect(second.meta).toMatchObject({ source: 'CACHE_HIT', isStale: false, isSimulated: true, timestamp: '2026-11-23T06:00:00.000Z' });
    expect(log.upstreamCalls('cafeteria')).toBe(0);
  });

  it('library STALE after TTL + fault: HTTP 200, source STALE, original timestamp (AC-03.7 data part)', async () => {
    const fresh = (await query(TOOL_NAMES.LIBRARY_OCCUPANCY, { floor: 'ALL' })).body as any;
    expect(fresh.meta.source).toBe('LIVE');
    clock.advanceSeconds(61);
    library.failAlways();
    const stale = await query(TOOL_NAMES.LIBRARY_OCCUPANCY, { floor: 'ALL' });
    library.recover();
    expect(stale.statusCode).toBe(200);
    expect((stale.body as any).meta).toMatchObject({ source: 'STALE', isStale: true, isSimulated: true, timestamp: fresh.meta.timestamp });
    expect((stale.body as any).data).toEqual(fresh.data);
  });

  it('no retained data + fault: HTTP 503 UPSTREAM_UNAVAILABLE without fake data', async () => {
    library.failAlways();
    const result = await query(TOOL_NAMES.LIBRARY_OCCUPANCY, { floor: 'FLOOR_1' });
    library.recover();
    expect(result.statusCode).toBe(503);
    expect(result.body).toMatchObject({ ok: false, error: { code: 'UPSTREAM_UNAVAILABLE' } });
    expect((result.body as any).data).toBeUndefined();
  });

  it('impossible date: HTTP 400 INVALID_PARAMS and no connector execution (AC-01.5)', async () => {
    log.clear();
    const result = await query(TOOL_NAMES.CAFETERIA_MENU, { date: '2026-99-77' });
    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({ ok: false, error: { code: 'INVALID_PARAMS' } });
    expect(log.events).toHaveLength(0);
  });

  it('unknown route: HTTP 400 INVALID_PARAMS (AC-02.4)', async () => {
    const result = await query(TOOL_NAMES.SHUTTLE_SCHEDULE, { route: 'NOWHERE' });
    expect(result.statusCode).toBe(400);
    expect(result.body).toMatchObject({ ok: false, error: { code: 'INVALID_PARAMS' } });
  });

  it('course schedule: identity comes only from the gateway header; two students get their own data', async () => {
    const a = (await query(TOOL_NAMES.COURSE_SCHEDULE, { day: 'MONDAY' }, studentCtx('demo-student-01'))).body as any;
    const b = (await query(TOOL_NAMES.COURSE_SCHEDULE, { day: 'MONDAY' }, studentCtx('demo-student-02'))).body as any;
    expect(a.ok && b.ok).toBe(true);
    expect(a.meta.source).toBe('LIVE');
    expect(b.meta.source).toBe('LIVE'); // not a CACHE_HIT of student 01's entry
    expect(JSON.stringify(a.data)).not.toBe(JSON.stringify(b.data));
  });

  it('the connector handlers are what answered (not the sample handlers)', () => {
    const names = Object.keys(createConnectorToolHandlers(deps)).sort();
    expect(names).toEqual(Object.values(TOOL_NAMES).sort());
    expect(log.events.length).toBeGreaterThan(0);
  });
});
