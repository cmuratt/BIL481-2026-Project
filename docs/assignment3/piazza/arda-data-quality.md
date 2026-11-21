# Data Features, Constraints and Connector Quality (Piazza completion — Arda Çelik)

| Field | Detail |
| :--- | :--- |
| **Author** | Arda Çelik (241101065) — `@ardacelik11`, Connector & Data Lead |
| **Version / Date** | 1.0, 21 November 2026 |
| **Scope** | The four campus data domains behind the MCP tools, their data constraints and the measurable quality of the connector/cache tier |
| **Feeds** | `docs/Project_Definition_Document.md` (data/constraint parts), Design Document connector sections (Murat), QA Plan / Test Results Report (Sefa) |
| **Code basis** | `packages/connectors` on `feat/pa3-connectors` (from `dev` @ `6cc1d07`) |

## Change Record

| Version | Date | Change | Author |
| :--- | :--- | :--- | :--- |
| 0.1 | 20 Nov 2026 | First draft: feature sets, constraints, metric definitions, connector-tier measurements | Arda Çelik |
| 1.0 | 21 Nov 2026 | Final: measured values checked against `docs/assignment3/evidence/connectors/` | Arda Çelik |

## Contribution Table

| Member | Contribution to this note |
| :--- | :--- |
| Arda Çelik | All content; connector code, tests and evidence it refers to |

---

## 1. Source of the data — the honest position

No official TOBB ETÜ API for menus, shuttles, library turnstiles or the student information system was made available
to the project. Every connector therefore runs in **mock mode** and produces **synthetic** data from a fixed seed. The
`live` mode exists only as a placeholder that reports "unavailable"; it does not scrape web pages and does not imitate
access to a real system. Every response carries `isSimulated: true`, and the UI shows "Sentetik veri".

`meta.source` describes *how* a result was obtained (`LIVE` = fresh connector execution, `CACHE_HIT`, `STALE`), not
*whether the data are real*. The two fields are kept separate in the code, the API Contract (v1.1 §3.2), the fixtures
and the acceptance criteria (AC-01.6, AC-02.6, AC-03.5). `MOCK` is never used as a `source`.

## 2. Feature sets per domain

| Domain / tool | Included features | Excluded (and why) | Generation rule |
| :--- | :--- | :--- | :--- |
| Cafeteria — `get_cafeteria_menu` | date, `available`, lunch (soup, main dish, vegetarian option, side dish, calories, allergens), dinner (soup, main dish, side dish, calories), `unavailableReason` | prices, portion sizes, real daily menu, nutrition beyond calories (no source; would look authoritative) | pure function of (seed, date); weekends `available: false` with a bilingual reason |
| Shuttle — `get_shuttle_schedule` | route id/name, next ≤ 3 departures (`HH:mm`, strictly after "now"), active vehicles, `lastUpdated` | GPS positions, live delays, stop-level times (no telematics source; would imply real tracking) | fixed weekday/weekend timetables per route; vehicles from (seed, route, date, hour) |
| Library — `get_library_occupancy` | per floor: id, name, occupied seats, capacity, quiet-area flag; totals; `isSimulated` | turnstile counts, room bookings, per-seat state (no access; privacy) | occupancy curve by hour × noise from (seed, floor, date, 15-min bucket); 0 outside opening hours |
| Course schedule — `get_course_schedule` | course code/title, instructor, classroom, day, start/end time | grades, transcripts, student names, any identity data (privacy; not needed by UC-04) | course set from (seed, student ID); identity only from the verified gateway header, never from tool arguments |

## 3. Constraints

| Kind | Constraint | How the implementation respects it |
| :--- | :--- | :--- |
| Access | No official campus API access | mock mode by default; `live` = explicit unavailable placeholder |
| Licence / ownership | Real menus, timetables and floor plans belong to the university | invented dish names, routes and floor names; no copied material |
| Privacy (KVKK) | A student ID is personal data | never a tool argument (schema rejects it); cache keys contain a SHA-256 prefix; execution logs contain no arguments, auth data or IDs; tests use synthetic IDs (`demo-student-01`) |
| Privacy — limitation | The 16-hex SHA-256 prefix of a low-entropy ID is pseudonymisation, not anonymisation | Redis is internal-only (no host port, Compose `internal` network); a keyed hash would be the next step |
| Time | All "today / now" logic in Türkiye time (UTC+3, no DST) | `toTurkeyLocalTime`; `CONNECTOR_FIXED_NOW` pins the starting instant for acceptance runs |
| Operational | Upstream cutoff 800 ms; cache must be shared between MCP instances | `UPSTREAM_TIMEOUT_MS`; Redis via `REDIS_URL`, production refuses to start without it |
| Freshness | TTL 3600 / 120 / 60 / 300 s; stale data must be marked | retention 3 × TTL; stale answers carry `isStale: true` and the original timestamp |

