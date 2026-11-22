/**
 * A-01 (deterministic mock output) and CONNECTOR_FIXED_NOW (API Contract v1.1 §7, §8 Q3).
 *
 * Domain invariants checked here are the data-level parts of the acceptance criteria
 * AC-01.2, AC-01.4, AC-02.2, AC-02.3, AC-02.5, AC-03.2, AC-03.3, AC-03.4 and AC-03.5.
 * They run on the connector tier only (no gateway, no browser); the UI parts of those criteria
 * are decided by the acceptance tests themselves.
 */

import { describe, expect, it } from 'vitest';
import { TOOL_NAMES, type AuthContext } from '@campus-orchestrator/shared';
import {
  ConnectorConfigError,
  createAnchoredClock,
  createConnectorRuntime,
  createConnectorToolHandlers,
  loadConnectorConfig,
  parseFixedNow,
  readFixedNow,
  resolveConnectorClock,
  silentEventSink,
  systemClock,
  timeToSeconds,
  toTurkeyLocalTime,
} from '../../packages/connectors/src/index.js';

const ACCEPTANCE_NOW = '2026-11-23T09:00:00+03:00'; // Monday, value suggested in Contract §7
const student: AuthContext = { studentId: 'demo-student-01', role: 'STUDENT' };
const guest: AuthContext = { role: 'GUEST' };

function handlersFor(env: Record<string, string>) {
  const runtime = createConnectorRuntime({ env, onEvent: silentEventSink });
  return { runtime, handlers: createConnectorToolHandlers(runtime) };
}

function data(response: { content: unknown }): any {
  return (response.content as Array<{ data: unknown }>)[0]!.data;
}

describe('CONNECTOR_FIXED_NOW parsing', () => {
  it('accepts ISO-8601 with an explicit offset (with or without seconds/milliseconds, or Z)', () => {
    expect(parseFixedNow(ACCEPTANCE_NOW).toISOString()).toBe('2026-11-23T06:00:00.000Z');
    expect(parseFixedNow('2026-11-23T22:30+03:00').toISOString()).toBe('2026-11-23T19:30:00.000Z');
    expect(parseFixedNow('2026-11-23T06:00:00.250Z').toISOString()).toBe('2026-11-23T06:00:00.250Z');
  });

  it('rejects values without an offset, impossible dates and free text', () => {
    for (const bad of [
      '2026-11-23T09:00:00', // no offset → would depend on the container time zone
      '2026-02-30T09:00:00+03:00', // would silently roll over to 2 March
      '2026-11-23T24:00:00+03:00',
      '2026-11-23',
      'monday 9am',
      '2026-11-23T09:00:00+15:00',
    ]) {
      expect(() => parseFixedNow(bad), bad).toThrow(ConnectorConfigError);
    }
  });

  it('is optional: unset or empty means real time', () => {
    expect(readFixedNow({})).toBeNull();
    expect(readFixedNow({ CONNECTOR_FIXED_NOW: '   ' })).toBeNull();
    expect(loadConnectorConfig({}).fixedNow).toBeNull();
    expect(resolveConnectorClock(null)).toBe(systemClock);
  });

  it('fails fast through loadConnectorConfig when the value is invalid', () => {
    expect(() => loadConnectorConfig({ CONNECTOR_FIXED_NOW: '2026-11-23T09:00' })).toThrow(/CONNECTOR_FIXED_NOW/);
  });
});

describe('Anchored clock (starts at CONNECTOR_FIXED_NOW, then advances in real time)', () => {
  it('returns the anchor first and then moves with the monotonic source', () => {
    let monotonic = 1000;
    const clock = createAnchoredClock(parseFixedNow(ACCEPTANCE_NOW), () => monotonic);
    expect(clock().toISOString()).toBe('2026-11-23T06:00:00.000Z');
    monotonic += 61_000;
    expect(clock().toISOString()).toBe('2026-11-23T06:01:01.000Z');
    expect(toTurkeyLocalTime(clock()).weekday).toBe('MONDAY');
  });

  it('is used by the runtime when no clock is injected', () => {
    const runtime = createConnectorRuntime({ env: { CONNECTOR_FIXED_NOW: ACCEPTANCE_NOW }, onEvent: silentEventSink });
    const now = runtime.clock();
    expect(now.getTime()).toBeGreaterThanOrEqual(Date.parse(ACCEPTANCE_NOW));
    expect(now.getTime()).toBeLessThan(Date.parse(ACCEPTANCE_NOW) + 5_000);
    expect(runtime.config.fixedNow).toBe('2026-11-23T06:00:00.000Z');
  });

  it('an injected clock (unit tests) wins over the environment variable', () => {
    const injected = () => new Date('2030-01-01T00:00:00Z');
    const runtime = createConnectorRuntime({ env: { CONNECTOR_FIXED_NOW: ACCEPTANCE_NOW }, clock: injected, onEvent: silentEventSink });
    expect(runtime.clock().toISOString()).toBe('2030-01-01T00:00:00.000Z');
  });
});

