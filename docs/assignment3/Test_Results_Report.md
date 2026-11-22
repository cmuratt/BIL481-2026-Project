# Test Results Report

**Campus Data Orchestrator — Model Context Protocol (MCP) Based Campus Data Orchestrator**

| Field | Detail |
| :--- | :--- |
| **Course** | BIL 481 Software Engineering, Fall 2026, TOBB University of Economics and Technology |
| **Assignment** | Project Assignment 3 — Deliverable 3: Test Results Report |
| **Group Name** | Group-ASYM |
| **Document Lead & Primary Author** | **Ahmet Sefa Efendioğlu** (241101066) — `@Sefa-Efendioglu` |
| **Document Version / Date** | **Version 1.1 (`AT-01`..`AT-04` All 4/4 `PASS` — AT-04 Run 2 on `v0.7` Tuesday 12:10 Clock + `PR #48` Markdown Fix + `NFR-01`/`NFR-02`), 22 November 2026** |
| **Repository Filepath** | `docs/assignment3/Test_Results_Report.md` |
| **Tested Commit SHAs** | Code baseline `dev` @ `13f71d738a895c62d8e28293e0bf47d60b01e1d5` (`AT-01`..`AT-03`, `NFR-01/02`); `dev` @ `2bd45ce` / branch SHA `61af2b038e53738adb089df254c7bc895df6eea3` (`AT-04` Run 2 & `--mode=smoke` after `PR #48` & `PR #49`) |
| **API Contract Version** | API Contract v1.1 (`docs/assignment3/contracts/API_CONTRACT.md`) |
| **Related Documents** | `docs/assignment3/Acceptance_Tests_and_Criteria.md` (v0.7), `docs/assignment3/Deployment_Plan.md` (v1.3), `docs/QA_Plan.md` (v1.6) |

> **Final Verification Summary (v1.1):** All codebase/deployment blockers are resolved and all four official acceptance tests (**`AT-01`, `AT-02`, `AT-03`, `AT-04` — `4 / 4 PASS`**) passed end-to-end against the live 4-service Docker Compose stack (`redis`, `mcp-server`, `api-gateway`, `web` with `NEXT_PUBLIC_WEB_DATA_SOURCE=gateway`) in real Google Chrome (`Chrome/157.0.8103.79`). Following Run 1's `AC-04.6` Monday-09:00 test-data mismatch and raw `**` Markdown display (fixed by Yunus in `PR #48` & `PR #49` v0.7), `AT-04` Run 2 passed on Tuesday `2026-11-24T12:10:00+03:00` with real Google Gemini (`provider="gemini"`, `isFake=false`), formatted light Markdown, and zero PII/placeholder/JWT/key leaks. Automated Vitest suites (`34/34` files, `373` passed / `8` real-Redis skipped offline) and `NFR-01`/`NFR-02` benchmarks are reported separately in Section 2 as supporting verification.

---

## List of Contributors

| Member Name | Student ID | GitHub Account | Project Role | Contribution to this Document | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ahmet Sefa Efendioğlu** | 241101066 | `@Sefa-Efendioglu` | QA, Security & Release Lead | **Lead Author:** Executed Chrome CDP + 4-service Compose `AT-01`..`AT-04` (incl. Run 2 real Gemini `AT-04` on `v0.7`), `--mode=smoke`, `compose-4service-egress-smoke.txt`, and `500`-request `NFR-01`/`NFR-02` benchmark; authored **v1.1**. | **Completed (v1.1)** |
| **Yunus Emre Biçer** | 241101009 | `@YunusEmre113` | Web Client & AT Lead | Defined `AT-01`..`AT-04` criteria (`v0.6` / `v0.7`, `PR #49`), delivered `/giris`, streaming chat UI (`Y-07`), light Markdown rendering (`PR #48`), and `Y-10` fixes. | Completed & Verified in E2E |
| **Murat Can Işık** | 241101013 | `@cmuratt` | MCP Server & Agent Lead | Delivered MCP connector/agent stack (`PR #26`–`#40`), Gemini key coordination (`§8 Q2`), and supporting curl evidence (`PR #45`). | Completed & Verified in E2E |
| **Arda Çelik** | 241101065 | `@ardacelik11` | Connectors & Data Lead | Delivered live Redis connector runtime, `CONNECTOR_FIXED_NOW`, real Redis `7/7` script evidence, and `AT-01..03` recipes (`PR #30`, `#31`). | Completed & Verified in E2E |

