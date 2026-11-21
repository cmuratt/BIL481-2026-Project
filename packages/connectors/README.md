# @campus-orchestrator/connectors

Connector, cache and resilience tier of the **Campus Data Orchestrator** (Group-ASYM, BIL 481).
Owner: **Arda Çelik** (`@ardacelik11`), Connector & Data Lead. Requirements: FR-03 – FR-06 and FR-09 – FR-12.

The package provides the data behind the four MCP tools:

| MCP tool | Connector | Cache TTL (retention 3 × TTL) | Data source today |
| :--- | :--- | :--- | :--- |
| `get_cafeteria_menu` | `MockCafeteriaConnector` | 3600 s (10 800 s) | Deterministic synthetic menu |
| `get_shuttle_schedule` | `MockShuttleConnector` | 120 s (360 s) | Deterministic synthetic timetable |
| `get_library_occupancy` | `MockLibraryConnector` | 60 s (180 s) | Simulated occupancy, re-sampled every 15 min |
| `get_course_schedule` | `MockCourseScheduleConnector` | 300 s (900 s), per student | Deterministic synthetic SIS timetable |

> **Honest status:** no real campus API is accessible (Project Definition §4.3). All four connectors run in
> **mock mode** and every result is labelled `isSimulated: true`. Nothing in this package fetches real
> university data.

## 1. Mock mode vs. unavailable live mode (A-08)

| | `mock` (default) | `live` |
| :--- | :--- | :--- |
| Connector class | `Mock*Connector` | `UnavailableLiveConnector` (placeholder) |
| What it does | Generates deterministic synthetic data from `CONNECTOR_MOCK_SEED` and the connector clock (Türkiye time, UTC+3) | Always fails with `UPSTREAM_UNAVAILABLE`; health = `DOWN` |
| `meta.source` | `LIVE` on a fresh execution, `CACHE_HIT` within the TTL | never `LIVE`; `STALE` if a retained value exists, otherwise an error |
| `meta.isSimulated` | `true` | `false` for its own results — but a value that was cached in mock mode keeps `isSimulated: true` when it is served as `STALE` (provenance is stored with the cache entry) |
| REST result (gateway) | HTTP 200 | HTTP 200 + `STALE` within 3 × TTL of the last mock value, otherwise HTTP 503 `UPSTREAM_UNAVAILABLE` (no fake data) |

`source: "LIVE"` means *a fresh connector execution*, not *real campus data* (API Contract v1.1 §3.2).
`MOCK` is never used as a `source`; synthetic data is identified only by `isSimulated`.

Switching a connector to `live` is therefore a **fault-injection switch**, not a data source: restart the
MCP server with `LIBRARY_CONNECTOR_MODE=live` and request the library **between 60 s and 180 s** after the last
successful library request (TTL expired, retention not yet). The value retained in Redis is then served as
`STALE` with its original timestamp — the stale-fallback path of AC-03.7 (see the handover, §5).

## 2. Implementation status

