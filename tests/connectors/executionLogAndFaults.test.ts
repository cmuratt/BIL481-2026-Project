/**
 * A-04 (stale-if-error + fault-injection log), A-05 (circuit breaker + duration measurement),
 * A-06 (metadata provenance) on the handler level, i.e. exactly what the MCP dispatcher receives.
 *
 * Scenario coverage: TC-06 / AC-03.7 (stale fallback with the original timestamp), AC-01.7 / AC-02.7 /
 * AC-03.6 (one connector execution for two requests, read from the execution log).
 */

import { describe, expect, it } from 'vitest';
import { TOOL_NAMES, type AuthContext } from '@campus-orchestrator/shared';
import {
  createCampusConnectors,
  createConnectorToolHandlers,
  createJsonLineEventSink,
  FaultInjectingConnector,
  InMemoryCacheStore,
  libraryCacheKey,
  loadConnectorConfig,
  MockLibraryConnector,
  RecordingEventSink,
  ResilientConnectorExecutor,
  UnavailableLiveConnector,
  type LibraryConnector,
} from '../../packages/connectors/src/index.js';
import { MONDAY, SEED, TestClock } from './helpers.js';

const guest: AuthContext = { role: 'GUEST' };

function wire() {
  const clock = new TestClock(`${MONDAY}T10:00`);
  const config = loadConnectorConfig({});
  const connectors = createCampusConnectors(config, clock.now);
  const library = new FaultInjectingConnector(connectors.library);
  const log = new RecordingEventSink();
  const cache = new InMemoryCacheStore(clock.now);
  const executor = new ResilientConnectorExecutor({ cache, clock: clock.now, onEvent: log.sink });
  const handlers = createConnectorToolHandlers({
    connectors: { ...connectors, library },
    executor,
    ttlSeconds: config.ttlSeconds,
    clock: clock.now,
  });
  const callLibrary = () => handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
  return { clock, library, log, cache, executor, handlers, callLibrary };
}

const block = (response: { content: unknown }) => (response.content as Array<Record<string, unknown>>)[0]!;

describe('Execution log: one event per call, upstreamCalled tells whether the connector ran', () => {
  it('LIVE then CACHE_HIT: two requests, one connector execution (AC-03.6)', async () => {
    const { callLibrary, log, clock } = wire();
    await callLibrary();
    clock.advanceSeconds(30);
    await callLibrary();
    expect(log.events.map((e) => [e.outcome, e.upstreamCalled])).toEqual([
      ['LIVE', true],
      ['CACHE_HIT', false],
    ]);
    expect(log.upstreamCalls('library')).toBe(1);
    expect(log.events[0]).toMatchObject({
      event: 'connector.execute',
      connector: 'library',
      cacheKey: libraryCacheKey('ALL'),
      circuitState: 'CLOSED',
    });
    expect(log.events[0]!.failureCode).toBeUndefined();
  });

  it('the JSON line sink writes one parseable line per event (stderr by default)', async () => {
    const lines: string[] = [];
    const clock = new TestClock(`${MONDAY}T10:00`);
    const executor = new ResilientConnectorExecutor({
      cache: new InMemoryCacheStore(clock.now),
      clock: clock.now,
      onEvent: createJsonLineEventSink((line) => lines.push(line)),
    });
    await executor.execute({
      connectorName: 'library',
      connector: new MockLibraryConnector(SEED, clock.now),
      input: { floor: 'ALL' as const },
      cacheKey: libraryCacheKey('ALL'),
      ttlSeconds: 60,
    });
    expect(lines).toHaveLength(1);
    expect(JSON.parse(lines[0]!)).toMatchObject({ event: 'connector.execute', outcome: 'LIVE', upstreamCalled: true });
  });

  it('a throwing sink never breaks the tool call', async () => {
    const clock = new TestClock(`${MONDAY}T10:00`);
    const executor = new ResilientConnectorExecutor({
      cache: new InMemoryCacheStore(clock.now),
      clock: clock.now,
      onEvent: () => {
        throw new Error('sink down');
      },
    });
    const result = await executor.execute({
      connectorName: 'library',
      connector: new MockLibraryConnector(SEED, clock.now),
      input: { floor: 'ALL' as const },
      cacheKey: libraryCacheKey('ALL'),
      ttlSeconds: 60,
    });
    expect(result.source).toBe('LIVE');
  });
});

