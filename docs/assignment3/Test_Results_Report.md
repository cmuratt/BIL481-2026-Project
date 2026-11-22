# Test Results Report

**Campus Data Orchestrator — Model Context Protocol (MCP) Based Campus Data Orchestrator**

| Field | Detail |
| :--- | :--- |
| **Course** | BIL 481 Software Engineering, Fall 2026, TOBB University of Economics and Technology |
| **Assignment** | Project Assignment 3 — Deliverable 3: Test Results Report |
| **Group Name** | Group-ASYM |
| **Document Lead & Primary Author** | **Ahmet Sefa Efendioğlu** (241101066) — `@Sefa-Efendioglu` |
| **Document Version / Date** | **Version 0.9 (`AT-01`..`AT-03` PASS, `AT-04` Security/UI Steps Pass / Missing Local `GEMINI_API_KEY`, `NFR-01`/`NFR-02` Measured), 22 November 2026** |
| **Repository Filepath** | `docs/assignment3/Test_Results_Report.md` |
| **Tested Base Commit SHA** | `dev` @ `13f71d738a895c62d8e28293e0bf47d60b01e1d5` (`PR #44` `egress` fix & `PR #45` included) |
| **API Contract Version** | API Contract v1.1 (`docs/assignment3/contracts/API_CONTRACT.md`) |
| **Related Documents** | `docs/assignment3/Acceptance_Tests_and_Criteria.md` (v0.6), `docs/assignment3/Deployment_Plan.md` (v1.0), `docs/QA_Plan.md` (v1.4) |

> **Honest Reporting Principle:** All four code/deployment blockers from v0.3 (`M-02`..`M-08`, `M-13`, `A-02`, `Y-07`, and `compose.yaml` `egress`) are now **resolved and verified** against the live 4-service Docker Compose stack (`dev` @ `13f71d7`) using real Google Chrome (`Chrome/157.0.8103.79`). **`AT-01`, `AT-02`, and `AT-03` PASS** completely (`3 / 4`). **`AT-04` is honestly recorded as `BLOCKED`** (`1 / 4`): QA Lead Sefa verified Steps 1, 2, 3 (routing & prefill), 8, and 9 end-to-end (`sefa-security-checks.txt`), while Steps 4–7 (real Gemini browser streaming) remain blocked on this workstation solely because gitignored `.env` lacks `GEMINI_API_KEY` (`Contract §8 Q2`). Murat's clean 4-service Gemini curl run on `b0cc12d` (`PR #45`, `gateway-agent-gemini-compose-smoke.txt` v2) is linked strictly as supporting non-AT evidence.

---

## List of Contributors

| Member Name | Student ID | GitHub Account | Project Role | Contribution to this Document | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ahmet Sefa Efendioğlu** | 241101066 | `@Sefa-Efendioglu` | QA, Security & Release Lead | **Lead Author:** Executed Chrome CDP + 4-service Compose `AT-01`..`AT-03`, `AT-04` Steps 1/2/3/8/9, `compose-4service-egress-smoke.txt`, and `500`-request `NFR-01`/`NFR-02` benchmark; updated report (`v0.9`). | Completed (`v0.9`; final `v1.0` pending AT-04 Gemini browser run) |
| **Yunus Emre Biçer** | 241101009 | `@YunusEmre113` | Web Client & AT Lead | Defined `AT-01`..`AT-04` criteria (`v0.6`), delivered `/giris`, streaming chat UI (`Y-07`), and `Y-10` responsive fixes. | UI delivered; formal review pending |
| **Murat Can Işık** | 241101013 | `@cmuratt` | MCP Server & Agent Lead | Delivered MCP connector/agent stack (`PR #26`–`#40`) and clean 4-service Gemini curl supporting evidence (`PR #45`). | Code & curl evidence delivered (`PR #45`) |
| **Arda Çelik** | 241101065 | `@ardacelik11` | Connectors & Data Lead | Delivered live Redis connector runtime, `CONNECTOR_FIXED_NOW`, real Redis `7/7` script evidence, and `AT-01..03` recipes (`PR #30`, `#31`). | Data & Redis evidence delivered |

---

## Table of Contents

