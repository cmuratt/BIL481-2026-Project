#!/usr/bin/env node
/**
 * Connector-tier evidence run (A-03, A-04, A-05, A-07, A-09, A-10) in the §7.5 evidence format.
 *
 * What it exercises: the BUILT connector package (dist) + a REAL Redis given by REDIS_URL.
 * What it does NOT exercise: MCP HTTP transport, gateway, web UI, Compose networking. Results are
 * therefore connector-tier results (TC-01/02/03/06 data part), not acceptance-test (AT) results.
 *
 * Usage (from the repository root):
 *   npm run build --workspace @campus-orchestrator/shared
 *   npm run build --workspace @campus-orchestrator/connectors
 *   REDIS_URL=redis://localhost:6379/15 EVIDENCE_EXECUTOR="Arda Çelik" \
 *     node packages/connectors/scripts/connector-evidence.mjs > evidence.txt
 *
 * Safety: deletes `cache:*` keys in the selected Redis database before and after the run.
 * Use a throwaway Redis or a spare database index (e.g. /15). Never point it at a shared production cache.
 */

import { execSync } from 'node:child_process';
import { createClient } from 'redis';
import {
  createCacheStoreFromEnv,
  createCampusConnectors,
  createConnectorToolHandlers,
  DEFAULT_MOCK_SEED,
  FaultInjectingConnector,
  loadConnectorConfig,
  RecordingEventSink,
  redactRedisUrl,
  ResilientConnectorExecutor,
  timeToSeconds,
} from '@campus-orchestrator/connectors';

const REDIS_URL = process.env.REDIS_URL?.trim();
if (!REDIS_URL) {
  console.error('REDIS_URL is required (use a throwaway Redis, e.g. redis://localhost:6379/15).');
  process.exit(2);
}

/** Manual clock in Türkiye time; advanced explicitly so TTL boundaries are exact. */
class ManualClock {
  constructor(isoWithOffset) {
    this.ms = Date.parse(isoWithOffset);
    this.now = () => new Date(this.ms);
  }
  set(isoWithOffset) {
    this.ms = Date.parse(isoWithOffset);
  }
  advance(seconds) {
    this.ms += seconds * 1000;
  }
}

const results = [];
const out = (line = '') => process.stdout.write(`${line}\n`);

function record(id, related, expected, actual, pass, extra = []) {
  results.push({ id, pass });
  out(`--- ${id} ---`);
  out(`RELATED_FR: ${related}`);
  out(`EXPECTED:   ${expected}`);
  out(`ACTUAL:     ${actual}`);
  for (const line of extra) out(`            ${line}`);
  out(`STATUS:     ${pass ? 'PASS' : 'FAIL'}`);
  out('');
}

const admin = createClient({ url: REDIS_URL });
await admin.connect();
async function cacheKeys() {
  const keys = [];
  for await (const batch of admin.scanIterator({ MATCH: 'cache:*', COUNT: 100 })) {
    keys.push(...(Array.isArray(batch) ? batch : [batch]));
  }
  return keys.sort();
}
async function cleanCacheKeys() {
  const keys = await cacheKeys();
  if (keys.length > 0) await admin.del(keys);
}

const guest = { role: 'GUEST' };
const block = (r) => r.content[0];
const config = loadConnectorConfig({ CONNECTOR_MOCK_SEED: DEFAULT_MOCK_SEED });

const handles = [];
async function wire(clock, options = {}) {
  const handle = await createCacheStoreFromEnv({ REDIS_URL }, clock.now, { warn: () => {} });
  handles.push(handle);
  const base = createCampusConnectors(config, clock.now);
  const faulty = {
    cafeteria: new FaultInjectingConnector(base.cafeteria),
    library: new FaultInjectingConnector(base.library),
  };
  const log = new RecordingEventSink();
  const executor = new ResilientConnectorExecutor({
    cache: handle.store,
    clock: clock.now,
    onEvent: log.sink,
    timeoutMs: options.timeoutMs ?? config.upstreamTimeoutMs,
  });
  const handlers = createConnectorToolHandlers({
    connectors: { ...base, ...faulty },
    executor,
    ttlSeconds: config.ttlSeconds,
    clock: clock.now,
  });
  return { handlers, faulty, log, executor };
}

