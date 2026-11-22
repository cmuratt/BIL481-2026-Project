# Handover — Connectors, Redis Cache & Data Quality (Arda Çelik)

| Field | Detail |
| :--- | :--- |
| **Author** | Arda Çelik (241101065) — `@ardacelik11` |
| **Component** | `packages/connectors/**`, `tests/connectors/**`, connector data in `tests/contracts/fixtures/query-{cafeteria,shuttle,library,stale}-success.json`, `docs/assignment3/evidence/connectors/**` |
| **For** | Murat Can Işık (MCP server wiring M-02, Dockerfile M-13, contract steward), Ahmet Sefa Efendioğlu (Compose, Test Results Report, QA Plan), Yunus Emre Biçer (web client, Acceptance Tests document) |
| **Version / Date** | 1.0, 20 November 2026 |
| **Branches / PRs** | `build/pa3-connectors-redis` (PR #30, `redis` npm package only — merged) → `feat/pa3-connectors` (PR #31, code, tests, fixtures, docs), from `dev` @ `75fdd6b` |
| **Contract** | API Contract v1.1 (`docs/assignment3/contracts/API_CONTRACT.md`, PR #23) |

---

## 1. Summary

The connector tier now has everything the four direct scenarios need on the data side: a settable test clock
(`CONNECTOR_FIXED_NOW`), a real Redis cache driven by `REDIS_URL`, the five contract metadata fields inside the MCP
JSON block, a per-call execution log that acceptance tests can count, per-student cache isolation, and contract
fixtures generated from real output. **None of this is in a running demo yet.** Murat's wiring (PR #26, M-02) and MCP
Dockerfile (PR #28, M-13) are merged into `dev`; this branch merges into that `dev` without conflict and the whole test
suite passes. Nothing below claims an end-to-end or acceptance-test result.

## 2. API Contract v1.1 items owned by Arda

| Item | Status |
| :--- | :--- |
| §8 Q3 — `CONNECTOR_FIXED_NOW` | **Implemented.** ISO-8601 with an explicit offset (`2026-11-23T09:00:00+03:00`). The connector clock **starts** at that instant when the MCP server starts and then **advances in real time**. A frozen clock would keep cached data fresh forever, so AC-03.7 (stale) and the circuit half-open probe could never happen. Unset/empty = real time. Invalid or offset-less values stop the server at startup. An injected clock (unit tests) wins. |
| §5 / §8 Q1 — connector data for the contract fixtures | **Delivered:** `query-cafeteria-success.json`, `query-shuttle-success.json`, `query-library-success.json`, `query-stale-success.json`. They were produced by the real chain (connector handlers → MCP HTTP `/mcp` → gateway `forwardToolQuery`) with seed `481-FALL-2026` and clock `2026-11-23T09:00+03:00`. `meta.durationMs` is set to `0` in the files (real responses carry a measured integer). `contractFixtures.test.ts` fails if the connector output and the files drift apart. |
| §3.2 — metadata in the MCP `content[]` JSON block | **Implemented:** `source`, `isSimulated`, `isStale`, `timestamp`, `durationMs`. The block is needed because `apps/mcp-server/src/index.ts` forwards only `content`, `isError`, `isStale`, `timestamp` of the result. `source` is never `MOCK`. |

## 3. Task status (Görev Rehberi v1.2 §4.3)

| Task | Status | Where / evidence |
| :--- | :--- | :--- |
| A-01 deterministic mock JSON, fixed seed/clock | **Done** | `fixedClockAndDeterminism.test.ts` |
| A-02 Redis runtime wiring via `REDIS_URL` | **Done in code; verified against a real Redis 7.0** (separate Linux development environment). Both runtime factories honour `REDIS_URL`, so the MCP server from PR #26 uses Redis without further change. Not yet run inside the team Compose stack (needs this branch merged) | `src/cache/redisClient.ts`, `redisIntegration.test.ts`, `evidence/connectors/` |
| A-03 TTL + 3 × TTL retention, key/TTL observation | **Done against a real Redis 7.0** (PTTL observed for all four namespaces). Compose observation pending (this branch merged + Compose run) | `evidence/connectors/connector-tier-real-redis.txt` |
| A-04 stale-if-error, fault injection log, metadata to gateway | **Done** | `executionLogAndFaults.test.ts`, `gatewayMetadataChain.test.ts` |
| A-05 circuit breaker 3 failures / 60 s / half-open, isolation, durations | **Done** (real-timer durations: ≈ 800 ms timeout fallback, about 1 ms when open) | same + evidence file |
| A-06 metadata types/mappers + fixtures for Sefa/Yunus | **Done** (`ConnectorResponseMeta`, `toResponseMeta`) | fixtures + `gatewayMetadataChain.test.ts` |
| A-07 per-student cache isolation, no plain ID, two-persona test | **Done** | `personaIsolation.test.ts`, Redis group, evidence |
| A-08 mock vs unavailable-live semantics | **Done** | `packages/connectors/README.md` §1 |
| A-09 perf / fault-isolation metrics, method | **Connector tier measured** (NFR-02 usage pattern simulated: hit ratio 98.7 %, cache-path p95 well below 1 ms; values in the evidence file). End-to-end p95 / hit ratio: **NOT RUN** — needs the deployed stack and a load run with Sefa | evidence file, `docs/assignment3/piazza/arda-data-quality.md` §4 |
| A-10 TC-01/02/03/06 results, UC-01/02/03 data evidence | **Data part regenerated** (connector tier + real Redis). AT-01..AT-03: **NOT RUN (BLOCKED)** until this branch is merged and Sefa runs them in Compose | evidence files |
| A-11 README + this handover | **Done** | — |
| A-12 Docker/Compose handover to Sefa | **Done as instructions** (§5). Not executed in Compose | — |
| PR #17 review (AC-01.x, AC-02.x, AC-03.x) | **Review written**; posted by Arda as PR #17 comments (deadline 26 Nov) | PR #17 conversation |
| Piazza data quality note (5 Dec) | **Draft done** | `docs/assignment3/piazza/arda-data-quality.md` |

## 4. For Murat — M-02 / M-13 (PR #26, PR #28, both merged)

Checked against `dev` with PR #26 (`67d86cc`) and PR #28 (`8b3405d`) merged:

* `createCampusMcpServer()` calls `createConnectorRuntime()`. On this branch that synchronous factory reads `REDIS_URL`
  and connects to Redis in the background, so **no change in `apps/mcp-server` is needed for Redis**. If you prefer to
  wait for Redis at startup, pass `connectorRuntime: await createConnectorRuntimeFromEnv()` from `main()`.
* Please update three texts once this branch is merged, because they would then be wrong: `describeRuntime()` reports
  `cache: 'in-memory'` (use `runtime.cacheBackend`), the startup line "REDIS_URL is set but the Redis client is not wired
  yet … (BLOCKED: Arda A-02)", and the `REDIS_URL` row in `apps/mcp-server/README.md`.
* The Dockerfile from PR #28 builds `shared` + `connectors` and installs their production dependencies, which now include
  `redis` — nothing to add. `NODE_ENV=production` without `REDIS_URL` stops the server by design (Compose sets it).
* `feat/pa3-connectors` + current `dev`: no conflict (the two `package-lock.json` changes are independent and
  `npm install --package-lock-only` leaves the merged lockfile unchanged); `tsc` for connectors / mcp-server / gateway
  passes; `npx vitest run` passes (connector log lines appear on stderr in your tests — noise only).
* Proven compatible without editing your code: `tests/connectors/gatewayMetadataChain.test.ts` starts your real
  `startHttpServer()` on a random port, re-registers the connector handlers on the same dispatcher and calls it through
  Sefa's real `forwardToolQuery`.

## 5. For Sefa — A-12 Redis / Compose handover

**Settings (no secrets):** the `redis` and `mcp-server` services in `compose.yaml` on `dev` are already correct for the
connector tier — `redis:7-alpine`, internal network only, `redis-cli ping` healthcheck, `mcp-server` `depends_on: redis:
service_healthy`, `REDIS_URL=redis://redis:6379`, all connector variables with the defaults of the table in
`packages/connectors/README.md` §4. No change requested.

**Startup order:** `redis` (healthy) → `mcp-server` (connects at startup; if Redis is not reachable it exits and
`restart: unless-stopped` retries) → `api-gateway` → `web`. A Redis outage *after* startup does not crash anything:
cache reads become misses, writes are skipped, the client reconnects (`{"event":"connector.cache",...}` on stderr).

**Observation commands (Compose, after this branch is merged):**

```bash
docker compose logs mcp-server | grep '"event":"connector.execute"'          # one line per connector call
docker compose exec redis redis-cli --scan --pattern 'cache:*'               # cache keys
docker compose exec redis redis-cli PTTL cache:library:ALL                    # ≤ 180000 ms (3 × 60 s)
```

**Reset between acceptance runs** (removes only connector cache keys; rate-limit keys stay):

```bash
docker compose exec redis sh -c "redis-cli --scan --pattern 'cache:*' | xargs -r redis-cli del"
```

**Seed:** nothing to load. Data are generated from `CONNECTOR_MOCK_SEED` (default `481-FALL-2026`). The cache warms with
the first request.

**Acceptance clock:** `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 docker compose up -d` (Compose already passes the
variable). Record the start time of the run; the connector clock advances from 09:00.

**Recipes for the conditional criteria (no code change needed):**

* AC-02.5 end of service: `CONNECTOR_FIXED_NOW=2026-11-23T22:30:00+03:00 docker compose up -d mcp-server`, then select
  "Yurtlar" → `nextDepartures = []`.
* AC-03.7 stale fallback: (1) request library "Tüm katlar" (LIVE); (2)
  `LIBRARY_CONNECTOR_MODE=live docker compose up -d mcp-server` (the live placeholder always fails); (3) **between
  60 s and 180 s after step 1** press "Yenile" → HTTP 200, `meta.source = "STALE"`, `isStale = true`, original
  timestamp, `isSimulated = true`; (4) restart with the default mode. This is verified at unit/integration level
  (`executionLogAndFaults.test.ts` → "provenance … mock → live switch"); it has **not** been run in Compose.

**Evidence script** for the data part against the Compose Redis (Redis has no host port, so run it in a container on
the internal network once the MCP image exists, or against a throwaway local Redis):
`REDIS_URL=… node packages/connectors/scripts/connector-evidence.mjs` (README §6).

**For the Test Results Report:** `BLK-REDIS-WIRING` (A-02, Q3) is resolved on `feat/pa3-connectors` once merged;
`BLK-MCP-RUNTIME` is addressed by Murat's PR #26 (merged). `TSK-DEP-07` / `TSK-TRR-04` can move from "Pending Arda" to
"Pending merge of this branch and a Compose run".

**QA Plan finding (TC-06):** step 3 expects the stale answer "< 50 ms" while the upstream is made to *time out* (> 800 ms).
The first fallback can only answer after the 800 ms cutoff (measured ≈ 800 ms). "< 50 ms" holds for an open circuit
(1 ms) or a fast-failing upstream (a few ms). Suggest: step 3 "≤ 800 ms + 50 ms", step 5 "< 50 ms". Your document,
your decision.

## 6. For Yunus — web client and Acceptance Tests document

* Fixtures: `tests/contracts/fixtures/query-{cafeteria,shuttle,library,stale}-success.json` (real output, see §2). Your
  local copies under `apps/web` can be replaced by or checked against these.
* `meta.isSimulated` is independent of `meta.source`; data cached in mock mode stays `isSimulated: true` even when it is
  served `STALE` after a switch to live mode.
* `meta.durationMs` is an integer measured with a monotonic timer; cache hits are typically 0–1 ms.
* With `CONNECTOR_FIXED_NOW`, the web still uses the browser clock for the menu card's default date
  (`campusToday()`) and for the "x dk sonra" hints of the ring card. The data stay correct (the connector filters
  departures with its own clock), but in an acceptance run at, say, 14:00 real time the hints next to 09:15 departures
  are hidden because they are negative. If you want them in the evidence, use `data.lastUpdated` / `meta.timestamp`
  as the reference time. Your call — not a blocker for the connector side.
* Review of AC-01.x, AC-02.x, AC-03.x goes to PR #17 as comments (main points: AC-01.7 counting across the whole AT-01 run,
  AC-02.2 reference time with an advancing clock, AC-02.5 and AC-03.7 can become mandatory, AC-03.4 15-minute bucket).

## 7. What was verified, where, and what was not

| Check | Where | Result |
| :--- | :--- | :--- |
| `tsc --noEmit` for `shared`, `connectors`, `mcp-server`, `api-gateway`, `web` | Linux development environment | PASS |
| `npx vitest run` on this branch merged with current `dev` (no Redis) | Linux development environment | 293 passed, 8 skipped (real-Redis group) |
| Same merged tree with `REDIS_TEST_URL` (redis-server 7.0.15) | Linux development environment | 301 passed |
| `connector-evidence.mjs` (TC-01/02/03/06 data part, A-03, A-07, A-09) | Linux development environment, redis-server 7.0.15 | 7/7 PASS |
| Redis stopped and restarted under a connected client (manual) | Linux development environment | read rejected in 1 ms ("client is offline"), reconnected, writes succeeded after restart |
| `tsc` (5 workspaces) + `npx vitest run` on Arda's own computer (macOS 15.0.1 (arm64), Node v26.13.1) | Arda | PASS — Tests 293 passed / 8 skipped (301); real-Redis group skipped (no Redis there) — `evidence/connectors/vitest-arda-mac.txt` |
| Redis inside Compose, connector logs from the MCP container | — | **NOT RUN** — needs this branch merged and a Compose run (Sefa has Docker) |
| AT-01, AT-02, AT-03 | — | **NOT RUN (BLOCKED)** — this branch not merged yet |
| End-to-end p95 latency / hit ratio (NFR-01 / NFR-02) | — | **NOT RUN** — needs the deployed stack and a load run (Sefa) |

"Linux development environment" is a separate Linux machine with Node 22 and a local Redis 7.0.15; it is not team
hardware and not the Compose stack. Evidence files carry `GIT_SHA` and `SOURCE_TREE` ids (git tree hashes of
`packages/connectors` and `tests/connectors`) so each run can be matched to the committed code.

## 8. Open dependencies

| # | Needed from | What exactly | Blocks |
| :--- | :--- | :--- | :--- |
| 1 | Murat or Sefa (reviewer) | PR #30 (`redis` dependency) is merged; review and merge PR #31 (this branch); afterwards Murat updates the three "Redis not wired" texts (§4) | every end-to-end run, AT-01..AT-03, connector logs in the demo |
| 2 | Sefa | after 1: `docker compose up --build` with all four services; record the §5 observation commands | Redis-in-Compose evidence for A-02 / A-03 |
| 3 | Sefa | after 2: run AT-01..AT-03 with the §5 recipes; load run for end-to-end p95 / hit ratio | A-09 / A-10 end-to-end part |
