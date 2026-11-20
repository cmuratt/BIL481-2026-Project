/**
 * A-07: course-schedule cache isolation between students (FR-06, FR-07, FR-09, NFR-05).
 *
 * Two synthetic personas use the same tool on the same day within the TTL. The test checks that
 * neither can receive the other's cached schedule and that no student ID appears in cache keys,
 * cached values or execution-log lines. The same assertions are repeated against a real Redis in
 * redisIntegration.test.ts when REDIS_TEST_URL is set.
 */

import { describe, expect, it } from 'vitest';
import { TOOL_NAMES, type AuthContext } from '@campus-orchestrator/shared';
import {
  createCampusConnectors,
  createConnectorToolHandlers,
  createJsonLineEventSink,
  InMemoryCacheStore,
  loadConnectorConfig,
  ResilientConnectorExecutor,
  type CacheEntry,
  type CacheStore,
} from '../../packages/connectors/src/index.js';
import { TestClock } from './helpers.js';

const PERSONA_A: AuthContext = { studentId: 'demo-student-01', role: 'STUDENT' };
const PERSONA_B: AuthContext = { studentId: 'demo-student-02', role: 'STUDENT' };

/** Wraps a store and records every key and serialized value written to it. */
class SpyStore implements CacheStore {
  public readonly writes: Array<{ key: string; serialized: string }> = [];
  constructor(private readonly inner: CacheStore) {}
  get<T>(key: string) {
    return this.inner.get<T>(key);
  }
  async set<T>(key: string, entry: CacheEntry<T>, retentionSeconds: number) {
    this.writes.push({ key, serialized: JSON.stringify(entry) });
    await this.inner.set(key, entry, retentionSeconds);
  }
  delete(key: string) {
    return this.inner.delete(key);
  }
}

function wire() {
  const clock = new TestClock('2026-11-23T09:00');
  const config = loadConnectorConfig({});
  const store = new SpyStore(new InMemoryCacheStore(clock.now));
  const logLines: string[] = [];
  const executor = new ResilientConnectorExecutor({
    cache: store,
    clock: clock.now,
    onEvent: createJsonLineEventSink((line) => logLines.push(line)),
  });
  const handlers = createConnectorToolHandlers({
    connectors: createCampusConnectors(config, clock.now),
    executor,
    ttlSeconds: config.ttlSeconds,
    clock: clock.now,
  });
  const schedule = (auth: AuthContext, day = 'MONDAY') => handlers[TOOL_NAMES.COURSE_SCHEDULE]({ day }, auth);
  return { clock, store, logLines, schedule };
}

const block = (r: { content: unknown }) => (r.content as Array<Record<string, any>>)[0]!;

describe('A-07: two-persona course-schedule isolation', () => {
  it('B asking right after A gets a fresh execution of B’s own schedule, never A’s cached one', async () => {
    const { schedule, clock } = wire();
    const a1 = await schedule(PERSONA_A);
    clock.advanceSeconds(10);
    const b1 = await schedule(PERSONA_B);
    clock.advanceSeconds(10);
    const a2 = await schedule(PERSONA_A);
    const b2 = await schedule(PERSONA_B);

    expect(block(a1).source).toBe('LIVE');
    expect(block(b1).source).toBe('LIVE'); // a CACHE_HIT here would be a cross-student leak
    expect(block(a2)).toMatchObject({ source: 'CACHE_HIT', data: block(a1).data });
    expect(block(b2)).toMatchObject({ source: 'CACHE_HIT', data: block(b1).data });
    expect(JSON.stringify(block(a1).data)).not.toBe(JSON.stringify(block(b1).data));
  });

  it('keys are distinct per student and day and contain no student ID', async () => {
    const { schedule, store } = wire();
    await schedule(PERSONA_A, 'MONDAY');
    await schedule(PERSONA_B, 'MONDAY');
    await schedule(PERSONA_A, 'TUESDAY');
    const keys = store.writes.map((w) => w.key);
    expect(new Set(keys).size).toBe(3);
    for (const key of keys) {
      expect(key).toMatch(/^cache:schedule:[0-9a-f]{16}:(MONDAY|TUESDAY)$/);
      expect(key).not.toContain('demo-student');
    }
  });

  it('cached values and execution-log lines contain no student ID', async () => {
    const { schedule, store, logLines } = wire();
    await schedule(PERSONA_A);
    await schedule(PERSONA_B);
    await schedule(PERSONA_A);
    expect(logLines).toHaveLength(3);
    for (const text of [...store.writes.map((w) => w.serialized), ...logLines]) {
      expect(text).not.toContain('demo-student-01');
      expect(text).not.toContain('demo-student-02');
    }
  });

  it('a guest or an empty student ID is rejected before any cache access or connector call', async () => {
    const { schedule, store, logLines } = wire();
    for (const auth of [{ role: 'GUEST' } as AuthContext, { studentId: '  ', role: 'STUDENT' } as AuthContext]) {
      const response = await schedule(auth);
      expect(response).toMatchObject({ isError: true, code: 'AUTHENTICATION_REQUIRED' });
    }
    expect(store.writes).toHaveLength(0);
    expect(logLines).toHaveLength(0);
  });
});