describe('Tool defaults follow the fixed clock (reproducible acceptance runs)', () => {
  it('cafeteria without a date uses the Türkiye date of the fixed clock', async () => {
    const { handlers } = handlersFor({ CONNECTOR_FIXED_NOW: ACCEPTANCE_NOW });
    const menu = data(await handlers[TOOL_NAMES.CAFETERIA_MENU]({}, guest));
    expect(menu.date).toBe('2026-11-23');
  });

  it('shuttle departures are strictly after the fixed clock (AC-02.2)', async () => {
    const { handlers } = handlersFor({ CONNECTOR_FIXED_NOW: ACCEPTANCE_NOW });
    for (const route of ['MAIN_RING', 'METRO_LINE', 'DORMITORY_LINE']) {
      const shuttle = data(await handlers[TOOL_NAMES.SHUTTLE_SCHEDULE]({ route }, guest));
      expect(shuttle.routeId).toBe(route); // AC-02.3
      expect(shuttle.nextDepartures.length).toBeGreaterThan(0);
      const seconds = shuttle.nextDepartures.map(timeToSeconds);
      expect(seconds.every((s: number) => s > 9 * 3600)).toBe(true);
      expect([...seconds].sort((a, b) => a - b)).toEqual(seconds);
    }
  });

  it('end of service: DORMITORY_LINE at 22:30 has no departures and is not an error (AC-02.5)', async () => {
    const { handlers } = handlersFor({ CONNECTOR_FIXED_NOW: '2026-11-23T22:30:00+03:00' });
    const response = await handlers[TOOL_NAMES.SHUTTLE_SCHEDULE]({ route: 'DORMITORY_LINE' }, guest);
    expect(response.isError).toBe(false);
    expect(data(response).nextDepartures).toEqual([]);
  });
});

describe('A-01: deterministic synthetic output for a fixed seed and clock', () => {
  const env = { CONNECTOR_FIXED_NOW: ACCEPTANCE_NOW, CONNECTOR_MOCK_SEED: '481-FALL-2026' };

  async function snapshot(environment: Record<string, string>) {
    const { handlers } = handlersFor(environment);
    return {
      cafeteria: data(await handlers[TOOL_NAMES.CAFETERIA_MENU]({ date: '2026-11-23' }, guest)),
      weekend: data(await handlers[TOOL_NAMES.CAFETERIA_MENU]({ date: '2026-11-22' }, guest)),
      shuttle: data(await handlers[TOOL_NAMES.SHUTTLE_SCHEDULE]({ route: 'MAIN_RING' }, guest)),
      library: data(await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest)),
      schedule: data(await handlers[TOOL_NAMES.COURSE_SCHEDULE]({ day: 'MONDAY' }, student)),
    };
  }

  it('two independent runtimes produce identical domain JSON for all four tools', async () => {
    const first = await snapshot(env);
    const second = await snapshot(env);
    // lastUpdated / timestamp fields follow the (advancing) clock; everything else must be identical.
    const strip = (s: any) => ({
      ...s,
      shuttle: { ...s.shuttle, lastUpdated: undefined },
      library: { ...s.library, timestamp: undefined },
    });
    expect(JSON.stringify(strip(first))).toBe(JSON.stringify(strip(second)));
  });

  it('a different seed gives different data (the seed really drives the generator)', async () => {
    const a = await snapshot(env);
    const b = await snapshot({ ...env, CONNECTOR_MOCK_SEED: 'another-seed' });
    expect(JSON.stringify(a.cafeteria)).not.toBe(JSON.stringify(b.cafeteria));
  });

  it('weekday menu is complete (AC-01.2); weekend is explained, not an error (AC-01.4)', async () => {
    const s = await snapshot(env);
    expect(s.cafeteria.available).toBe(true);
    for (const meal of [s.cafeteria.lunch, s.cafeteria.dinner]) {
      expect(meal).not.toBeNull();
      expect(meal.calories).toBeGreaterThan(0);
      for (const field of ['soup', 'mainDish', 'sideDish']) {
        expect(typeof meal[field]).toBe('string');
        expect(meal[field].length).toBeGreaterThan(0);
      }
    }
    expect(s.cafeteria.lunch.vegOption.length).toBeGreaterThan(0);
    expect(s.weekend.available).toBe(false);
    expect(s.weekend.unavailableReason.length).toBeGreaterThan(0);
    expect(s.weekend.lunch).toBeNull();
    expect(s.weekend.dinner).toBeNull();
  });

  it('library: bounds, totals and the isSimulated flag (AC-03.2, AC-03.3, AC-03.5)', async () => {
    const { library } = await snapshot(env);
    expect(library.isSimulated).toBe(true);
    expect(library.floors.length).toBe(3);
    for (const floor of library.floors) {
      expect(floor.occupiedSeats).toBeGreaterThanOrEqual(0);
      expect(floor.occupiedSeats).toBeLessThanOrEqual(floor.maxSeats);
    }
    expect(library.totalOccupied).toBe(library.floors.reduce((n: number, f: any) => n + f.occupiedSeats, 0));
    expect(library.totalCapacity).toBe(library.floors.reduce((n: number, f: any) => n + f.maxSeats, 0));
  });

  it('library: a single floor equals its entry in the ALL response of the same window (AC-03.4)', async () => {
    const { handlers } = handlersFor(env);
    const all = data(await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: 'ALL' }, guest));
    for (const entry of all.floors) {
      const single = data(await handlers[TOOL_NAMES.LIBRARY_OCCUPANCY]({ floor: entry.floorId }, guest));
      expect(single.floors).toEqual([entry]);
      expect(single.totalOccupied).toBe(entry.occupiedSeats);
      expect(single.totalCapacity).toBe(entry.maxSeats);
    }
  });
});