1. [Document-Specific Task Matrix](#document-specific-task-matrix)
2. [Test Results Overview (`AT-01`..`AT-04`)](#1-test-results-overview-at-01at-04)
   - 2.1 [Acceptance Test Execution Metadata](#11-acceptance-test-execution-metadata)
   - 2.2 [Acceptance Test Matrix (`AT-01`..`AT-04`)](#12-acceptance-test-matrix-at-01at-04)
   - 2.3 [Per-Test Execution Notes](#13-per-test-execution-notes)
3. [Supporting Verification Results (Non-Acceptance)](#2-supporting-verification-results-non-acceptance)
   - 3.1 [Monorepo Build & Automated Test Suite (Vitest — 366 Passed)](#21-monorepo-build--automated-test-suite-vitest--366-passed)
   - 3.2 [Gateway Stub Self-Test Harness (`--mode=stub-self-test`)](#22-gateway-stub-self-test-harness---modestub-self-test)
   - 3.3 [Live 4-Service Docker Compose Stack, Egress & Isolation Verification](#23-live-4-service-docker-compose-stack-egress--isolation-verification)
   - 3.4 [End-to-End Performance & Cache Efficiency Metrics (`NFR-01` / `NFR-02`)](#24-end-to-end-performance--cache-efficiency-metrics-nfr-01--nfr-02)
   - 3.5 [Teammate Supporting Evidence (Real Redis & Gemini Curl Trace)](#25-teammate-supporting-evidence-real-redis--gemini-curl-trace)
4. [Test Results Analysis](#3-test-results-analysis)
   - 4.1 [Blocker Closure & Single Remaining Item (`AT-04` Local Key)](#31-blocker-closure--single-remaining-item-at-04-local-key)
   - 4.2 [Known Scope Limits & Non-Acceptance Gaps (§7 Alignment)](#32-known-scope-limits--non-acceptance-gaps-7-alignment)
5. [Logs and Outputs](#4-logs-and-outputs)
6. [Change Record](#change-record)

---

## Document-Specific Task Matrix

| Task ID | Work Package Description | Assignee | Reviewer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-TRR-01** | Establish Test Results Report structure and `AT-01`..`AT-04` status matrix (`S-09`) | Ahmet Sefa Efendioğlu | Yunus Emre Biçer | **Completed** |
| **TSK-TRR-02** | Execute gateway unit, contract, Redis RESP, SSE proxy, and stub self-test verification (`S-10`, `S-11`) | Ahmet Sefa Efendioğlu | Entire Team | **Completed** (`33` files / `366` passed) |
| **TSK-TRR-03** | Analyze blocking dependencies across MCP, Connectors, Web, and Docker Compose (§3) | Ahmet Sefa Efendioğlu | Entire Team | **Completed** (all code blockers closed) |
| **TSK-TRR-04** | Deliver UC-01..UC-03 Redis/connector evidence (`PR #31`) & verify in 4-service Compose | Arda Çelik / Ahmet Sefa Efendioğlu | Ahmet Sefa Efendioğlu | **Completed & Verified (`AT-01`..`AT-03`)** |
| **TSK-TRR-05** | Collect UC-04 agent tool trace, Gemini synthesis, and PII interception evidence (`PR #39`, `#45`) | Murat Can Işık | Ahmet Sefa Efendioğlu | **Curl Supporting Evidence Done** (browser AT-04 pending key) |
| **TSK-TRR-06** | Collect browser screenshots, network captures, and mobile/desktop checks for `AT-01`..`AT-04` | Yunus Emre Biçer / Ahmet Sefa Efendioğlu | Entire Team | **Completed for `AT-01`..`AT-03` & `AT-04` Steps 1–3** (`14` PNGs saved) |
| **TSK-TRR-07** | Execute live E2E acceptance suite (`AT-01`..`AT-04`) and publish report (`S-07`, `S-09`) | Ahmet Sefa Efendioğlu | Entire Team | **`v0.9` Complete (`3/4 PASS`); `v1.0` awaiting local `GEMINI_API_KEY` for `AT-04`** |

---

## 1. Test Results Overview (`AT-01`..`AT-04`)

### 1.1 Acceptance Test Execution Metadata

| Field | Value |
| :--- | :--- |
| **Contract Version** | `API Contract v1.1` |
| **Tested Commit SHA** | `dev` @ `13f71d738a895c62d8e28293e0bf47d60b01e1d5` |
| **Environment** | `Windows_NT 10.0.26200 (x64)`, Node.js `v26.4.0`, Docker `29.9.3`, Docker Compose `v5.7.0`, Google Chrome `157.0.8103.79` (`1440×900` & `375×812`) |
| **Deployment Topology** | Full 4-service Compose (`redis:7-alpine`, `mcp-server`, `api-gateway`, `web` with `NEXT_PUBLIC_WEB_DATA_SOURCE=gateway`) |
| **Data Mode & Clock** | `MOCK` (`CONNECTOR_MOCK_SEED=481-FALL-2026`); `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00` (`22:30:00+03:00` for `AT-02` Step 8; `LIBRARY_CONNECTOR_MODE=live` for `AT-03` Step 7) |
| **Overall Acceptance Status** | **3 / 4 `PASS` (`AT-01`, `AT-02`, `AT-03`) — 1 / 4 `BLOCKED` (`AT-04` awaiting local `GEMINI_API_KEY`)** |

### 1.2 Acceptance Test Matrix (`AT-01`..`AT-04`)

| Test ID | Use Case | Run Timestamp (UTC) | Tested SHA | Expected Criteria | Actual Observed Result | Status | Evidence Directory |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: | :--- |
| **`AT-01`** | UC-01: View Cafeteria Menu | `2026-11-22T15:39:15Z` | `13f71d7` | `AC-01.1`..`AC-01.8` (Steps 1–9) | All mandatory checks met: direct path (`0` chat calls); `2026-11-23` `LIVE` (`1060 kcal` lunch / `770 kcal` dinner, all dishes/allergens matched, `Sentetik veri`); `Yenile` `CACHE_HIT` (`1` `upstreamCalled:true` for `cache:dining:2026-11-23`); `2026-11-22` weekend `available=false`; `2026-99-77` → `400 INVALID_PARAMS` (`0` connector executions); `375 px` viewport `scrollWidth=375 <= 375`. | **`PASS`** | [`docs/assignment3/evidence/AT-01/`](evidence/AT-01/README.md) |
| **`AT-02`** | UC-02: View Shuttle Schedule | `2026-11-22T15:39:39Z` | `13f71d7` | `AC-02.1`..`AC-02.7` (Steps 1–8) | All mandatory checks met: direct path (`0` chat calls); `MAIN_RING` future/ascending `["09:15","09:30","09:45"]`; `Yenile` `CACHE_HIT` (`1` `upstreamCalled:true`); `METRO_LINE` `["09:20","09:40","10:00"]` & `DORMITORY_LINE` `["09:15","09:45","10:15"]`; `NOWHERE` → `400 INVALID_PARAMS`; Step 8 restart at `22:30` → `DORMITORY_LINE` `[]` + *"Bugün bu hatta başka sefer yok."* | **`PASS`** | [`docs/assignment3/evidence/AT-02/`](evidence/AT-02/README.md) |
| **`AT-03`** | UC-03: View Library Occupancy | `2026-11-22T15:41:15Z` | `13f71d7` | `AC-03.1`..`AC-03.7` (Steps 1–7) | All mandatory checks met: direct path (`0` chat calls); `ALL` `LIVE` (`101/300 = %34`, 3 floors sum match, `isSimulated=true`); `FLOOR_3` isolated match (`31/80`); `ALL` `CACHE_HIT` (`1` `upstreamCalled:true`); Step 7 `LIBRARY_CONNECTOR_MODE=live` at `+83.4s` wall time → HTTP 200 `source=STALE`, `isStale=true`, `isSimulated=true`, original `timestamp=2026-11-23T06:00:06.922Z`, *"Bu bilgi güncel olmayabilir"* rendered, `"outcome":"STALE"` logged. | **`PASS`** | [`docs/assignment3/evidence/AT-03/`](evidence/AT-03/README.md) |
| **`AT-04`** | UC-04: Combined Course + Shuttle + Menu | `2026-11-22T15:41:20Z` | `13f71d7` | `AC-04.1`..`AC-04.12` | **Steps 1, 2, 3 (routing/prefill), 8, 9 PASS (`AC-04.1`, `.2`, `.3` partial, `.8`, `.9`):** guest schedule `401`, `/asistan` disabled for guest, `/giris` login → enabled, `COMPOUND_QUERY` → `/asistan` textarea prefilled, forged `X-Authenticated-Student-Id` stripped, host `:3001` `ECONNREFUSED`, expired & tampered JWT → `401` (`0` MCP calls). **Steps 4–7 & conditional 10 NOT RUN (`BLOCKED`)** on QA machine due to missing local `.env` `GEMINI_API_KEY`. | **`BLOCKED`** | [`docs/assignment3/evidence/AT-04/`](evidence/AT-04/README.md) |

### 1.3 Per-Test Execution Notes

- **Important Operational Finding (`AT-03` Step 7 & `CONNECTOR_FIXED_NOW`):** Recreating `mcp-server` with `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00` re-anchors the connector clock to `09:00:00` at container start (`packages/connectors/src/clock.ts`). When switching `LIBRARY_CONNECTOR_MODE=live`, waiting until `+83.4s` wall time (exceeding the restarted process's `09:00:00 + cachedOffset + 60 s` TTL while remaining inside Redis's physical `180 s` `3 × TTL` retention) cleanly triggered live Redis `STALE` fallback with original timestamp preserved.
- **`AT-04` Honest Status Separation:** Only steps executed end-to-end by QA Lead Sefa in the live browser + Compose stack are marked passed. Steps 4–7 (`AC-04.4`–`.7`, `AC-04.10`, `AC-04.11`) cannot be marked `PASS` until executed with a real `GEMINI_API_KEY` via the `/asistan` browser UI.

---

## 2. Supporting Verification Results (Non-Acceptance)

Per `Acceptance_Tests_and_Criteria.md §2.5`, automated suites, curl runs, and synthetic benchmarks provide **verification evidence only** and do not substitute for formal acceptance runs.

### 2.1 Monorepo Build & Automated Test Suite (Vitest — 366 Passed)

- **Command (`dev` @ `13f71d7` + `deploymentConfig.test.ts` egress update):** `npx vitest run`
- **Outcome:** **`33` test files passed (`33/33`), `366` tests passed, `8` skipped** (live `REDIS_TEST_URL` tests in `tests/connectors/redisIntegration.test.ts`, which pass `301/301` when run against local Redis 7.0.15 in Arda's Linux environment — `PR #31`).

| Workspace | Files | Passed | Skipped | Key Verified Scopes |
| :--- | :---: | :---: | :---: | :--- |
| `apps/api-gateway/tests/` | 5 | 25 | 0 | JWT/token termination, MCP proxy, SSE proxy, Redis RESP2 rate limiter, 3-network `compose.yaml` security audit |
| `apps/web/tests/` | 11 | 150 | 0 | Bilingual intent router + heldout benchmark, gateway client, auth/session store, SSE parser, chat client & UI state |
| `tests/mcp-server/` | 7 | 95 | 0 | Dispatcher, connector HTTP adapter, SSE session, `AgentOrchestrator`, Gemini provider, PII scrubber, `/internal/agent/stream` |
| `tests/connectors/` | 10 | 96 | 8 | Fixed clock, mock determinism, Redis/memory stores, fault injection, circuit breaker, contract fixtures (`8` live Redis skipped offline) |
| **Total** | **33** | **366** | **8** | **Zero failures** |

### 2.2 Gateway Stub Self-Test Harness (`--mode=stub-self-test`)

- **Command:** `node apps/api-gateway/scripts/run-acceptance-harness.mjs --mode=stub-self-test`
- **Outcome:** **`12 / 12` assertions passed (`STUB_SELF_TEST_PASSED`)** against in-process fake MCP/Agent servers, confirming `0` raw `Authorization` headers across `6` downstream requests.

### 2.3 Live 4-Service Docker Compose Stack, Egress & Isolation Verification

Executed prior to opening `PR #44` (`compose-4service-egress-smoke.txt`, `2026-11-22T13:19:54Z`) and re-verified on `13f71d7` during acceptance runs:

- All 4 containers (`redis`, `mcp-server`, `api-gateway`, `web`) reached Docker `healthy`.
- Outbound HTTPS access via `mcp-server`-only `egress` bridge: `generativelanguage.googleapis.com:443 -> EGRESS_OK:172.217.112.4:TLSv1.3`.
- Strict `S-06` isolation: `redis` on `internal` only (`{"6379/tcp":null}`), `mcp-server` on `internal` + `egress` (`{"3001/tcp":null}`), `web` on `edge` only; host `:3001` refused; `web -> mcp-server:3001` & `web -> redis:6379` `BLOCKED:TIMEOUT`.
- Live Redis rate limiting via `:3002`: `30 × 200`, 31st → `429 RATE_LIMITED` (`Retry-After=60s`), `redis-cli ZCARD` = `30`.

### 2.4 End-to-End Performance & Cache Efficiency Metrics (`NFR-01` / `NFR-02`)

Measured against the live 4-service Docker Compose stack (`api-gateway → mcp-server → redis`) at `2026-11-22T15:41:22Z` (`nfr-e2e-latency-cache-benchmark.txt`):

| Metric | Measurement Protocol | Observed Value | NFR Target | Result |
| :--- | :--- | :---: | :---: | :---: |
| **Throughput / Volume** | `20` concurrent authenticated virtual students × `25` requests (`500` total, under `30 req/60s` limit; burst `869.9 ms`, not 5-min soak) | `500 / 500` HTTP `200` (`574.8 req/s`, `0` errors) | — | Recorded |
| **Cache Hit Ratio (`NFR-02`)** | Cold cache start across `get_cafeteria_menu`, `get_shuttle_schedule`, `get_library_occupancy` | **`99.4%`** (`497` `CACHE_HIT`, `3` `LIVE`) | `≥ 90%` | **PASS** |
| **Cached Latency (`NFR-01`)** | End-to-end HTTP round-trip across `api-gateway → mcp-server → redis` (`497` cached hits) | **`p95 = 44.41 ms`** (`min 21.52`, `p50 32.21`, `p99 68.27`, `max 84.62 ms`) | `< 250 ms` | **PASS** |
| **Overall Latency (`NFR-01`)** | All `500` requests (`LIVE` + `CACHE_HIT`) | **`p95 = 44.26 ms`** (`min 20.45`, `p50 32.19`, `max 84.62 ms`) | `< 250 ms` | **PASS** |

### 2.5 Teammate Supporting Evidence (Real Redis & Gemini Curl Trace)

- **Real Redis Connector Script (`Arda`, `PR #31`):** `connector-evidence.mjs` passed `7/7` against Redis `7.0.15` (`98.7%` simulated hit ratio, `< 1 ms` cache path); detailed in [`connector-tier-real-redis.txt`](evidence/connectors/connector-tier-real-redis.txt).
- **Clean 4-Service Gemini Curl Trace (`Murat`, `PR #45`):** After `PR #44` landed, Murat executed `POST /api/v1/chat/stream` with real `gemini-3.5-flash-lite` over the committed `compose.yaml` (`b0cc12d`), observing `3` `tool` events, `24`/`22` `token` frames, `done`, `6` `[agent-tool]` log lines, and **`0` occurrences of student ID, raw JWT, or API key** in `mcp-server` logs ([`gateway-agent-gemini-compose-smoke.txt`](evidence/AT-04/gateway-agent-gemini-compose-smoke.txt)). *(Not counted as formal `AT-04` PASS because it ran via curl, not the browser UI by QA.)*

---

## 3. Test Results Analysis

### 3.1 Blocker Closure & Single Remaining Item (`AT-04` Local Key)

| Item / Blocker ID | Status | Resolution Summary |
| :--- | :---: | :--- |
| **`BLK-MCP-RUNTIME`** | **Resolved** | `PR #26` wired Arda's connector runtime and contract §3.2 metadata into `apps/mcp-server`; verified in `AT-01`..`AT-03`. |
| **`BLK-REDIS-WIRING`** | **Resolved** | `PR #30` / `#31` wired Redis cache + `CONNECTOR_FIXED_NOW`; verified in Compose (`AT-01..03` + `NFR-02`). |
| **`BLK-AGENT-STREAM`** | **Resolved** | `PR #29`, `#34`, `#35`, `#36`, `#39` implemented `AgentOrchestrator`, Gemini adapter, PII scrubber, and `/internal/agent/stream`. |
| **`BLK-WEB-CHAT-UI`** | **Resolved** | `PR #18`, `#20`, `#32`, `#33` delivered standalone Docker, `/giris` login, and `/asistan` streaming chat UI. |
| **`BLK-MCP-DOCKER` & `BLK-COMPOSE-EGRESS`** | **Resolved** | `PR #28` added MCP Dockerfile; `PR #44` (Sefa) added `mcp-server`-only `egress` network & `GEMINI_MODEL`. Verified in `compose-4service-egress-smoke.txt` and `PR #45`. |
| **`BLK-AT04-GEMINI-KEY` *(Open)*** | **Open (Env Only)** | Gitignored `.env` on QA workstation lacks `GEMINI_API_KEY` (`Contract §8 Q2`). Adding the key and executing `AT-04` Steps 4–7 in Chrome unblocks `AT-04` → `4/4 PASS`. |

### 3.2 Known Scope Limits & Non-Acceptance Gaps (§7 Alignment)

- **FR-18 Card D (Connector Health Panel):** Deferred by team agreement (`19 Nov 2026`); not tested by `AT-01..AT-03`.
- **MCP `tools/call` Content Type (`M-09`):** `mcp-server` returns `"type": "json"` (contract §4); standard MCP Inspector rejects `tools/call` (`Invalid tools/call result`) while accepting `tools/list`. Planned post-demo.
- **Usability Survey (`NFR-06`):** `AC-01.8` (guest landing access + 375 px mobile responsiveness) passed in `AT-01`; empirical 5-student SUS questionnaire (`SUS ≥ 70`) was not conducted.

---

## 4. Logs and Outputs

- **Official Acceptance Records & Evidence:**
  - `AT-01` (**PASS**): [`evidence/AT-01/README.md`](evidence/AT-01/README.md), [`network-and-logs.txt`](evidence/AT-01/network-and-logs.txt), PNG captures (`step2-router.png`, `step3-weekday-menu.png`, `step7-weekend-menu.png`, `step9-mobile-375px.png`)
  - `AT-02` (**PASS**): [`evidence/AT-02/README.md`](evidence/AT-02/README.md), [`network-and-logs.txt`](evidence/AT-02/network-and-logs.txt), PNG captures (`step1-router.png`, `step3-main-ring.png`, `step6-routes.png`, `step8-end-of-service.png`)
  - `AT-03` (**PASS**): [`evidence/AT-03/README.md`](evidence/AT-03/README.md), [`network-and-logs.txt`](evidence/AT-03/network-and-logs.txt), PNG captures (`step3-all-floors.png`, `step5-floor3.png`, `step7-stale-fallback.png`)
  - `AT-04` (**BLOCKED — Security/UI Steps Passed, Gemini Browser Steps Pending Key**): [`evidence/AT-04/README.md`](evidence/AT-04/README.md), [`sefa-security-checks.txt`](evidence/AT-04/sefa-security-checks.txt), PNG captures (`step1-guest-guard.png`, `step2-logged-in-assistant.png`, `step3-router-prefill.png`); supporting PR #45 curl trace: [`gateway-agent-gemini-compose-smoke.txt`](evidence/AT-04/gateway-agent-gemini-compose-smoke.txt)
- **Deployment, Security & Benchmark Logs:**
  - [`evidence/deployment/compose-4service-egress-smoke.txt`](evidence/deployment/compose-4service-egress-smoke.txt)
  - [`evidence/deployment/nfr-e2e-latency-cache-benchmark.txt`](evidence/deployment/nfr-e2e-latency-cache-benchmark.txt)
  - [`evidence/deployment/compose-3service-smoke.txt`](evidence/deployment/compose-3service-smoke.txt)
  - [`evidence/deployment/gateway-docker-redis-smoke.txt`](evidence/deployment/gateway-docker-redis-smoke.txt)
  - [`evidence/security/gateway-unit-contract-tests.txt`](evidence/security/gateway-unit-contract-tests.txt)

---

## Change Record

| Version | Date | Updated Section | Description of Changes | Updated By |
| :--- | :--- | :--- | :--- | :--- |
| **0.1** | 20 Nov 2026 | All | Created initial Test Results Report (`NOT RUN (BLOCKED)` baseline + 217 Vitest + stub self-test). | Ahmet Sefa Efendioğlu |
| **0.2** | 20 Nov 2026 | §1.1, §2.3, §3.1, §4 | Added containerized `api-gateway` + `redis:7-alpine` smoke results (`gateway-docker-redis-smoke.txt`). | Ahmet Sefa Efendioğlu |
| **0.3** | 20 Nov 2026 | §1.1, §1.2, §2.1, §2.3, §3, §4 | Updated Vitest to 230/230 and added 3-service Compose smoke (`compose-3service-smoke.txt`). | Ahmet Sefa Efendioğlu |
| **0.9** | 22 Nov 2026 | All (`dev` @ `13f71d7`) | Closed all code/Compose blockers; recorded real Chrome + 4-service Compose execution results: **`AT-01..AT-03 PASS`**, **`AT-04` security/UI steps passed & Gemini stream `BLOCKED`** (awaiting local `.env` `GEMINI_API_KEY`; PR #45 curl linked as supporting evidence), `33` Vitest files / `366` passed, and `NFR-01`/`NFR-02` 500-req benchmark (`99.4%` hit ratio, `44.41 ms` cached P95). | Ahmet Sefa Efendioğlu |
