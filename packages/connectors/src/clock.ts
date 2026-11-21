/**
 * Connector clock selection (API Contract v1.1 §7 and §8 Q3).
 *
 * `CONNECTOR_FIXED_NOW` pins the *starting* instant of the connector clock so acceptance runs
 * (AT-01 … AT-04) see the same Türkiye date and time of day whenever they are executed.
 *
 *   unset / empty                       → real system time (production and normal development)
 *   e.g. 2026-11-23T09:00:00+03:00      → the clock starts at that instant when the runtime is
 *                                          created and then advances in real time
 *
 * Why the clock advances instead of being frozen: TTL freshness (60 / 120 / 300 / 3600 s), the
 * 3 × TTL retention window, the 60 s circuit-breaker cooldown and `durationMs` all measure elapsed
 * time. A frozen clock would make cached data fresh forever, so the stale-fallback criterion
 * (AC-03.7) and the half-open recovery could never be observed. With an advancing clock a run that
 * starts at 09:00 is at 09:02 two minutes later, exactly as it would be on a real Monday morning.
 *
 * Unit tests keep injecting their own fake clock (`createConnectorRuntime({ clock })`); an injected
 * clock always wins over the environment variable.
 */

import { ConnectorConfigError, type EnvSource } from './configError.js';
import { systemClock, type Clock } from './types.js';

export const FIXED_NOW_ENV = 'CONNECTOR_FIXED_NOW';

/** ISO-8601 date-time with an explicit offset; seconds and milliseconds are optional. */
const ISO_WITH_OFFSET =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|([+-])(\d{2}):(\d{2}))$/;

/**
 * Validates and parses a `CONNECTOR_FIXED_NOW` value.
 * An explicit offset is required: without one the meaning would depend on the container time zone
 * (UTC in Docker, +03:00 on a developer laptop), which is exactly the ambiguity the variable removes.
 * Impossible calendar values (2026-02-30, 24:00) are rejected instead of silently rolling over.
 */
export function parseFixedNow(raw: string): Date {
  const match = ISO_WITH_OFFSET.exec(raw.trim());
  if (match === null) {
    throw new ConnectorConfigError(
      `${FIXED_NOW_ENV} must be an ISO-8601 date-time with an offset, e.g. 2026-11-23T09:00:00+03:00 (received '${raw}')`
    );
  }
  const [, y, mo, d, h, mi, s = '0', , zone, sign, oh = '0', om = '0'] = match;
  const offsetMinutes = zone === 'Z' ? 0 : (sign === '-' ? -1 : 1) * (Number(oh) * 60 + Number(om));
  const instant = new Date(raw.trim());
  // Re-derive the wall-clock fields in the given offset and compare: catches 2026-02-30, 24:00, 23:60, …
  const wall = new Date(instant.getTime() + offsetMinutes * 60_000);
  const valid =
    !Number.isNaN(instant.getTime()) &&
    Math.abs(offsetMinutes) <= 14 * 60 &&
    wall.getUTCFullYear() === Number(y) &&
    wall.getUTCMonth() + 1 === Number(mo) &&
    wall.getUTCDate() === Number(d) &&
    wall.getUTCHours() === Number(h) &&
    wall.getUTCMinutes() === Number(mi) &&
    wall.getUTCSeconds() === Number(s);
  if (!valid) {
    throw new ConnectorConfigError(`${FIXED_NOW_ENV} is not a valid calendar date-time (received '${raw}')`);
  }
  return instant;
}

/** Reads `CONNECTOR_FIXED_NOW`; returns the normalised ISO instant, or null when the variable is unset/empty. */
export function readFixedNow(env: EnvSource): string | null {
  const raw = env[FIXED_NOW_ENV];
  if (raw === undefined || raw.trim() === '') {
    return null;
  }
  return parseFixedNow(raw).toISOString();
}

/** Monotonic milliseconds source; injectable for tests. */
export type MonotonicMs = () => number;

const defaultMonotonic: MonotonicMs = () => performance.now();

/**
 * A clock that returns `anchor` at creation time and then advances with real elapsed time.
 * Uses a monotonic source, so changes to the host's wall clock cannot move it backwards.
 */
export function createAnchoredClock(anchor: Date, monotonic: MonotonicMs = defaultMonotonic): Clock {
  const anchorMs = anchor.getTime();
  const startedAt = monotonic();
  return () => new Date(anchorMs + (monotonic() - startedAt));
}

/** Clock used by the runtime: an anchored clock when `fixedNowIso` is set, otherwise the system clock. */
export function resolveConnectorClock(fixedNowIso: string | null, monotonic?: MonotonicMs): Clock {
  return fixedNowIso === null ? systemClock : createAnchoredClock(new Date(fixedNowIso), monotonic);
}