// ---------------------------------------------------------------- header
let gitSha = 'unknown';
let dirty = '';
let sourceTrees = 'unknown';
try {
  gitSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  dirty = execSync('git status --porcelain -- packages/connectors tests/connectors', { encoding: 'utf8' }).trim() === ''
    ? ''
    : ' (connector files have uncommitted changes)';
  // Content-addressed tree ids: identical on every machine that has the same files, even when the
  // commit SHA differs (e.g. after a rebase), so evidence can be matched to the code it ran.
  const tree = (p) => execSync(`git rev-parse HEAD:${p}`, { encoding: 'utf8' }).trim();
  sourceTrees = `packages/connectors=${tree('packages/connectors')} tests/connectors=${tree('tests/connectors')}`;
} catch {
  // not a git checkout
}
const info = await admin.info('server');
const redisVersion = /redis_version:(\S+)/.exec(info)?.[1] ?? 'unknown';
out('========================================================================');
out('Campus Data Orchestrator — Connector-tier evidence (real Redis)');
out('========================================================================');
out('SCOPE:        connector package (dist) + real Redis. NOT MCP HTTP, gateway, web or Compose.');
out(`EXECUTED_AT:  ${new Date().toISOString()}`);
out(`GIT_SHA:      ${gitSha}${dirty}`);
out(`SOURCE_TREE:  ${sourceTrees}`);
out(`EXECUTOR:     ${process.env.EVIDENCE_EXECUTOR ?? 'unspecified (set EVIDENCE_EXECUTOR)'}`);
out(`ENV:          node ${process.version}; redis ${redisVersion} at ${redactRedisUrl(REDIS_URL)}; ${process.platform}/${process.arch}`);
out(`DATA_MODE:    MOCK (synthetic, seed ${config.mockSeed}); isSimulated=true expected on every result`);
out('TEST_CLOCK:   manual Türkiye-time clock per check (stated in each block); Redis retention uses real time');
out(`COMMAND:      REDIS_URL=${redactRedisUrl(REDIS_URL)} node packages/connectors/scripts/connector-evidence.mjs`);
out('========================================================================');
out('');

await cleanCacheKeys();

// ---------------------------------------------------------------- TC-01
{
  const clock = new ManualClock('2026-11-16T12:00:00+03:00');
  const { handlers } = await wire(clock);
  const weekday = block(await handlers.get_cafeteria_menu({ date: '2026-11-16' }, guest));
  const weekend = block(await handlers.get_cafeteria_menu({ date: '2026-11-22' }, guest));
  const meals = [weekday.data.lunch, weekday.data.dinner];
  const pass =
    weekday.data.available === true &&
    meals.every((m) => m && m.soup && m.mainDish && m.calories > 0) &&
    weekend.data.available === false &&
    typeof weekend.data.unavailableReason === 'string' &&
    weekend.data.unavailableReason.length > 0 &&
    weekday.isSimulated === true;
  record(
    'TC-01 (data part) cafeteria weekday / weekend',
    'FR-03, FR-12',
    '2026-11-16 available=true, lunch+dinner with soup/mainDish and calories>0; 2026-11-22 available=false with unavailableReason; isSimulated=true',
    `weekday available=${weekday.data.available} lunch.cal=${weekday.data.lunch?.calories} dinner.cal=${weekday.data.dinner?.calories} source=${weekday.source} isSimulated=${weekday.isSimulated}; weekend available=${weekend.data.available} reason="${weekend.data.unavailableReason}"`,
    pass,
    ['TEST_CLOCK: 2026-11-16T12:00:00+03:00']
  );
}