| Part | Status | Evidence |
| :--- | :--- | :--- |
| 4 deterministic mock connectors (seeded PRNG, Türkiye time) | Implemented, tested | `mockConnectors.test.ts`, `fixedClockAndDeterminism.test.ts` |
| `CONNECTOR_FIXED_NOW` (Contract §7, §8 Q3) | Implemented, tested | `fixedClockAndDeterminism.test.ts` |
| Mode switching per connector via env vars (FR-12) | Implemented, tested | `configAndFactory.test.ts` |
| Live connectors | **Not available** — upstream access not confirmed; placeholder only | — |
| Redis cache via `REDIS_URL` (official `redis` client) | Implemented; tested against a real Redis 7.0 server in a separate Linux development environment | `redisIntegration.test.ts` (opt-in), `docs/assignment3/evidence/connectors/` |
| Redis inside the team's Docker Compose stack | **Not yet run** — Murat's wiring (PR #26) and MCP Dockerfile (PR #28) are merged into `dev`; needs this branch merged, then a Compose run | — |
| TTL cache, 3 × TTL retention, stale-if-error, 800 ms timeout, circuit breaker | Implemented, tested (in-memory and real Redis) | `resilientExecutor.test.ts`, `executionLogAndFaults.test.ts` |
| Contract metadata (`source`, `isSimulated`, `isStale`, `timestamp`, `durationMs`) in the MCP JSON block | Implemented, tested through the real MCP HTTP server and gateway adapter | `gatewayMetadataChain.test.ts` |
| Structured execution log (one JSON line per call, stderr) | Implemented, tested | `executionLogAndFaults.test.ts` |
| Per-student cache isolation without plain student IDs | Implemented, tested | `personaIsolation.test.ts`, `redisIntegration.test.ts` |
| Contract success / stale fixtures | Generated from real output, drift-checked | `tests/contracts/fixtures/query-*-success.json`, `contractFixtures.test.ts` |
| Wiring into `apps/mcp-server` | Done by Murat (PR #26, merged): `createCampusMcpServer()` calls `createConnectorRuntime()`; with this package that call uses Redis when `REDIS_URL` is set. This branch merges into current `dev` without conflict and all tests pass | — |
| Telemetry to PostgreSQL (FR-20) | Not part of this package | — |

## 3. Integration in the MCP server (M-02)

Two factories, same cache rule (`REDIS_URL` set → shared Redis; unset → in-memory for development, startup error
under `NODE_ENV=production`):

```ts
import { createConnectorRuntime, createConnectorRuntimeFromEnv, registerConnectorHandlers } from '@campus-orchestrator/connectors';

const runtime = createConnectorRuntime();                // sync: Redis connects in the background (misses until ready)
// or: const runtime = await createConnectorRuntimeFromEnv();   // async: waits for Redis, throws if unreachable
registerConnectorHandlers(dispatcher, runtime);
console.error(`[connectors] cache=${runtime.cacheBackend} fixedNow=${runtime.config.fixedNow ?? 'off'}`);
// on shutdown: await runtime.close();
```

* `apps/mcp-server` (PR #26) uses the synchronous `createConnectorRuntime()` inside `createCampusMcpServer()`; no change in
  `apps/mcp-server` is needed for Redis. `runtime.cacheBackend` reports `redis` or `memory` for logs and `/health`.
* Unit tests pass `env` without `REDIS_URL` (in-memory, no warning) or an explicit `cache`.

## 4. Environment variables

| Variable | Default | Meaning |
| :--- | :--- | :--- |
| `CAFETERIA_CONNECTOR_MODE`, `SHUTTLE_CONNECTOR_MODE`, `LIBRARY_CONNECTOR_MODE`, `SCHEDULE_CONNECTOR_MODE` | `mock` | `mock` or `live` (any other value fails at startup) |
| `CACHE_TTL_CAFETERIA`, `CACHE_TTL_SHUTTLE`, `CACHE_TTL_LIBRARY`, `CACHE_TTL_COURSE_SCHEDULE` | 3600 / 120 / 60 / 300 | Freshness TTL in seconds (FR-09); retention is 3 × TTL |
| `UPSTREAM_TIMEOUT_MS` | `800` | Upstream cutoff (NFR-01, FR-10) |
| `CONNECTOR_MOCK_SEED` | `481-FALL-2026` | Seed for all synthetic data |
| `CONNECTOR_FIXED_NOW` | unset (= real time) | Acceptance runs only. ISO-8601 **with offset**, e.g. `2026-11-23T09:00:00+03:00`. The connector clock **starts** at this instant when the MCP server starts and then advances in real time, so TTLs, retention and the circuit cooldown still behave normally. Invalid or offset-less values stop the server at startup. |
| `REDIS_URL` | — | `redis://localhost:6379` locally, `redis://redis:6379` in Compose. If unset: in-memory cache with a warning (development), startup error when `NODE_ENV=production` |

## 5. Runtime behaviour worth knowing

* **Redis outage at runtime:** commands are not queued (`disableOfflineQueue`) and each cache operation is
  limited to 200 ms. A read becomes a miss, a write is skipped, the tool call continues; the client reconnects in
  the background. Warnings go to stderr as `{"event":"connector.cache",...}` without the password.
* **Execution log:** every call writes one line to stderr, e.g.
  `{"event":"connector.execute","at":"…","connector":"library","outcome":"CACHE_HIT","upstreamCalled":false,"cacheKey":"cache:library:ALL","durationMs":0,"circuitState":"CLOSED"}`.
  `upstreamCalled` is what AC-01.7 / AC-02.7 / AC-03.6 count ("connector executed once"). No arguments, auth data or
  student IDs are logged; course-schedule keys contain a SHA-256 prefix instead of the ID.
* **`durationMs`:** measured with a monotonic timer (integer ms), independent of `CONNECTOR_FIXED_NOW`.
* **Cache keys:** `cache:dining:<date>`, `cache:shuttle:<route>`, `cache:library:<floor>`,
  `cache:schedule:<sha256-16>:<weekday>`.

## 6. Tests and evidence

```bash
npm run build --workspace @campus-orchestrator/shared
npx tsc -p packages/connectors --noEmit           # type check
npx vitest run tests/connectors                   # offline: real-Redis group reported as skipped
REDIS_TEST_URL=redis://localhost:6379/15 npx vitest run tests/connectors/redisIntegration.test.ts
UPDATE_CONTRACT_FIXTURES=1 npx vitest run tests/connectors/contractFixtures.test.ts   # after an intended data change
```

Evidence run in the §7.5 format against a real Redis (deletes `cache:*` keys in the chosen database — use a
throwaway one):

```bash
npm run build --workspace @campus-orchestrator/shared && npm run build --workspace @campus-orchestrator/connectors
REDIS_URL=redis://localhost:6379/15 EVIDENCE_EXECUTOR="<name>" node packages/connectors/scripts/connector-evidence.mjs
```

Design details: `docs/_sections/arda-data-decisions.md`. Handover: `docs/assignment3/handovers/arda.md`.
