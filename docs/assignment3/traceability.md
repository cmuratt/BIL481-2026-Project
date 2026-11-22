# Requirements Traceability — Assignment 3

**Campus Data Orchestrator — Group-ASYM**

| Field | Detail |
| :--- | :--- |
| **Course** | BIL 481 Software Engineering, Fall 2026, TOBB University of Economics and Technology |
| **Assignment** | Project Assignment 3 (Implementation, Deployment & Acceptance) |
| **Document Version / Date** | Version 0.4, 22 November 2026 |
| **Repository Filepath** | `docs/assignment3/traceability.md` |
| **State described** | `dev` at `1dd775a` (22 November 2026); no pull request is open that a status depends on. Acceptance results are taken from [`Test_Results_Report.md`](Test_Results_Report.md) v1.1 |
| **Owner** | Murat Can Işık (team guide task M-12); every module owner verifies their own rows |
| **Related documents** | [`Requirements_Document.md`](../Requirements_Document.md), [`Design_Document.md`](../Design_Document.md), [`QA_Plan.md`](../QA_Plan.md), `Acceptance_Tests_and_Criteria.md` (PR #17), [`contracts/API_CONTRACT.md`](contracts/API_CONTRACT.md) (API Contract v1.1) |

## Contributors

| Member | Student ID | GitHub | Contribution to this document |
| :--- | :--- | :--- | :--- |
| **Murat Can Işık** | 241101013 | `@cmuratt` | Document owner; compiled both matrices; MCP server, shared contract and agent rows; details in [`handovers/murat.md`](handovers/murat.md) |
| **Yunus Emre Biçer** | 241101009 | `@YunusEmre113` | Web client rows (FR-15..FR-19, NFR-07, NFR-09 web part), from [`handovers/yunus.md`](handovers/yunus.md) §3 |
| **Ahmet Sefa Efendioğlu** | 241101066 | `@Sefa-Efendioglu` | Gateway, security and deployment facts (FR-07, FR-08, NFR-05, NFR-09), from [`handovers/sefa.md`](handovers/sefa.md) |
| **Arda Çelik** | 241101065 | `@ardacelik11` | Connector rows (FR-03..FR-06, FR-09..FR-12, NFR-03): **verification pending** — rows were compiled by Murat from the code; Arda's handover [`handovers/arda.md`](handovers/arda.md) is on `dev` since PR #31 |

## Table of Contents

- [Change Record](#change-record)
- [1. Purpose, Scope and Status Legend](#1-purpose-scope-and-status-legend)
- [2. Matrix A — Requirement → Design Component → Code](#2-matrix-a--requirement--design-component--code)
- [3. Matrix B — Requirement → Test](#3-matrix-b--requirement--test)
- [4. Use Case Summary](#4-use-case-summary)
- [5. Open Items and Pending Verification](#5-open-items-and-pending-verification)
- [6. Document-Specific Task Matrix](#6-document-specific-task-matrix)

## Change Record

| Version | Date | Updated Sections | Description of Changes | Updated By |
| :--- | :--- | :--- | :--- | :--- |
| 0.1 | 20 Nov 2026 | All | Initial draft: both matrices for FR-01..FR-20 and NFR-01..NFR-09; web rows from the web handover, gateway rows from the gateway handover, MCP and connector rows from the code on `dev` at `6cc1d07` | Murat Can Işık |
| 0.2 | 21 Nov 2026 | §2, §3, §4, §5, §6 (Murat rows) | MCP, shared and agent rows updated to `dev` at `db57ed9`: M-02 and M-13 merged, agent core merged (PR #29), agent stream (PR #34) and Gemini fix (PR #35) shown as open; test counts re-measured (25 files, 292 tests); MCP Inspector result and open gap recorded | Murat Can Işık |
| 0.3 | 22 Nov 2026 | §2, §3, §4, §5, §6, header | Brought to `dev` at `13b8fb8`: agent stream, Gemini fix, SSE fix, tool log (PR #34, #35, #36, #39) and the connector runtime with Redis (PR #31) are merged; evidence of a curl run through the gateway in the four-service Compose stack with real Gemini (PR #41, open) and the finding that `mcp-server` needs a network with internet access (`compose.yaml`, Sefa); test counts re-measured (33 files, 365 passed, 8 skipped); Arda's handover recorded | Murat Can Işık |
| 0.4 | 22 Nov 2026 | Header, §1, §2, §3, §4, §5, §6 | Brought to `dev` at `1dd775a` after the acceptance runs: **AT-01..AT-04 PASS** (Sefa, live Chrome and the four-service Compose stack, mock data; AT-04 Run 1 failed AC-04.6 because of test data, Run 2 passed with AT v0.7), NFR-01 and NFR-02 measured (burst of 500 requests), QA Plan test cases TC-01..TC-08 recorded as passed; PR #40 – #51 are merged, including the compose `egress` network (PR #44); web rows FR-17, FR-19 and NFR-07 aligned with `handovers/yunus.md` v1.1 (requested by Yunus in PR #47); remaining open items and gaps listed in §5 | Murat Can Işık |

---

## 1. Purpose, Scope and Status Legend

This document links every requirement of the [Requirements Document](../Requirements_Document.md) to the design component that realises it, the code that implements it and the tests that verify it. It uses the official requirement IDs `FR-01`..`FR-20` and `NFR-01`..`NFR-09` unchanged; no requirement is added or renamed. PA3 focuses on the four selected use cases UC-01..UC-04; requirements outside them are still listed, with their real status.

Two matrices are kept, as requested by the course (Piazza):

- **Matrix A** — Requirement → Design component → Code path → Implementation status.
- **Matrix B** — Requirement → Test: PA2 QA test cases `TC-01`..`TC-08`, automated test suites, and PA3 acceptance tests `AT-01`..`AT-04` with their acceptance criteria `AC-xx.y`.

**Status legend (implementation, Matrix A):**

| Status | Meaning |
| :--- | :--- |
| **Implemented** | Code exists on `dev` and is covered by at least one automated test that was run |
| **Partial** | Some of the requirement exists on `dev`; the missing part is named |
| **Planned (PA3)** | Scheduled for PA3; not on `dev` yet. The team guide task ID is given |
| **Not in PA3** | Not scheduled for PA3; stays in the backlog and is reported as a gap |

**Test status (Matrix B)** is taken only from actual runs. `NOT RUN` means the test has not been executed yet. The acceptance tests `AT-01`..`AT-04` were run by the QA owner on 22 November 2026 and all four passed (live Chrome, four-service Compose stack, mock data; [`Test_Results_Report.md`](Test_Results_Report.md) v1.1).

---

## 2. Matrix A — Requirement → Design Component → Code

Design sections refer to [`Design_Document.md`](../Design_Document.md). Code paths are relative to the repository root.

### 2.1 Functional requirements

| Req. | Requirement (short) | Design component (section) | Code | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| FR-01 | MCP tool registry with strict schemas | Tool registry & ToolDispatcher (§2.2.1, §2.3.2, §2.3.6) | `apps/mcp-server/src/registry/toolDefinitions.ts`, `apps/mcp-server/src/dispatcher/ToolDispatcher.ts`, `packages/shared/src/types/tools.ts` | Murat | **Implemented**: tool registry and dispatcher; the four tools are served by the connector runtime since M-02 (PR #26). `tools/list` verified with the MCP Inspector; `tools/call` through standard MCP clients is an **open gap** (content type `json`, see `handovers/murat.md` §7) |
| FR-02 | MCP transports (stdio, HTTP) | MCP transports (§2.2.1) | `apps/mcp-server/src/index.ts`, `apps/mcp-server/src/server.ts` | Murat | **Partial**: stdio and JSON-RPC `POST /mcp` verified; legacy HTTP+SSE checked with the MCP Inspector (M-09), a session bug found there is fixed (PR #36); official Streamable HTTP is not claimed; `tools/call` through standard MCP clients is an open gap |
| FR-03 | Cafeteria menu connector | Connector tier — cafeteria (§2.2.3, §2.3.4) | `packages/connectors/src/connectors/` (mock cafeteria), `packages/connectors/src/handlers.ts` | Arda | **Implemented** (mock mode) and served by the MCP server since M-02 (PR #26); owner verification pending (Arda) |
| FR-04 | Shuttle schedule connector | Connector tier — shuttle (§2.2.3, §2.3.4) | `packages/connectors/src/connectors/` (mock shuttle), `packages/connectors/src/handlers.ts` | Arda | **Implemented** (mock mode) and served by the MCP server since M-02 (PR #26); owner verification pending (Arda) |
| FR-05 | Library occupancy connector | Connector tier — library (§2.2.3, §2.3.4) | `packages/connectors/src/connectors/` (mock library), `packages/connectors/src/handlers.ts` | Arda | **Implemented** (mock mode) and served by the MCP server since M-02 (PR #26); owner verification pending (Arda) |
| FR-06 | Course schedule from verified identity only | SIS adapter + dispatcher auth guard (§2.2.1, §2.3.6); gateway rejects identity parameters (§2.2.4) | `packages/connectors/src/connectors/` (mock course schedule), `apps/mcp-server/src/dispatcher/ToolDispatcher.ts`, `apps/api-gateway/src/proxy/mcpProxy.ts` | Arda, Murat, Sefa | **Implemented**: dispatcher auth guard, gateway checks and connector wiring (M-02, PR #26); owner verification pending (Arda) |
| FR-07 | JWT verification and token termination at the gateway | Gateway identity perimeter (§2.2.4, §2.3.5) | `apps/api-gateway/src/auth/jwtVerifier.ts`, `apps/api-gateway/src/auth/tokenTermination.ts` | Sefa | **Implemented** |
| FR-08 | Rate limiting 30 req / 60 s | Sliding-window rate limiter (§2.2.4) | `apps/api-gateway/src/rate-limiter/slidingWindowRateLimiter.ts`, `apps/api-gateway/src/rate-limiter/redisRateLimiterStore.ts` | Sefa | **Implemented** (Redis-backed when `REDIS_URL` is set; verified in the 3-service Compose stack) |
| FR-09 | TTL cache (3600/120/60/300 s) | Cache store (§2.2.3, §4.1) | `packages/connectors/src/cache/` (`InMemoryCacheStore`, `RedisCacheStore`, `cacheKeys`) | Arda | **Implemented**: Redis runtime (PR #31), verified by Arda against a real Redis 7.0 and in the four-service Compose stack (keys, `CACHE_HIT`; criteria AC-01.7, AC-02.7, AC-03.6 passed in AT-01..AT-03); cache hit ratio 99.4 % in the NFR-02 benchmark; owner verification pending (Arda) |
| FR-10 | Stale-if-error fallback | Resilient connector executor (§2.2.3) | `packages/connectors/src/resilience/ResilientConnectorExecutor.ts` | Arda | **Implemented** in the connector package; reaches the demo flow through the MCP server since M-02 (PR #26) |
| FR-11 | Circuit breaker | Circuit breaker (§2.2.3) | `packages/connectors/src/resilience/CircuitBreaker.ts` | Arda | **Implemented** in the connector package; reaches the demo flow through the MCP server since M-02 (PR #26) |
| FR-12 | Mock/live connector mode, synthetic labelling | Connector interface & factory (§2.2.3) | `packages/connectors/src/factory.ts`, `packages/connectors/src/config.ts`; UI badge `apps/web/src/components/cards/CardParts.tsx` | Arda, Yunus | **Implemented** (mock mode; live sources unavailable, reported as synthetic) |
| FR-13 | AI agent multi-tool orchestration | Agent orchestrator (§2.2.1) | `apps/mcp-server/src/agent/AgentOrchestrator.ts`, `LlmProvider.ts`, `GeminiProvider.ts`, `FakeProvider.ts` | Murat | **Implemented**: agent loop, real Gemini provider, stream endpoint, Gemini 3 fix and tool log (PR #29, #34, #35, #39). **AT-04 Run 2 PASS** (live Chrome, real Gemini `gemini-3.5-flash-lite`, 3 `tool` events, 3 `tool_call` log lines, no personal data in the provider requests; Sefa, 22 Nov, `evidence/AT-04/`). Run 1 had failed AC-04.6 because of the test data (fixed in AT v0.7) |
| FR-14 | PII scrubbing before the LLM | Agent PII scrubber (§2.2.1) | `apps/mcp-server/src/agent/piiScrubber.ts`, `apps/mcp-server/src/agent/outboundLog.ts` | Murat | **Implemented** (M-06, PR #29): scrubbing, fail-closed check and redacted outbound log; AT-04 Run 2 step 7: 0 occurrences of the raw JWT, student id, name and e-mail in the provider requests |
| FR-15 | Login state / sign-out | Session provider, login page, header (§2.2.2, §2.4) | `apps/web/src/lib/auth/`, `apps/web/src/components/SessionProvider.tsx`, `LoginForm.tsx`, `SiteHeader.tsx`; gateway `POST /api/v1/auth/mock-login`, `GET /api/v1/auth/me` | Yunus, Sefa | **Implemented** (mock SSO, synthetic personas) |
| FR-16 | Bilingual deterministic intent router | Intent router, query box (§2.2.2, §2.3.3) | `apps/web/src/router/routeStudentQuery.ts`, `apps/web/src/components/QueryBox.tsx` | Yunus | **Implemented** |
| FR-17 | SSE streamed assistant with tool badges | Chat stream client (§2.2.2, §2.3.3, §3.5); gateway chat proxy (§2.2.4) | `apps/web/src/lib/chat/`, `apps/api-gateway/src/proxy/chatStreamProxy.ts`; agent stream endpoint `apps/mcp-server/src/agent/agentStreamHandler.ts` | Yunus, Sefa, Murat | **Implemented**: web client, chat screen (Y-07, PR #32), gateway proxy and agent stream endpoint (M-08, PR #34); **AT-04 Run 2 PASS** (streamed answer in Chrome, one badge per tool; 3 `tool`, 21 `token`, 1 `done`). The answer is generated first and then split into chunks, so the first text appeared after 13.5 s in that run |
| FR-18 | Campus-at-a-glance dashboard | Dashboard, three cards, gateway client (§2.2.2, §2.4) | `apps/web/src/components/Dashboard.tsx`, `apps/web/src/components/cards/`, `apps/web/src/lib/gateway/` | Yunus | **Implemented**, except the connector-health card and card-click prefill (not in PA3) |
| FR-19 | UI error / stale / empty / latency states | Card states, chat latency flags (§3.6) | `apps/web/src/components/cards/CardParts.tsx`, `apps/web/src/lib/chat/chatStreamClient.ts` | Yunus | **Implemented**: card states and chat states (Y-07, Y-08, PR #32); AT-04 step 10 observed (the "still processing" notice rendered after 5 s in the 13.5 s run); stale and empty states passed in AT-02 and AT-03 |
| FR-20 | PostgreSQL telemetry store (Should) | Persistence & telemetry (§1.3) | — | — | **Not in PA3** |

### 2.2 Non-functional requirements

| Req. | Requirement (short) | Design component (section) | Code / configuration | Owner | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| NFR-01 | Cached P95 < 250 ms; 800 ms upstream timeout | Cache + gateway path (§1.2, §4.1) | `packages/connectors/src/resilience/` (timeout), `UPSTREAM_TIMEOUT_MS` | Arda, Sefa | **Measured**: cached round trip p95 44.41 ms (497 cache hits) and overall p95 44.26 ms, target < 250 ms; 800 ms upstream timeout implemented. Burst of 500 requests from 20 virtual students on the four-service stack, not a soak test (Sefa, `evidence/deployment/nfr-e2e-latency-cache-benchmark.txt`) |
| NFR-02 | Cache hit ratio ≥ 90 % (Should) | Cache store (§4.1) | `packages/connectors/src/cache/` | Arda | **Measured**: hit ratio 99.4 % (497 `CACHE_HIT`, 3 `LIVE`) from a cold start, target ≥ 90 %; same benchmark, so the figure describes that usage pattern only |
| NFR-03 | Fault isolation per connector | Circuit breaker per connector (§2.2.3) | `packages/connectors/src/resilience/CircuitBreaker.ts` | Arda | **Implemented** in the connector package (see FR-11) |
| NFR-04 | Scalability, 100 users / 2 instances (Should) | Stateless services + Redis (§4.1) | — | Sefa | **Not in PA3** (not measured) |
| NFR-05 | Perimeter security, no token/PII leakage | Gateway perimeter, internal network, PII scrubber (§2.2.4, §2.3.6) | `apps/api-gateway/src/auth/`, `compose.yaml` (`internal` network, no host port for `mcp-server`/`redis`); PII scrubber and redacted outbound log on the agent side (M-06, PR #29) | Sefa, Murat | **Implemented**: gateway verification, token termination and rate limiting; AT-04 steps 8 and 9 passed (forged `X-Authenticated-*` stripped, host port 3001 unreachable, expired and tampered JWT answered 401 with 0 MCP calls); `web` cannot reach `mcp-server` or `redis`; 0 occurrences of the student id, the raw JWT and the API key in the `mcp-server` log |
| NFR-06 | Usability (SUS ≥ 70) | Dashboard and assistant layout (§2.4) | `apps/web/src/` | Yunus | **Not evaluated** (no usability session yet) |
| NFR-07 | Responsive layout 375 px – desktop | Responsive layout (§2.4.3) | `apps/web/src/app/globals.css`, `apps/web/src/**/*.module.css` | Yunus | **Implemented** (manual checks): Chromium at 375 / 768 / 1440 / 1920 px with keyboard, headings, labels and contrast (`evidence/y10-responsive/`); Firefox and Safari visual checks passed; AT-01 step 9 (375 px) passed |
| NFR-08 | Offline automated tests | Vitest suites (§5) | `vitest.config.mts`, `tests/`, `apps/*/tests/` | All | **Implemented**: 373 tests passed (8 skipped: the real-Redis group) in 34 files on `dev` at `1dd775a` (run 22 Nov 2026) |
| NFR-09 | Docker Compose deployment | Compose topology (Deployment Plan) | `compose.yaml`, `apps/api-gateway/Dockerfile`, `apps/web/Dockerfile`; `apps/mcp-server/Dockerfile` (M-13, merged) | Sefa, Yunus, Murat | **Implemented**: the four services (`redis`, `mcp-server`, `api-gateway`, `web`) build and start healthy from `compose.yaml`; `mcp-server` has an isolated `egress` network for the Gemini API (PR #44) and `web` cannot reach `mcp-server` or `redis`; AT-01..AT-04 were executed in this stack |

---

## 3. Matrix B — Requirement → Test

**Test columns:**

- **QA Plan TC** — PA2 test cases from [`QA_Plan.md`](../QA_Plan.md) §3.1, with their status as recorded there.
- **Automated suites** — Vitest files that exercise the requirement; all were run on `dev` at `1dd775a` (373 passed, 8 skipped, 22 Nov 2026).
- **Acceptance** — PA3 acceptance tests and criteria from `Acceptance_Tests_and_Criteria.md` (v1.0, frozen on 22 Nov 2026). **AT-01..AT-04: PASS** (QA owner, live Chrome and four-service Compose, mock data; AT-04 Run 1 failed AC-04.6 because of the test data, Run 2 passed).

| Req. | QA Plan TC (recorded status) | Automated suites | Acceptance test / criteria |
| :--- | :--- | :--- | :--- |
| FR-01 | TC-01..TC-04 (Pass) | `tests/mcp-server/dispatcher.test.ts`, `tests/mcp-server/httpConnectors.test.ts` | AT-01 (AC-01.5), AT-02 (AC-02.4) |
| FR-02 | — | `tests/mcp-server/httpConnectors.test.ts` (`POST /mcp`); SSE session test `tests/mcp-server/sseTransport.test.ts` | — (MCP Inspector check done, M-09: stdio and SSE `tools/list` pass; `tools/call` open gap) |
| FR-03 | TC-01 (Pass) | `tests/connectors/mockConnectors.test.ts` | AT-01 (AC-01.2, AC-01.4) |
| FR-04 | TC-02 (Pass) | `tests/connectors/mockConnectors.test.ts` | AT-02 (AC-02.2, AC-02.3, AC-02.4) |
| FR-05 | TC-03 (Pass) | `tests/connectors/mockConnectors.test.ts` | AT-03 (AC-03.2 – AC-03.5) |
| FR-06 | TC-04 (Pass) | `tests/mcp-server/dispatcher.test.ts`, `apps/api-gateway/tests/queryProxy.test.ts` | AT-04 (AC-04.1, AC-04.5) |
| FR-07 | TC-04 (Pass), TC-07 (Pass) | `apps/api-gateway/tests/jwtAuth.test.ts`, `queryProxy.test.ts`, `chatStreamProxy.test.ts` | AT-04 (AC-04.8, AC-04.9) |
| FR-08 | TC-07 (gateway + Redis pass) | `apps/api-gateway/tests/rateLimiter.test.ts` | — (not an acceptance criterion; QA evidence only) |
| FR-09 | TC-06 (Pass) | `tests/connectors/cacheStores.test.ts`, `tests/connectors/redisVsMemory.demo.test.ts` | AT-01 (AC-01.7), AT-02 (AC-02.7), AT-03 (AC-03.6) |
| FR-10 | TC-06 (Pass) | `tests/connectors/resilientExecutor.test.ts` | AT-03 (AC-03.7, conditional) |
| FR-11 | TC-06 (Pass) | `tests/connectors/circuitBreaker.test.ts` | — (QA evidence only) |
| FR-12 | TC-03 (Pass) | `tests/connectors/configAndFactory.test.ts`, `tests/connectors/mockConnectors.test.ts` | AT-01 (AC-01.6), AT-02 (AC-02.6), AT-03 (AC-03.5) |
| FR-13 | TC-08 (Pass) | `tests/mcp-server/agentOrchestrator.test.ts`, `tests/mcp-server/geminiProvider.test.ts`; `tests/mcp-server/agentStream.test.ts`. All with stubs or the fake provider; the real-Gemini curl run and the browser run are in `evidence/AT-04/` | AT-04 (AC-04.4, AC-04.6, AC-04.11) |
| FR-14 | TC-08 (Pass) | `tests/mcp-server/piiScrubber.test.ts`, `tests/mcp-server/agentOrchestrator.test.ts` | AT-04 (AC-04.7) |
| FR-15 | — | `apps/web/tests/auth.test.ts` | AT-01 (AC-01.8), AT-04 (AC-04.1, AC-04.2) |
| FR-16 | TC-05 (Pass) | `apps/web/tests/routeStudentQuery.test.ts`, `routeStudentQuery.heldout.test.ts` | AT-01..AT-04 (AC-01.1, AC-02.1, AC-03.1, AC-04.3) |
| FR-17 | — | `apps/web/tests/sseParser.test.ts`, `chatStreamClient.test.ts`, `chatConversation.test.ts`, `answerFormat.test.ts`, `apps/api-gateway/tests/chatStreamProxy.test.ts`; `tests/mcp-server/agentStream.test.ts` | AT-04 (AC-04.4, AC-04.10) |
| FR-18 | — | `apps/web/tests/gatewayClient.test.ts`, `format.test.ts` | AT-01 (AC-01.1, AC-01.3), AT-02 (AC-02.1), AT-03 (AC-03.1) |
| FR-19 | — | `apps/web/tests/gatewayClient.test.ts`, `chatStreamClient.test.ts`, `chatConversation.test.ts` | AT-02 (AC-02.5, passed at 22:30), AT-03 (AC-03.7, passed), AT-04 (AC-04.12, observed) |
| FR-20 | — | — | — (not in PA3) |
| NFR-01 | TC-01, TC-02 (Pass), TC-05 (Pass) | — (no load test framework; burst benchmark `evidence/deployment/nfr-e2e-latency-cache-benchmark.txt`) | — (measured separately: Test Results Report §2.4) |
| NFR-02 | — | — (burst benchmark, same file) | — (measured separately: Test Results Report §2.4) |
| NFR-03 | TC-06 (Pass) | `tests/connectors/circuitBreaker.test.ts` | — |
| NFR-04 | — | — | — (not in PA3) |
| NFR-05 | TC-04, TC-07, TC-08 (Pass) | `apps/api-gateway/tests/jwtAuth.test.ts`, `deploymentConfig.test.ts`, `tests/mcp-server/piiScrubber.test.ts` | AT-04 (AC-04.7, AC-04.8) |
| NFR-06 | — | — | AT-01 (AC-01.8, part 3); SUS not evaluated |
| NFR-07 | — | — (manual checks, `evidence/y10-responsive/`) | AT-01 (AC-01.8) |
| NFR-08 | all TC | all suites (373 tests, 8 skipped) | — |
| NFR-09 | — | `apps/api-gateway/tests/deploymentConfig.test.ts`; Compose smoke evidence `docs/assignment3/evidence/deployment/` | — (Deployment Plan) |

---

## 4. Use Case Summary

| Use case | Requirements (Design Document §3.1) | Acceptance test | Main components on the path | Blocking items for an end-to-end run |
| :--- | :--- | :--- | :--- | :--- |
| UC-01 Cafeteria menu | FR-01, FR-03, FR-09, FR-12, FR-16, FR-18 | AT-01 | web → Next.js rewrite → gateway → MCP → cafeteria connector | None known: AT-01 passed on 22 Nov 2026 |
| UC-02 Shuttle schedule | FR-01, FR-04, FR-09, FR-12, FR-16, FR-18 | AT-02 | as UC-01, shuttle connector | None known: AT-02 passed on 22 Nov 2026 (including the 22:30 end-of-service case) |
| UC-03 Library occupancy | FR-01, FR-05, FR-09, FR-12, FR-16, FR-18 | AT-03 | as UC-01, library connector | None known: AT-03 passed on 22 Nov 2026 (including the stale fallback) |
| UC-04 Combined question | FR-01, FR-06, FR-07, FR-13, FR-14, FR-16, FR-17, FR-19 | AT-04 | web chat → gateway chat proxy → agent → 3 MCP tools → Gemini | None known: AT-04 Run 2 passed on 22 Nov 2026 (Tuesday 12:10 test clock) |

---

## 5. Open Items and Pending Verification

| Item | Owner | Effect on this document |
| :--- | :--- | :--- |
| Connector rows verification: `handovers/arda.md` is on `dev`; Arda checks the code paths and the statuses of the connector rows in this matrix | Arda | FR-03..FR-06, FR-09..FR-12, NFR-03 rows stay "owner verification pending" until then |
| `tools/call` through standard MCP clients: the result block uses the content type `json`, which standard MCP clients (for example the MCP Inspector) reject; `tools/list` works. The gateway path is not affected | Murat | FR-01, FR-02 are met for the gateway path; planned fix after the demo (a backward-compatible `text` block) |
| No provider streaming: the answer is generated first and then split into chunks, so the first text of the AT-04 run appeared after 13.5 s (UI limit 20 s) | Murat | FR-17 and FR-19 are met for the acceptance criteria; latency risk for the demo, handled by a rehearsal and by switching `GEMINI_MODEL` |
| Not in PA3 or not evaluated: FR-20 (PostgreSQL telemetry), NFR-04 (100 users on 2 instances), NFR-06 (SUS usability session) | Team | These requirements stay reported as gaps |

This document is updated whenever one of the items above changes.

---

## 6. Document-Specific Task Matrix

| Task ID | Work package | Lead | Contributors / reviewer | Status |
| :--- | :--- | :--- | :--- | :--- |
| TSK-TRC-01 | Matrix structure, MCP/shared/agent rows, compilation (M-12) | Murat Can Işık | Reviewer: Ahmet Sefa Efendioğlu (QA traceability, S-12) | Final draft (v0.4) |
| TSK-TRC-02 | Web client rows | Yunus Emre Biçer (handover §3) | Compiled by Murat | Done (from handover; FR-17, FR-19, NFR-07 aligned with `handovers/yunus.md` v1.1) |
| TSK-TRC-03 | Gateway, security and deployment rows | Ahmet Sefa Efendioğlu (handover) | Compiled by Murat | Done (from handover) |
| TSK-TRC-04 | Connector rows verification | Arda Çelik | Compiled by Murat from code | Handover received (`handovers/arda.md`); rows to be verified by Arda |