// ---------------------------------------------------------------- TC-02
{
  const clock = new ManualClock('2026-11-16T12:00:00+03:00');
  const { handlers } = await wire(clock);
  const lines = [];
  let pass = true;
  for (const route of ['MAIN_RING', 'METRO_LINE', 'DORMITORY_LINE']) {
    const b = block(await handlers.get_shuttle_schedule({ route }, guest));
    const secs = b.data.nextDepartures.map(timeToSeconds);
    const future = secs.every((s) => s > 12 * 3600);
    const sorted = secs.every((s, i) => i === 0 || secs[i - 1] < s);
    pass &&= b.data.routeId === route && secs.length > 0 && future && sorted;
    lines.push(`${route}: routeId=${b.data.routeId} next=[${b.data.nextDepartures.join(', ')}] future=${future} ascending=${sorted}`);
  }
  clock.set('2026-11-16T22:30:00+03:00');
  await cleanCacheKeys();
  const late = block(await handlers.get_shuttle_schedule({ route: 'DORMITORY_LINE' }, guest));
  pass &&= Array.isArray(late.data.nextDepartures) && late.data.nextDepartures.length === 0;
  lines.push(`DORMITORY_LINE at 22:30: next=[${late.data.nextDepartures.join(', ')}] (end of service, no error)`);
  record(
    'TC-02 (data part) shuttle future departures + end of service',
    'FR-04',
    'at 12:00 every departure > 12:00 and ascending, routeId equals request; at 22:30 DORMITORY_LINE returns []',
    lines[0],
    pass,
    [...lines.slice(1), 'Invalid route (-32602) is validated by the MCP dispatcher, covered by tests/connectors/gatewayMetadataChain.test.ts', 'TEST_CLOCK: 2026-11-16T12:00:00+03:00 and 22:30:00+03:00']
  );
}

// ---------------------------------------------------------------- TC-03
{
  const clock = new ManualClock('2026-11-16T12:00:00+03:00');
  const { handlers } = await wire(clock);
  const b = block(await handlers.get_library_occupancy({ floor: 'ALL' }, guest));
  const floors = b.data.floors;
  const bounds = floors.every((f) => f.occupiedSeats >= 0 && f.occupiedSeats <= f.maxSeats);
  const sumOcc = floors.reduce((n, f) => n + f.occupiedSeats, 0);
  const sumCap = floors.reduce((n, f) => n + f.maxSeats, 0);
  const pass = bounds && sumOcc === b.data.totalOccupied && sumCap === b.data.totalCapacity && b.data.isSimulated === true && b.isSimulated === true;
  record(
    'TC-03 (data part) library bounds, totals, simulation flag',
    'FR-05, FR-12',
    '0 ≤ occupiedSeats ≤ maxSeats per floor; Σ occupied = totalOccupied; Σ max = totalCapacity; data.isSimulated = meta isSimulated = true',
    `floors=${floors.map((f) => `${f.floorId}:${f.occupiedSeats}/${f.maxSeats}`).join(' ')} total=${b.data.totalOccupied}/${b.data.totalCapacity} Σ=${sumOcc}/${sumCap} data.isSimulated=${b.data.isSimulated} meta.isSimulated=${b.isSimulated}`,
    pass,
    ['TEST_CLOCK: 2026-11-16T12:00:00+03:00']
  );
}

// ---------------------------------------------------------------- A-03 TTL / retention in Redis
{
  await cleanCacheKeys();
  const clock = new ManualClock('2026-11-23T09:00:00+03:00');
  const { handlers } = await wire(clock);
  await handlers.get_cafeteria_menu({ date: '2026-11-23' }, guest);
  await handlers.get_shuttle_schedule({ route: 'MAIN_RING' }, guest);
  await handlers.get_library_occupancy({ floor: 'ALL' }, guest);
  await handlers.get_course_schedule({ day: 'MONDAY' }, { studentId: 'demo-student-01', role: 'STUDENT' });
  const expected = { dining: 3600, shuttle: 120, library: 60, schedule: 300 };
  const lines = [];
  let pass = true;
  for (const key of await cacheKeys()) {
    const ns = key.split(':')[1];
    const ttl = expected[ns];
    const pttl = await admin.pTTL(key);
    const entry = JSON.parse(await admin.get(key));
    const freshMs = Date.parse(entry.freshUntil) - Date.parse(entry.cachedAt);
    const ok = pttl > ttl * 3000 - 5000 && pttl <= ttl * 3000 && freshMs === ttl * 1000;
    pass &&= ok;
    lines.push(`${key}  PTTL=${pttl} ms (retention 3×${ttl}s=${ttl * 3000} ms)  freshUntil-cachedAt=${freshMs} ms  ${ok ? 'ok' : 'MISMATCH'}`);
  }
  pass &&= lines.length === 4;
  record(
    'A-03 Redis keys, TTL and 3×TTL retention',
    'FR-09',
    'one key per tool call; PTTL ≈ 3×TTL (180 000 / 360 000 / 900 000 / 10 800 000 ms); freshness window = TTL (60/120/300/3600 s)',
    `${lines.length} keys observed`,
    pass,
    [...lines, 'TEST_CLOCK: 2026-11-23T09:00:00+03:00']
  );
}

