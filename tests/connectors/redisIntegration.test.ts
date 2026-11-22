/**
 * A-02 (Redis runtime wiring) and A-03 (TTL / 3 × TTL retention observed in Redis).
 *
 * Two groups:
 * 1. Always run (no Redis needed): backend selection rules, fail-fast on an unreachable Redis,
 *    password redaction.
 * 2. Real Redis, opt-in: set REDIS_TEST_URL to a THROWAWAY Redis or database, e.g.
 *      REDIS_TEST_URL=redis://localhost:6379/15 npx vitest run tests/connectors/redisIntegration.test.ts
 *    The group deletes every `cache:*` key in that database before and after it runs.
 *    Without REDIS_TEST_URL the group is reported as SKIPPED — it is never counted as passed.
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from 'redis';
import { TOOL_NAMES, type AuthContext } from '@campus-orchestrator/shared';
import {
  ConnectorCacheUnavailableError,
  ConnectorConfigError,
  createCacheStoreFromEnv,
  createCampusConnectors,
  createConnectorRuntime,
  createConnectorRuntimeFromEnv,
  createConnectorToolHandlers,
  FaultInjectingConnector,
  libraryCacheKey,
  loadConnectorConfig,
  RecordingEventSink,
  redactRedisUrl,
  ResilientConnectorExecutor,
  type CacheStoreHandle,
} from '../../packages/connectors/src/index.js';
import { TestClock } from './helpers.js';

const REDIS_TEST_URL = process.env.REDIS_TEST_URL?.trim() ?? '';
const guest: AuthContext = { role: 'GUEST' };
const quiet = { warn: () => {} };

describe('A-02: cache backend selection (no Redis required)', () => {
  it('REDIS_URL unset outside production → in-memory with a warning', async () => {
    const warnings: string[] = [];
    const handle = await createCacheStoreFromEnv({ NODE_ENV: 'development' }, undefined, { warn: (l) => warnings.push(l) });
    expect(handle.backend).toBe('memory');
    expect(warnings).toHaveLength(1);
    expect(JSON.parse(warnings[0]!)).toMatchObject({ event: 'connector.cache', level: 'warn', backend: 'memory' });
  });

  it('REDIS_URL unset with NODE_ENV=production → refuses to start', async () => {
    await expect(createCacheStoreFromEnv({ NODE_ENV: 'production' }, undefined, quiet)).rejects.toBeInstanceOf(ConnectorConfigError);
  });

  it('invalid REDIS_URL → configuration error', async () => {
    await expect(createCacheStoreFromEnv({ REDIS_URL: 'http://redis:6379' }, undefined, quiet)).rejects.toBeInstanceOf(
      ConnectorConfigError
    );
    await expect(createCacheStoreFromEnv({ REDIS_URL: 'not a url' }, undefined, quiet)).rejects.toBeInstanceOf(ConnectorConfigError);
  });

  it('unreachable Redis → fails fast with ConnectorCacheUnavailableError (no silent in-memory fallback)', async () => {
    const started = Date.now();
    await expect(
      createCacheStoreFromEnv({ REDIS_URL: 'redis://127.0.0.1:1' }, undefined, { ...quiet, connectTimeoutMs: 1000 })
    ).rejects.toBeInstanceOf(ConnectorCacheUnavailableError);
    expect(Date.now() - started).toBeLessThan(3000);
  });

  it('the runtime factory propagates the failure instead of starting without the shared cache', async () => {
    await expect(createConnectorRuntimeFromEnv({ env: { REDIS_URL: 'redis://127.0.0.1:1' } })).rejects.toBeInstanceOf(
      ConnectorCacheUnavailableError
    );
  });

  it('sync createConnectorRuntime() (used by createCampusMcpServer): production without REDIS_URL refuses to start', () => {
    expect(() => createConnectorRuntime({ env: { NODE_ENV: 'production' } })).toThrow(ConnectorConfigError);
  });

  it('sync createConnectorRuntime(): explicit env without REDIS_URL → in-memory, no warning', async () => {
    const warnings: string[] = [];
    const runtime = createConnectorRuntime({ env: {}, onEvent: () => {}, onCacheWarning: (l) => warnings.push(l) });
    expect(runtime.cacheBackend).toBe('memory');
    expect(warnings).toHaveLength(0);
    await runtime.close();
  });

  it('sync createConnectorRuntime() with an unreachable REDIS_URL still answers (cache miss) and warns', async () => {
    const warnings: string[] = [];
    const runtime = createConnectorRuntime({
      env: { REDIS_URL: 'redis://127.0.0.1:1' },
      onEvent: () => {},
      onCacheWarning: (l) => warnings.push(l),
    });
    expect(runtime.cacheBackend).toBe('redis');
    const handlers = createConnectorToolHandlers(runtime);
    const started = Date.now();
    const response = await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(Date.now() - started).toBeLessThan(800);
    expect((response.content as Array<{ source: string }>)[0]!.source).toBe('LIVE');
    await new Promise((r) => setTimeout(r, 100));
    expect(warnings.some((w) => JSON.parse(w).level === 'warn')).toBe(true);
    await runtime.close();
  });

  it('passwords never appear in log output', () => {
    expect(redactRedisUrl('redis://default:s3cret@redis:6379/0')).toBe('redis://default:***@redis:6379/0');
    expect(redactRedisUrl('redis://redis:6379')).toBe('redis://redis:6379');
  });
});

describe.skipIf(REDIS_TEST_URL === '')('A-02 / A-03 against a real Redis (REDIS_TEST_URL)', () => {
  const admin = createClient({ url: REDIS_TEST_URL });
  const handles: CacheStoreHandle[] = [];

  async function cleanCacheKeys(): Promise<void> {
    for await (const batch of admin.scanIterator({ MATCH: 'cache:*', COUNT: 100 })) {
      const keys = Array.isArray(batch) ? batch : [batch];
      if (keys.length > 0) {
        await admin.del(keys);
      }
    }
  }

  async function listCacheKeys(): Promise<string[]> {
    const found: string[] = [];
    for await (const batch of admin.scanIterator({ MATCH: 'cache:*', COUNT: 100 })) {
      found.push(...(Array.isArray(batch) ? batch : [batch]));
    }
    return found.sort();
  }

  async function connect(): Promise<CacheStoreHandle> {
    const handle = await createCacheStoreFromEnv({ REDIS_URL: REDIS_TEST_URL }, undefined, quiet);
    handles.push(handle);
    return handle;
  }

  function wire(handle: CacheStoreHandle, clock: TestClock) {
    const config = loadConnectorConfig({});
    const base = createCampusConnectors(config, clock.now);
    const library = new FaultInjectingConnector(base.library);
    const log = new RecordingEventSink();
    const executor = new ResilientConnectorExecutor({ cache: handle.store, clock: clock.now, onEvent: log.sink });
    const handlers = createConnectorToolHandlers({ connectors: { ...base, library }, executor, ttlSeconds: config.ttlSeconds, clock: clock.now });
    return { handlers, library, log };
  }

  const block = (r: { content: unknown }) => (r.content as Array<Record<string, any>>)[0]!;

  beforeAll(async () => {
    await admin.connect();
    await cleanCacheKeys();
  });

  afterAll(async () => {
    await cleanCacheKeys();
    for (const h of handles) {
      await h.close();
    }
    await admin.close();
  });

  it('connects through REDIS_URL and reports the redis backend', async () => {
    const handle = await connect();
    expect(handle.backend).toBe('redis');
  });

  it('sync createConnectorRuntime() with REDIS_URL uses the shared Redis once connected', async () => {
    await cleanCacheKeys();
    const clock = new TestClock('2026-11-23T09:00');
    const make = () =>
      createConnectorRuntime({ env: { REDIS_URL: REDIS_TEST_URL }, clock: clock.now, onEvent: () => {}, onCacheWarning: () => {} });
    const first = make();
    const second = make();
    expect(first.cacheBackend).toBe('redis');
    // wait until both background connections are ready
    for (let i = 0; i < 40; i += 1) {
      try {
        await first.cache.set('cache:test:ready', { value: 1, cachedAt: 'x', freshUntil: 'x' }, 5);
        await second.cache.get('cache:test:ready');
        break;
      } catch {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    const a = await createConnectorToolHandlers(first)[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    const b = await createConnectorToolHandlers(second)[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(block(a).source).toBe('LIVE');
    expect(block(b).source).toBe('CACHE_HIT');
    expect(await admin.exists(libraryCacheKey('ALL'))).toBe(1);
    await first.close();
    await second.close();
  });

  it('A-03: a LIVE result is stored under the documented key with physical retention 3 × TTL', async () => {
    const clock = new TestClock('2026-11-23T09:00');
    const { handlers } = wire(await connect(), clock);
    await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    await handlers[TOOL_NAMES.SHUTTLE_SCHEDULE]({ route: 'MAIN_RING' }, guest);
    await handlers[TOOL_NAMES.CAFETERIA_MENU]({ date: '2026-11-23' }, guest);

    const expectations: Array<[string, number]> = [
      [libraryCacheKey('ALL'), 3 * 60],
      ['cache:shuttle:MAIN_RING', 3 * 120],
      ['cache:dining:2026-11-23', 3 * 3600],
    ];
    for (const [key, retentionSeconds] of expectations) {
      const pttl = await admin.pTTL(key);
      expect(pttl, key).toBeGreaterThan(retentionSeconds * 1000 - 5000);
      expect(pttl, key).toBeLessThanOrEqual(retentionSeconds * 1000);
      const entry = JSON.parse((await admin.get(key))!);
      // freshness boundary = cachedAt + TTL (TTL = retention / 3)
      expect(Date.parse(entry.freshUntil) - Date.parse(entry.cachedAt)).toBe((retentionSeconds / 3) * 1000);
      expect(entry.isSimulated).toBe(true);
    }
  });

  it('NFR-04: a second runtime (another MCP instance) gets a CACHE_HIT from the shared Redis', async () => {
    const clock = new TestClock('2026-11-23T09:00');
    await cleanCacheKeys();
    const first = wire(await connect(), clock);
    const second = wire(await connect(), clock);
    await first.handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    clock.advanceSeconds(20);
    const hit = await second.handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(block(hit).source).toBe('CACHE_HIT');
    expect(second.log.upstreamCalls()).toBe(0);
  });

  it('A-03 / TC-06: after the TTL a failing connector is answered STALE from Redis with the original timestamp', async () => {
    const clock = new TestClock('2026-11-23T09:00');
    await cleanCacheKeys();
    const { handlers, library } = wire(await connect(), clock);
    const fresh = await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    clock.advanceSeconds(61);
    library.failAlways();
    const stale = await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(block(stale)).toMatchObject({ source: 'STALE', isStale: true, timestamp: block(fresh).timestamp });
  });

  it('A-03: Redis really evicts the entry after the retention period (real time, TTL 1 s → 3 s)', async () => {
    const handle = await connect();
    await handle.store.set('cache:test:retention', { value: 1, cachedAt: 'x', freshUntil: 'x' }, 3);
    expect(await admin.exists('cache:test:retention')).toBe(1);
    await new Promise((r) => setTimeout(r, 3200));
    expect(await admin.exists('cache:test:retention')).toBe(0);
  }, 10_000);

  it('A-07: two personas produce two hashed keys in Redis and no student ID', async () => {
    const clock = new TestClock('2026-11-23T09:00');
    await cleanCacheKeys();
    const { handlers } = wire(await connect(), clock);
    await handlers[TOOL_NAMES.COURSE_SCHEDULE]({ day: 'MONDAY' }, { studentId: 'demo-student-01', role: 'STUDENT' });
    await handlers[TOOL_NAMES.COURSE_SCHEDULE]({ day: 'MONDAY' }, { studentId: 'demo-student-02', role: 'STUDENT' });
    const keys = await listCacheKeys();
    expect(keys).toHaveLength(2);
    for (const key of keys) {
      expect(key).toMatch(/^cache:schedule:[0-9a-f]{16}:MONDAY$/);
      const value = (await admin.get(key))!;
      expect(value).not.toContain('demo-student');
    }
  });

  it('a stalled Redis degrades to a cache miss within the operation timeout; the tool still answers LIVE', async () => {
    const clock = new TestClock('2026-11-23T09:00');
    await cleanCacheKeys();
    const { handlers } = wire(await connect(), clock);
    await admin.sendCommand(['CLIENT', 'PAUSE', '1500', 'ALL']);
    const started = Date.now();
    const response = await handlers[TOOL_NAMES.SHUTTLE_SCHEDULE]({ route: 'METRO_LINE' }, guest);
    const elapsed = Date.now() - started;
    await admin.sendCommand(['CLIENT', 'UNPAUSE']);
    expect(block(response).source).toBe('LIVE');
    expect(elapsed).toBeLessThan(800);
  }, 10_000);
});