## 4. Quality metrics — definitions, targets and measured values

Definitions are computed from the connector execution log (`{"event":"connector.execute",…}`, one line per call).

| Metric | Formula | Target (source) | Measured | Status |
| :--- | :--- | :--- | :--- | :--- |
| Cache hit ratio | `CACHE_HIT events / all connector.execute events` | ≥ 90 % for 20 users refreshing every 30 s for 30 min (NFR-02) | **98.7 %** (3554 / 3600) — same usage pattern simulated at the connector tier (3 public cards per refresh, simulated clock, real Redis) | connector tier only; NFR-02 acceptance run **NOT RUN** |
| Cache-path latency p95 | nearest-rank p95 of handler wall time (cache + connector) | < 250 ms with 20 concurrent users for 5 min (NFR-01 clause 1) | well below 1 ms p95 (same run, **sequential**, no HTTP; exact values in the evidence file) | connector tier only; NFR-01 benchmark (concurrent, through the gateway) **NOT RUN** |
| Upstream cutoff | `durationMs` of a call whose upstream hangs | 800 ms timeout (NFR-01 clause 2, FR-10) | **≈ 800 ms** (see evidence file) | measured, Linux dev environment |
| Fallback when circuit open | `durationMs` while OPEN | < 50 ms (FR-11, TC-06 step 5) | **1 ms**, 0 upstream attempts | measured, Linux dev environment |
| Stale correctness | share of STALE answers with `isStale = true` and original `timestamp` | 100 % | 100 % in all tests | tests + evidence |
| Fault isolation | other connectors' circuit state and latency while one fails | unaffected (NFR-03) | CLOSED, normal answers | `resilientExecutor.test.ts` |
| Determinism | identical output for same seed + clock | 100 % | identical JSON in two independent runtimes | `fixedClockAndDeterminism.test.ts` |

Sample sizes, environment and commands are in `docs/assignment3/evidence/connectors/connector-tier-real-redis.txt`. The
measured values come from a separate Linux development environment (Node 22, Redis 7.0.15), not from the team's Compose deployment, and
are not the NFR-01 / NFR-02 acceptance measurements.

## 5. Tests of seed, ISO dates and Türkiye time

| Property | Test |
| :--- | :--- |
| Same seed + same clock → identical data; different seed → different data | `fixedClockAndDeterminism.test.ts`, `configAndFactory.test.ts` |
| Impossible ISO dates rejected before any connector call (`2026-99-77`, `2026-02-30`) | `mockConnectors.test.ts`, `gatewayMetadataChain.test.ts` (HTTP 400, no execution event) |
| `CONNECTOR_FIXED_NOW` needs an offset; impossible values rejected | `fixedClockAndDeterminism.test.ts` |
| Türkiye date boundary (21:00 UTC = 00:00 TR) and weekday resolution | `mockConnectors.test.ts` |
| Departures strictly after "now", ascending, empty after the last one | `fixedClockAndDeterminism.test.ts`, `executionLogAndFaults.test.ts`, evidence TC-02 |

QA / traceability owners: Sefa (QA Plan TC-01/02/03/06, Test Results Report), Murat (traceability matrices, PR #25).

## 6. Hand-off text for other documents

* **Project Definition (data / constraints):** "All campus data in the prototype are synthetic and labelled as such; no
  official API was available. Live mode is an explicit unavailable placeholder." — plus the table of §3.
* **Design Document (connector sections):** runtime bootstrap `createConnectorRuntimeFromEnv`, Redis behaviour,
  execution log and the `CONNECTOR_FIXED_NOW` semantics from `packages/connectors/README.md` §3–§5.
* **QA Plan TC-06:** expected time of the first stale answer under an upstream *timeout* is ≈ 800 ms, not < 50 ms (see
  handover §5).