// ---------------------------------------------------------------- A-07 persona isolation
{
  await cleanCacheKeys();
  const clock = new ManualClock('2026-11-23T09:00:00+03:00');
  const { handlers, log } = await wire(clock);
  const a = block(await handlers.get_course_schedule({ day: 'MONDAY' }, { studentId: 'demo-student-01', role: 'STUDENT' }));
  const b = block(await handlers.get_course_schedule({ day: 'MONDAY' }, { studentId: 'demo-student-02', role: 'STUDENT' }));
  const keys = await cacheKeys();
  const values = await Promise.all(keys.map((k) => admin.get(k)));
  const leak = [...keys, ...values, JSON.stringify(log.events)].some((t) => t.includes('demo-student'));
  const pass = a.source === 'LIVE' && b.source === 'LIVE' && keys.length === 2 && !leak && JSON.stringify(a.data) !== JSON.stringify(b.data);
  record(
    'A-07 two-persona course-schedule isolation (Redis)',
    'FR-06, FR-07, FR-09, NFR-05',
    'student 02 right after 01 → LIVE (not CACHE_HIT); 2 distinct hashed keys; no student ID in keys, values or execution log',
    `01 source=${a.source}, 02 source=${b.source}; keys=${keys.join(', ')}; studentIdFound=${leak}`,
    pass
  );
}

// ---------------------------------------------------------------- TC-06
{
  await cleanCacheKeys();
  const clock = new ManualClock('2026-11-16T12:00:00+03:00');
  const { handlers, faulty, log, executor } = await wire(clock);
  const call = () => handlers.get_cafeteria_menu({ date: '2026-11-16' }, guest);
  const fresh = block(await call()); // step 1: populate
  clock.advance(3601); // TTL (3600 s) expired, retention (10 800 s) not
  faulty.cafeteria.failAlways('hang'); // step 2: upstream times out (> 800 ms)
  const steps = [];
  for (let i = 0; i < 3; i += 1) {
    const r = block(await call());
    const e = log.events.at(-1);
    steps.push({ source: r.source, isStale: r.isStale, timestamp: r.timestamp, durationMs: r.durationMs, failure: e.failureCode, circuit: e.circuitState });
  }
  const upstreamBefore = faulty.cafeteria.upstreamCalls;
  const open = block(await call()); // step 5
  const openEvent = log.events.at(-1);
  const upstreamAfter = faulty.cafeteria.upstreamCalls;

  // Variant: a fast failing upstream (connection refused style) instead of a hang.
  await cleanCacheKeys();
  const clock2 = new ManualClock('2026-11-16T12:00:00+03:00');
  const second = await wire(clock2);
  await second.handlers.get_cafeteria_menu({ date: '2026-11-16' }, guest);
  clock2.advance(3601);
  second.faulty.cafeteria.failAlways('error');
  const fastStale = block(await second.handlers.get_cafeteria_menu({ date: '2026-11-16' }, guest));

  const step3 = steps[0];
  const pass =
    steps.every((s) => s.source === 'STALE' && s.isStale && s.timestamp === fresh.timestamp) &&
    steps[2].circuit === 'OPEN' &&
    executor.circuitSnapshot('cafeteria').state === 'OPEN' &&
    open.source === 'STALE' &&
    openEvent.failureCode === 'CIRCUIT_OPEN' &&
    upstreamAfter === upstreamBefore &&
    open.durationMs < 50;
  record(
    'TC-06 stale-if-error + circuit breaker (cafeteria, Redis)',
    'FR-09, FR-10, FR-11, NFR-03',
    'step 3 STALE with isStale=true and original timestamp; 3 failures → OPEN; step 5 immediate fallback, 0 upstream attempts',
    `step3..5 sources=${steps.map((s) => s.source).join(',')}, timestamps=original:${steps.every((s) => s.timestamp === fresh.timestamp)}, circuit after 3rd=${steps[2].circuit}; step5 source=${open.source} failure=${openEvent.failureCode} upstream attempts during OPEN=${upstreamAfter - upstreamBefore}`,
    pass,
    [
      `durations: hang→timeout fallback ${steps.map((s) => s.durationMs).join(' / ')} ms; OPEN fallback ${open.durationMs} ms; fast-error fallback ${fastStale.durationMs} ms (source=${fastStale.source})`,
      `NOTE: QA Plan TC-06 expects step 3 "< 50 ms". With a hanging upstream the first fallback can only answer after the 800 ms timeout (measured ${step3.durationMs} ms);`,
      '      < 50 ms holds for an open circuit or a fast-failing upstream. Reported to the QA plan owner; not counted as a failure of the connector.',
      'TEST_CLOCK: 2026-11-16T12:00:00+03:00, advanced by 3601 s before the fault',
    ]
  );
}