describe('A-04: stale-if-error with fault injection (TC-06, AC-03.7)', () => {
  it('after the TTL a failing connector yields STALE with the ORIGINAL timestamp and a logged failure', async () => {
    const { callLibrary, library, log, clock } = wire();
    const fresh = await callLibrary();
    const originalTimestamp = block(fresh).timestamp;

    clock.advanceSeconds(61); // library TTL 60 s expired, still inside 3 × TTL retention
    library.failAlways();
    const stale = await callLibrary();

    expect(stale.isError).toBe(false);
    expect(block(stale)).toMatchObject({ source: 'STALE', isStale: true, isSimulated: true, timestamp: originalTimestamp });
    expect(block(stale).data).toEqual(block(fresh).data);
    expect(log.events.at(-1)).toMatchObject({ outcome: 'STALE', upstreamCalled: true, failureCode: 'UPSTREAM_UNAVAILABLE' });
  });

  it('beyond 3 × TTL nothing is retained: structured ERROR, no fake data', async () => {
    const { callLibrary, library, log, clock } = wire();
    await callLibrary();
    clock.advanceSeconds(181);
    library.failAlways();
    const response = await callLibrary();
    expect(response.isError).toBe(true);
    expect(response.code).toBe('UPSTREAM_UNAVAILABLE');
    expect(response.content).toEqual([{ type: 'text', text: expect.any(String) }]);
    expect(log.events.at(-1)).toMatchObject({ outcome: 'ERROR', failureCode: 'UPSTREAM_UNAVAILABLE' });
  });
});

describe('A-05: circuit breaker visible in the log', () => {
  it('3 failures open the circuit; further calls are short-circuited without reaching the connector', async () => {
    const { callLibrary, library, log, clock } = wire();
    library.failAlways();
    for (let i = 0; i < 3; i += 1) {
      await callLibrary();
    }
    expect(log.events.map((e) => e.circuitState)).toEqual(['CLOSED', 'CLOSED', 'OPEN']);
    for (let i = 0; i < 5; i += 1) {
      clock.advanceSeconds(10);
      await callLibrary();
    }
    expect(library.upstreamCalls).toBe(3);
    expect(log.events.slice(3).every((e) => !e.upstreamCalled && e.failureCode === 'CIRCUIT_OPEN')).toBe(true);

    clock.advanceSeconds(10); // 60 s after opening → one half-open probe
    library.recover();
    await callLibrary();
    expect(log.events.at(-1)).toMatchObject({ outcome: 'LIVE', upstreamCalled: true, circuitState: 'CLOSED' });
  });
});

describe('A-05: measured durations (real timers)', () => {
  it('a hanging upstream is cut at ~800 ms; an open circuit answers without waiting', async () => {
    const log = new RecordingEventSink();
    const executor = new ResilientConnectorExecutor({ cache: new InMemoryCacheStore(), onEvent: log.sink });
    const library = new FaultInjectingConnector(new MockLibraryConnector(SEED));
    library.failAlways('hang');
    const call = () =>
      executor.execute({
        connectorName: 'library',
        connector: library,
        input: { floor: 'ALL' as const },
        cacheKey: libraryCacheKey('ALL'),
        ttlSeconds: 60,
      });
    const durations: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      durations.push((await call()).durationMs);
    }
    // Calls 1–3 hit the 800 ms timeout; call 4 is short-circuited by the open breaker.
    for (const d of durations.slice(0, 3)) {
      expect(d).toBeGreaterThanOrEqual(790);
      expect(d).toBeLessThan(1200);
    }
    expect(durations[3]).toBeLessThan(50);
    expect(log.events.map((e) => e.failureCode)).toEqual(['UPSTREAM_TIMEOUT', 'UPSTREAM_TIMEOUT', 'UPSTREAM_TIMEOUT', 'CIRCUIT_OPEN']);
  }, 10_000);
});

describe('A-06: provenance of cached data survives a mock → live switch', () => {
  it('data cached from the mock stays isSimulated=true when served as STALE by an unavailable live connector', async () => {
    const clock = new TestClock(`${MONDAY}T10:00`);
    const cache = new InMemoryCacheStore(clock.now); // shared across both "processes", like Redis
    const config = loadConnectorConfig({});
    const mockSet = createCampusConnectors(config, clock.now);
    const first = createConnectorToolHandlers({
      connectors: mockSet,
      executor: new ResilientConnectorExecutor({ cache, clock: clock.now }),
      ttlSeconds: config.ttlSeconds,
      clock: clock.now,
    });
    const fresh = await first[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(block(fresh).isSimulated).toBe(true);

    // "Restart" with LIBRARY_CONNECTOR_MODE=live: the live connector is not available.
    clock.advanceSeconds(90);
    const live: LibraryConnector = new UnavailableLiveConnector('library', clock.now);
    const second = createConnectorToolHandlers({
      connectors: { ...mockSet, library: live },
      executor: new ResilientConnectorExecutor({ cache, clock: clock.now }),
      ttlSeconds: config.ttlSeconds,
      clock: clock.now,
    });
    const stale = await second[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest);
    expect(block(stale)).toMatchObject({ source: 'STALE', isStale: true, isSimulated: true, timestamp: block(fresh).timestamp });
  });

  it('every successful content block carries the five contract metadata fields', async () => {
    const { callLibrary } = wire();
    const response = await callLibrary();
    const b = block(response);
    expect(Object.keys(b).sort()).toEqual(['data', 'durationMs', 'isSimulated', 'isStale', 'source', 'timestamp', 'type']);
    expect(b.type).toBe('json');
    expect(typeof b.durationMs).toBe('number');
    expect(b.source).not.toBe('MOCK');
  });
});