---

## Table of Contents

1. [Document-Specific Task Matrix](#document-specific-task-matrix)
2. [Test Results Overview (`AT-01`..`AT-04`)](#1-test-results-overview-at-01at-04)
   - 2.1 [Acceptance Test Execution Metadata](#11-acceptance-test-execution-metadata)
   - 2.2 [Acceptance Test Matrix (`AT-01`..`AT-04`)](#12-acceptance-test-matrix-at-01at-04)
   - 2.3 [Per-Test Execution Notes](#13-per-test-execution-notes)
3. [Supporting Verification Results (Non-Acceptance)](#2-supporting-verification-results-non-acceptance)
   - 3.1 [Monorepo Build & Automated Test Suite (Vitest — 373 Passed)](#21-monorepo-build--automated-test-suite-vitest--373-passed)
   - 3.2 [Gateway Stub Self-Test & Live Compose Smoke Harness (`S-07`)](#22-gateway-stub-self-test--live-compose-smoke-harness-s-07)
   - 3.3 [Live 4-Service Docker Compose Stack, Egress & Isolation Verification](#23-live-4-service-docker-compose-stack-egress--isolation-verification)
   - 3.4 [End-to-End Performance & Cache Efficiency Metrics (`NFR-01` / `NFR-02`)](#24-end-to-end-performance--cache-efficiency-metrics-nfr-01--nfr-02)
   - 3.5 [Teammate Supporting Evidence (Real Redis & Gemini Curl Trace)](#25-teammate-supporting-evidence-real-redis--gemini-curl-trace)
4. [Test Results Analysis](#3-test-results-analysis)
   - 4.1 [Blocker Resolution Summary (All Closed)](#31-blocker-resolution-summary-all-closed)
   - 4.2 [Known Scope Limits & Non-Acceptance Gaps (§7 Alignment)](#32-known-scope-limits--non-acceptance-gaps-7-alignment)
5. [Logs and Outputs](#4-logs-and-outputs)
6. [Change Record](#change-record)

---

## Document-Specific Task Matrix

| Task ID | Work Package Description | Assignee | Reviewer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-TRR-01** | Establish Test Results Report structure and `AT-01`..`AT-04` status matrix (`S-09`) | Ahmet Sefa Efendioğlu | Yunus Emre Biçer | **Completed** |
| **TSK-TRR-02** | Execute gateway unit, contract, Redis RESP, SSE proxy, and stub/live smoke verification (`S-10`, `S-11`) | Ahmet Sefa Efendioğlu | Entire Team | **Completed** (`34` files / `373` passed; `--mode=smoke` `11/11` PASS) |
| **TSK-TRR-03** | Track and verify closure of all blocking dependencies across MCP, Connectors, Web, and Compose (§3) | Ahmet Sefa Efendioğlu | Entire Team | **Completed** (0 open blockers) |
| **TSK-TRR-04** | Deliver UC-01..UC-03 Redis/connector evidence (`PR #31`) & verify in 4-service Compose | Arda Çelik / Ahmet Sefa Efendioğlu | Ahmet Sefa Efendioğlu | **Completed & Verified (`AT-01`..`AT-03`)** |
| **TSK-TRR-05** | Collect UC-04 agent tool trace, Gemini synthesis, and PII interception evidence | Murat Can Işık / Ahmet Sefa Efendioğlu | Ahmet Sefa Efendioğlu | **Completed & Verified (`AT-04` Run 2 Chrome + `PR #45`)** |
| **TSK-TRR-06** | Collect browser screenshots, network captures, and mobile/desktop checks for `AT-01`..`AT-04` | Yunus Emre Biçer / Ahmet Sefa Efendioğlu | Entire Team | **Completed (`16` PNGs saved)** |
| **TSK-TRR-07** | Execute full live E2E acceptance suite (`AT-01`..`AT-04`) and publish final report (`S-07`, `S-09`) | Ahmet Sefa Efendioğlu | Entire Team | **Completed (`v1.1` — `4 / 4 PASS`)** |

---

## 1. Test Results Overview (`AT-01`..`AT-04`)

### 1.1 Acceptance Test Execution Metadata

| Field | Value |
| :--- | :--- |
| **Contract Version** | `API Contract v1.1` |
| **Tested Commit SHAs** | `13f71d738a895c62d8e28293e0bf47d60b01e1d5` (`AT-01`..`AT-03`, `NFR-01/02`) & `2bd45ce` / `61af2b038e53738adb089df254c7bc895df6eea3` (`AT-04` Run 2 & `--mode=smoke` after `PR #48` & `PR #49`) |
| **Environment** | `Windows_NT 10.0.26200 (x64)`, Node.js `v26.4.0`, Docker `29.9.3`, Docker Compose `v5.7.0`, Google Chrome `157.0.8103.79` (`1440×900` & `375×812`) |
| **Deployment Topology** | Full 4-service Compose (`redis:7-alpine`, `mcp-server`, `api-gateway`, `web` with `NEXT_PUBLIC_WEB_DATA_SOURCE=gateway`) |
| **Data Mode & Clock** | `MOCK` (`CONNECTOR_MOCK_SEED=481-FALL-2026`); `AT-01..03`: `2026-11-23T09:00:00+03:00` (`22:30:00+03:00` for `AT-02` Step 8; `LIBRARY_CONNECTOR_MODE=live` for `AT-03` Step 7); **`AT-04` Run 2:** `2026-11-24T12:10:00+03:00` (Tuesday `BIL 452` `10:30–12:20`, shuttles `12:15/12:30/12:45` per AT `v0.7`) |
| **LLM Provider (`AT-04`)** | Real Google Gemini API (`provider="gemini"`, `isFake=false`, `GEMINI_MODEL=gemini-3.5-flash-lite`) via gitignored local `.env` |
| **Overall Acceptance Status** | **`4 / 4 PASS` (`AT-01`, `AT-02`, `AT-03`, `AT-04` Run 2)** |

### 1.2 Acceptance Test Matrix (`AT-01`..`AT-04`)

| Test ID | Use Case | Run Timestamp (UTC) | Tested SHA | Expected Criteria | Actual Observed Result | Status | Evidence Directory |
| :--- | :--- | :---: | :---: | :--- | :--- | :---: | :--- |
| **`AT-01`** | UC-01: View Cafeteria Menu | `2026-11-22T15:39:15Z` | `13f71d7` | `AC-01.1`..`AC-01.8` (Steps 1–9) | All mandatory checks met: direct path (`0` chat calls); `2026-11-23` `LIVE` (`1060 kcal` lunch / `770 kcal` dinner, all dishes/allergens matched, `Sentetik veri`); `Yenile` `CACHE_HIT` (`1` `upstreamCalled:true` for `cache:dining:2026-11-23`); `2026-11-22` weekend `available=false`; `2026-99-77` → `400 INVALID_PARAMS` (`0` connector executions); `375 px` viewport `scrollWidth=375 <= 375`. | **`PASS`** | [`docs/assignment3/evidence/AT-01/`](evidence/AT-01/README.md) |
| **`AT-02`** | UC-02: View Shuttle Schedule | `2026-11-22T15:39:39Z` | `13f71d7` | `AC-02.1`..`AC-02.7` (Steps 1–8) | All mandatory checks met: direct path (`0` chat calls); `MAIN_RING` future/ascending `["09:15","09:30","09:45"]`; `Yenile` `CACHE_HIT` (`1` `upstreamCalled:true`); `METRO_LINE` `["09:20","09:40","10:00"]` & `DORMITORY_LINE` `["09:15","09:45","10:15"]`; `NOWHERE` → `400 INVALID_PARAMS`; Step 8 restart at `22:30` → `DORMITORY_LINE` `[]` + *"Bugün bu hatta başka sefer yok."* | **`PASS`** | [`docs/assignment3/evidence/AT-02/`](evidence/AT-02/README.md) |
| **`AT-03`** | UC-03: View Library Occupancy | `2026-11-22T15:41:15Z` | `13f71d7` | `AC-03.1`..`AC-03.7` (Steps 1–7) | All mandatory checks met: direct path (`0` chat calls); `ALL` `LIVE` (`101/300 = %34`, 3 floors sum match, `isSimulated=true`); `FLOOR_3` isolated match (`31/80`); `ALL` `CACHE_HIT` (`1` `upstreamCalled:true`); Step 7 `LIBRARY_CONNECTOR_MODE=live` at `+83.4s` wall time → HTTP 200 `source=STALE`, `isStale=true`, `isSimulated=true`, original `timestamp=2026-11-23T06:00:06.922Z`, *"Bu bilgi güncel olmayabilir"* rendered, `"outcome":"STALE"` logged. | **`PASS`** | [`docs/assignment3/evidence/AT-03/`](evidence/AT-03/README.md) |
| **`AT-04`** *(Run 2)* | UC-04: Combined Course + Shuttle + Menu | `2026-11-22T16:39:46Z` | `61af2b0` (`2bd45ce`) | `AC-04.1`..`AC-04.12` (AT `v0.7`, Steps 1–9 + cond. 10) | **All mandatory criteria (`AC-04.1`..`AC-04.11`) met:** guest `401`, login → `/asistan` enabled, `COMPOUND_QUERY` decision screenshot (`step3-router-decision.png`: *"Asistana yönlendirilecek"*) → `/asistan` prefill (`step3-router-prefill.png`), live Chrome click `"Gönder"` → `POST /api/v1/chat/stream` HTTP 200 (`3` `tool`, `21` `token`, `1` `done` in `13,526 ms`, `3` UI badges: `"Ders programı Yeni sorgu · 5 ms"`, `"Ring seferleri Önbellekten · 4 ms"`, `"Yemekhane menüsü Yeni sorgu · 3 ms"`), light Markdown rendered (`strongElements=2`, `0` raw `**` asterisks in DOM), `3` `[agent-tool]` lines with `0` identity args & `0` PII placeholders, `done.answer` accurately cites `12:20` class end, states `12:30` shuttle catchable (without claiming `12:15` is catchable), lists Tuesday `2026-11-24` dishes (*Tavuk Sote / Izgara Tavuk Baget*), and discloses synthetic data; `provider="gemini"` `isFake=false` with `0` raw JWT/API key/PII leaks; forged `X-Authenticated-Student-Id` stripped on `TUESDAY` query & chat; host `:3001` `ECONNREFUSED`; expired/tampered JWT → `401` (`0` MCP calls); Step 10 `>5 s` slow notice rendered (`13,526 ms >= 5,000 ms`). *(See §1.3 for Run 1 `FAIL` audit trail.)* | **`PASS`** | [`docs/assignment3/evidence/AT-04/`](evidence/AT-04/README.md) |

### 1.3 Per-Test Execution Notes

- **`AT-04` Run 1 → Run 2 Audit Trail (`AC-04.6` & `PR #48`/`#49`):**
  - **Run 1 (`2026-11-22T16:02:30Z`, SHA `18d2e30`, `Acceptance_Tests_and_Criteria.md` v0.6):** Executed on Monday `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00`. Because `demo-student-01` has no Monday `10:30` class (only `13:30–15:20` BIL 441) and `get_shuttle_schedule` returned `09:15–09:45`, the run **failed `AC-04.6` (`FAIL`)** on scenario/shuttle fit, and raw `**` Markdown markers appeared in the chat UI (`7,664 ms`).
  - **Resolution (`PR #48` & `PR #49`):** Yunus Emre Biçer implemented light Markdown formatting (`AnswerText.tsx`, `answerFormat.ts`, `PR #48`) and pinned `AT-04` to Tuesday `CONNECTOR_FIXED_NOW=2026-11-24T12:10:00+03:00` (`BIL 452` `10:30–12:20`, shuttles `12:15`/`12:30`/`12:45`, agent-tool log + PII-placeholder `AC-04.5` & strict `AC-04.6 (b)`, `PR #49` v0.7), enabling **Run 2 (`PASS`)** above with the rebuilt `web` container.
- **`AT-03` Step 7 (`CONNECTOR_FIXED_NOW` Operational Behavior):** Recreating `mcp-server` with `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00` re-anchors the connector clock to `09:00:00` at container start. Waiting `+83.4 s` wall time (exceeding the restarted process's `60 s` TTL while remaining inside Redis's physical `180 s` `3 × TTL` retention) cleanly triggered live Redis `STALE` fallback with original cache timestamp preserved.
- **`AT-04` Run 2 Step 10 Conditional (`AC-04.12`):** Because Run 2 Gemini generation + synthesis completed in `13,526 ms` (`≥ 5,000 ms`, `< 20,000 ms`), Chrome displayed the *"Hâlâ işleniyor; cevap biraz zaman alabilir."* slow indicator before delivering the complete answer (`slow notice rendered=true`). The `20 s` cancellation path did not trigger on this healthy run (verified separately in `apps/web/tests/chatStreamClient.test.ts` and `chatStreamProxy.test.ts`).

---

## 2. Supporting Verification Results (Non-Acceptance)

Per `Acceptance_Tests_and_Criteria.md §2.5`, automated suites, harness checks, curl runs, and synthetic benchmarks provide **verification evidence** complementing the formal `AT-01..AT-04` runs above.

### 2.1 Monorepo Build & Automated Test Suite (Vitest — 373 Passed)

- **Command:** `npx vitest run`
- **Outcome:** **`34` test files passed (`34/34`), `373` tests passed, `8` skipped** (live `REDIS_TEST_URL` tests in `tests/connectors/redisIntegration.test.ts`, which pass `301/301` when run against local Redis 7.0.15 — `PR #31`).

| Workspace | Files | Passed | Skipped | Key Verified Scopes |
| :--- | :---: | :---: | :---: | :--- |
| `apps/api-gateway/tests/` | 5 | 25 | 0 | JWT/token termination, MCP proxy, SSE proxy, Redis RESP2 rate limiter, 3-network `compose.yaml` security audit |
| `apps/web/tests/` | 12 | 157 | 0 | Bilingual intent router + heldout benchmark (`100%`), answer Markdown parser (`answerFormat.test.ts`), gateway client, auth/session store, SSE parser, chat client & UI state |
| `tests/mcp-server/` | 7 | 95 | 0 | Dispatcher, connector HTTP adapter, SSE session, `AgentOrchestrator`, Gemini provider, PII scrubber, `/internal/agent/stream` |
| `tests/connectors/` | 10 | 96 | 8 | Fixed clock, mock determinism, Redis/memory stores, fault injection, circuit breaker, contract fixtures (`8` live Redis skipped offline) |
| **Total** | **34** | **373** | **8** | **Zero failures** |

### 2.2 Gateway Stub Self-Test & Live Compose Smoke Harness (`S-07`)

- **Stub Self-Test (`--mode=stub-self-test`):** **`12 / 12` assertions passed (`STUB_SELF_TEST_PASSED`)** against in-process fake MCP/Agent servers (`0` raw `Authorization` headers across `6` downstream requests).
- **Live Compose Harness (`GATEWAY_URL=http://127.0.0.1:3000 node apps/api-gateway/scripts/run-acceptance-harness.mjs --mode=smoke`):** **`11 / 11` live checks passed (`2026-11-22T16:39:48Z`, [`gateway-live-smoke.txt`](evidence/deployment/gateway-live-smoke.txt))**, verifying `/health`, public cached queries (`UC-01`..`UC-03`), `400 INVALID_PARAMS`, guest `401` denials, `mock-login`, `studentId` injection rejection, personal course schedule, and real Gemini SSE chat (`1886 bytes` of SSE frames).

### 2.3 Live 4-Service Docker Compose Stack, Egress & Isolation Verification

Verified in [`compose-4service-egress-smoke.txt`](evidence/deployment/compose-4service-egress-smoke.txt) (`2026-11-22T13:19:54Z`) and re-verified on `13f71d7`/`18d2e30`:

- All 4 containers (`redis`, `mcp-server`, `api-gateway`, `web`) reached Docker `healthy`.
- Outbound HTTPS access via `mcp-server`-only `egress` bridge: `generativelanguage.googleapis.com:443 -> EGRESS_OK:172.217.112.4:TLSv1.3`.
- Strict `S-06` isolation: `redis` on `internal` only (`{"6379/tcp":null}`), `mcp-server` on `internal` + `egress` (`{"3001/tcp":null}`), `web` on `edge` only; host `:3001` refused; `web -> mcp-server:3001` & `web -> redis:6379` `BLOCKED:TIMEOUT`.
- Live Redis rate limiting via `:3002`: `30 × 200`, 31st → `429 RATE_LIMITED` (`Retry-After=60s`), `redis-cli ZCARD` = `30`.

### 2.4 End-to-End Performance & Cache Efficiency Metrics (`NFR-01` / `NFR-02`)

Measured against the live 4-service Docker Compose stack (`api-gateway → mcp-server → redis`) at `2026-11-22T15:41:22Z` ([`nfr-e2e-latency-cache-benchmark.txt`](evidence/deployment/nfr-e2e-latency-cache-benchmark.txt)):

| Metric | Measurement Protocol | Observed Value | NFR Target | Result |
| :--- | :--- | :---: | :---: | :---: |
| **Throughput / Volume** | `20` concurrent authenticated virtual students × `25` requests (`500` total, under `30 req/60s` limit; burst `869.9 ms`, not 5-min soak) | `500 / 500` HTTP `200` (`574.8 req/s`, `0` errors) | — | Recorded |
| **Cache Hit Ratio (`NFR-02`)** | Cold cache start across `get_cafeteria_menu`, `get_shuttle_schedule`, `get_library_occupancy` | **`99.4%`** (`497` `CACHE_HIT`, `3` `LIVE`) | `≥ 90%` | **PASS** |
| **Cached Latency (`NFR-01`)** | End-to-end HTTP round-trip across `api-gateway → mcp-server → redis` (`497` cached hits) | **`p95 = 44.41 ms`** (`min 21.52`, `p50 32.21`, `p99 68.27`, `max 84.62 ms`) | `< 250 ms` | **PASS** |
| **Overall Latency (`NFR-01`)** | All `500` requests (`LIVE` + `CACHE_HIT`) | **`p95 = 44.26 ms`** (`min 20.45`, `p50 32.19`, `max 84.62 ms`) | `< 250 ms` | **PASS** |

### 2.5 Teammate Supporting Evidence (Real Redis & Gemini Curl Trace)

- **Real Redis Connector Script (`Arda`, `PR #31`):** `connector-evidence.mjs` passed `7/7` against Redis `7.0.15` (`98.7%` simulated hit ratio, `< 1 ms` cache path); detailed in [`connector-tier-real-redis.txt`](evidence/connectors/connector-tier-real-redis.txt).
- **Clean 4-Service Gemini Curl Trace (`Murat`, `PR #45`):** After `PR #44`, Murat executed `POST /api/v1/chat/stream` with real `gemini-3.5-flash-lite` over committed `compose.yaml` (`b0cc12d`), observing `3` `tool` events, `24`/`22` `token` frames, `done`, `6` `[agent-tool]` log lines, and `0` PII/JWT/key leaks ([`gateway-agent-gemini-compose-smoke.txt`](evidence/AT-04/gateway-agent-gemini-compose-smoke.txt)).

---

## 3. Test Results Analysis

### 3.1 Blocker Resolution Summary (All Closed)

| Item / Blocker ID | Status | Resolution Summary |
| :--- | :---: | :--- |
| **`BLK-MCP-RUNTIME`** | **Resolved** | `PR #26` wired Arda's connector runtime and contract §3.2 metadata into `apps/mcp-server`; verified in `AT-01`..`AT-03`. |
| **`BLK-REDIS-WIRING`** | **Resolved** | `PR #30` / `#31` wired Redis cache + `CONNECTOR_FIXED_NOW`; verified in Compose (`AT-01..03` + `NFR-02`). |
| **`BLK-AGENT-STREAM`** | **Resolved** | `PR #29`, `#34`, `#35`, `#36`, `#39` implemented `AgentOrchestrator`, Gemini adapter, PII scrubber, and `/internal/agent/stream`. |
| **`BLK-WEB-CHAT-UI`** | **Resolved** | `PR #18`, `#20`, `#32`, `#33` delivered standalone Docker, `/giris` login, and `/asistan` streaming chat UI. |
| **`BLK-MCP-DOCKER` & `BLK-COMPOSE-EGRESS`** | **Resolved** | `PR #28` added MCP Dockerfile; `PR #44` (Sefa) added `mcp-server`-only `egress` network & `GEMINI_MODEL`. Verified in `compose-4service-egress-smoke.txt` and `PR #45`. |
| **`BLK-AT04-GEMINI-KEY`** | **Resolved** | Real `GEMINI_API_KEY` configured in local gitignored `.env`; full Chrome + Gemini `AT-04` (`Steps 1–9` + Step 10 `>5s` slow notice) executed and passed (`AT-01`..`AT-04` **`4 / 4 PASS`**). |

### 3.2 Known Scope Limits & Non-Acceptance Gaps (§7 Alignment)

- **FR-18 Card D (Connector Health Panel):** Deferred by team agreement (`19 Nov 2026`); not tested by `AT-01..AT-03`.
- **MCP `tools/call` Content Type (`M-09`):** `mcp-server` returns `"type": "json"` (contract §4); standard MCP Inspector rejects `tools/call` (`Invalid tools/call result`) while accepting `tools/list`. Planned post-demo.
- **Usability Survey (`NFR-06`):** `AC-01.8` (guest landing access + 375 px mobile responsiveness) passed in `AT-01`; empirical 5-student SUS questionnaire (`SUS ≥ 70`) was not conducted.

---

## 4. Logs and Outputs

- **Official Acceptance Records & Evidence (`4 / 4 PASS`):**
  - `AT-01` (**PASS**): [`evidence/AT-01/README.md`](evidence/AT-01/README.md), [`network-and-logs.txt`](evidence/AT-01/network-and-logs.txt), PNG captures (`step2-router.png`, `step3-weekday-menu.png`, `step7-weekend-menu.png`, `step9-mobile-375px.png`)
  - `AT-02` (**PASS**): [`evidence/AT-02/README.md`](evidence/AT-02/README.md), [`network-and-logs.txt`](evidence/AT-02/network-and-logs.txt), PNG captures (`step1-router.png`, `step3-main-ring.png`, `step6-routes.png`, `step8-end-of-service.png`)
  - `AT-03` (**PASS**): [`evidence/AT-03/README.md`](evidence/AT-03/README.md), [`network-and-logs.txt`](evidence/AT-03/network-and-logs.txt), PNG captures (`step3-all-floors.png`, `step5-floor3.png`, `step7-stale-fallback.png`)
  - `AT-04` (**PASS — Run 2**): [`evidence/AT-04/README.md`](evidence/AT-04/README.md), [`at04-live-browser-trace.txt`](evidence/AT-04/at04-live-browser-trace.txt), [`sefa-security-checks.txt`](evidence/AT-04/sefa-security-checks.txt), PNG captures (`step1-guest-guard.png`, `step2-logged-in-assistant.png`, `step3-router-decision.png`, `step3-router-prefill.png`, `step4-streamed-answer.png`); supporting PR #45 curl trace: [`gateway-agent-gemini-compose-smoke.txt`](evidence/AT-04/gateway-agent-gemini-compose-smoke.txt)
- **Deployment, Security & Benchmark Logs:**
  - [`evidence/deployment/compose-4service-egress-smoke.txt`](evidence/deployment/compose-4service-egress-smoke.txt)
  - [`evidence/deployment/gateway-live-smoke.txt`](evidence/deployment/gateway-live-smoke.txt)
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
| **0.9** | 22 Nov 2026 | All (`dev` @ `13f71d7`) | Closed all code/Compose blockers; recorded Chrome + 4-service Compose execution: **`AT-01..AT-03 PASS`**, `AT-04` security/UI steps passed (`BLOCKED` awaiting local `GEMINI_API_KEY`), `33` Vitest files / `366` passed, and `NFR-01`/`NFR-02` benchmark (`99.4%` hit ratio, `44.41 ms` cached P95). | Ahmet Sefa Efendioğlu |
| **1.0** | 22 Nov 2026 | All (`4 / 4 PASS`) | Configured gitignored local `.env` with `GEMINI_API_KEY`; executed initial live Chrome `AT-04` (`Run 1`, `18d2e30`, Monday `09:00` clock, `3` `tool`, `23` `token`, `done` in `7664 ms`, `0` PII/JWT/key leaks) plus live `--mode=smoke` (`11/11 PASS`). *(Subsequently marked `Run 1 FAIL (AC-04.6)` per AT `v0.7` review.)* | Ahmet Sefa Efendioğlu |
| **1.1** | 22 Nov 2026 | All (`Run 2 PASS` — AT `v0.7` + `PR #48`) | Synced `dev` @ `2bd45ce` (`PR #48` chat Markdown renderer + `PR #49` AT `v0.7` Tuesday `2026-11-24T12:10:00+03:00` test clock); recorded `Run 1` `FAIL (AC-04.6)` audit trail in §1.3; re-ran live Chrome `AT-04` (`Run 2`: `step3-router-decision.png` + `step4-streamed-answer.png`, `13,526 ms`, `12:20` class / `12:30` catchable / `2026-11-24` menu, `0` raw `**`, `0` PII/placeholder/JWT/key leaks → **`PASS`**), live `--mode=smoke` (`11/11 PASS`, `1886 bytes`), and updated Vitest (`34/34` files, `373` passed / `8` skipped). | Ahmet Sefa Efendioğlu |