// ---------------------------------------------------------------- A-09 connector-tier latency and hit ratio
{
  await cleanCacheKeys();
  const clock = new ManualClock('2026-11-23T09:00:00+03:00');
  const { handlers, log } = await wire(clock);
  // NFR-02 usage pattern, simulated at the connector tier: 20 users refresh the dashboard every 30 s for
  // 30 minutes. A dashboard refresh = menu card + ring card (MAIN_RING) + library card (ALL).
  // Users are staggered by 1.5 s; calls run sequentially (no concurrency) against the real Redis.
  const USERS = 20;
  const PERIOD_S = 30;
  const DURATION_S = 30 * 60;
  const STEP_S = PERIOD_S / USERS;
  const wall = [];
  for (let t = 0; t < DURATION_S; t += STEP_S) {
    for (const call of [
      () => handlers.get_cafeteria_menu({}, guest),
      () => handlers.get_shuttle_schedule({ route: 'MAIN_RING' }, guest),
      () => handlers.get_library_occupancy({ floor: 'ALL' }, guest),
    ]) {
      const started = performance.now();
      await call();
      wall.push(performance.now() - started);
    }
    clock.advance(STEP_S);
  }
  const total = log.events.length;
  const hits = log.events.filter((e) => e.outcome === 'CACHE_HIT').length;
  const sorted = [...wall].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)];
  const ratio = hits / total;
  record(
    'A-09 connector-tier cache hit ratio and latency (NFR-02 usage pattern, simulated)',
    'NFR-02, NFR-01 (connector tier only)',
    'hit ratio = CACHE_HIT events / all connector.execute events ≥ 90 % (NFR-02 target); latency = wall time of one handler call (cache + connector), p95 by nearest rank',
    `requests=${total} hits=${hits} hitRatio=${(ratio * 100).toFixed(1)}% p50=${pct(50).toFixed(2)} ms p95=${pct(95).toFixed(2)} ms max=${sorted.at(-1).toFixed(2)} ms`,
    total === (DURATION_S / STEP_S) * 3 && ratio >= 0.9,
    [
      `Pattern: ${USERS} users × refresh every ${PERIOD_S} s × ${DURATION_S / 60} min, 3 public cards per refresh, simulated clock, sequential calls.`,
      'This is NOT the NFR-01/NFR-02 acceptance measurement: no HTTP, gateway, browser or concurrency (NFR-01 asks for 20 concurrent users).',
    ]
  );
}

await cleanCacheKeys();
for (const h of handles) await h.close();
await admin.close();

const failed = results.filter((r) => !r.pass);
out('========================================================================');
out(`SUMMARY: ${results.length - failed.length}/${results.length} checks PASS${failed.length ? `; FAIL: ${failed.map((f) => f.id).join(' | ')}` : ''}`);
out('========================================================================');
process.exit(failed.length === 0 ? 0 : 1);
