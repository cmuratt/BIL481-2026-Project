# Campus Data Orchestrator — BIL 481 Term Project (Fall 2026)

## Group Name

**Group-ASYM**

## Group Members

| Full Name | GitHub Username | Email | School Number | Primary Technical Role |
| :--- | :--- | :--- | :--- | :--- |
| Murat Can Işık | [`@cmuratt`](https://github.com/cmuratt) | muratcanisik@etu.edu.tr | 241101013 | MCP Server, Tool Dispatcher & AI Agent Lead |
| Yunus Emre Biçer | [`@YunusEmre113`](https://github.com/YunusEmre113) | y.bicer@etu.edu.tr | 241101009 | Web Client, Bilingual Intent Router & Use Cases |
| Ahmet Sefa Efendioğlu | [`@Sefa-Efendioglu`](https://github.com/Sefa-Efendioglu) | a.efendioglu@etu.edu.tr | 241101066 | API Gateway, Perimeter Security, QA & Release Lead |
| Arda Çelik | [`@ardacelik11`](https://github.com/ardacelik11) | arda.celik@etu.edu.tr | 241101065 | Campus Connectors, Caching, Resilience & Design Decisions |

---

## Project Overview

**Campus Data Orchestrator** is a Model Context Protocol (MCP) based campus information orchestrator built over JSON-RPC 2.0. It unifies four university data domains — cafeteria menus (`get_cafeteria_menu`), shuttle ring schedules (`get_shuttle_schedule`), library floor occupancy (`get_library_occupancy`), and authenticated student course schedules (`get_course_schedule`) — behind two decoupled consumption paths:

- **Direct Fast-Path (`DIRECT_WIDGET`):** Single-domain queries bypass LLM inference and resolve directly from cached MCP tool endpoints.
- **Agentic Orchestration Path (`LLM_AGENT`):** Compound or multi-service queries invoke the AI Agent tier to plan multi-tool sequences while isolating raw JWT tokens and scrubbing student PII at the perimeter.

---

## Deliverables Index

### Assignment 3 (Deployment, Acceptance Tests & Test Results) — due 29 Nov 2026, 23:59
- **[Deployment Plan](docs/assignment3/Deployment_Plan.md):** Deployment overview, step-by-step four-service Docker Compose process, and final configuration plan (lead: Ahmet Sefa Efendioğlu).
- **[Acceptance Tests and Acceptance Criteria](docs/assignment3/Acceptance_Tests_and_Criteria.md):** Measurable acceptance criteria and the four acceptance tests `AT-01`–`AT-04` for `UC-01`–`UC-04`, with the test ↔ criteria mapping (v1.0, frozen; lead: Yunus Emre Biçer).
- **[Test Results Report](docs/assignment3/Test_Results_Report.md):** Pass/fail results of `AT-01`–`AT-04` (**4 / 4 PASS**), analysis of the AT-04 Run 1 failure and its fix, and logs/outputs (lead: Ahmet Sefa Efendioğlu).
- **Logs and outputs:** [`docs/assignment3/evidence/`](docs/assignment3/evidence/) — screenshots, redacted network and agent tool logs per test (`AT-01`..`AT-04`), Compose/egress smoke runs, NFR-01/NFR-02 benchmark, connector and security test outputs.
- **Traceability (requirements → design → code → tests):** [`docs/assignment3/traceability.md`](docs/assignment3/traceability.md); API contract between the components: [`docs/assignment3/contracts/API_CONTRACT.md`](docs/assignment3/contracts/API_CONTRACT.md); per-member handovers: [`docs/assignment3/handovers/`](docs/assignment3/handovers/).

### Upcoming
- **Demo:** recorded video of the four scenarios (no oral session) — due 5 Dec 2026.
- **Assignment 4 (bonus):** due 5 Dec 2026.

### Assignment 2 (Design & Quality Assurance)
- **[Design Document](docs/Design_Document.md):** System overview, architecture, codebase structure, key implementations, component interfaces, wireframes (`docs/wireframes/`), 4 use cases (`UC-01`–`UC-04`), technology comparisons (`comparisons/`), and task matrix.
- **[Quality Assurance (QA) Plan](docs/QA_Plan.md):** Testing strategy, 4 measurable quality factors, detailed test cases (`TC-01`–`TC-08`), bug tracking workflow, and release gate checklist.

### Assignment 1 (Baseline Documentation)
- [Project Definition Document](docs/Project_Definition_Document.md)
- [Requirements Document](docs/Requirements_Document.md)
- [Project Plan Document](docs/Project_Plan_Document.md)

---

## Implementation Status (Assignment 3)

| Component / Workspace | Status | Notes |
| :--- | :--- | :--- |
| **`packages/shared`** | **Implemented** | Shared domain models, tool input/output contracts, TTL constants, `ICampusConnector` interface |
| **`apps/mcp-server`** | **Implemented** | MCP server (`POST /mcp`, JSON-RPC 2.0), Zod validation, `ToolDispatcher` with auth guard, connector-backed tools, UC-04 `AgentOrchestrator` with Google Gemini function calling, PII scrubber and `POST /internal/agent/stream` (SSE) |
| **`packages/connectors`** | **Implemented (mock data)** | Seeded mock connectors for the four services, `RedisCacheStore` / `InMemoryCacheStore` with per-service TTLs, 3-state `CircuitBreaker`, stale-if-error `ResilientConnectorExecutor`, `CONNECTOR_FIXED_NOW` test clock |
| **`apps/api-gateway`** | **Implemented** | Fastify gateway, mock-SSO JWT verification, token termination and identity header injection, Redis sliding-window rate limiter, `/api/v1/query` and `/api/v1/chat/stream` proxies |
| **`apps/web`** | **Implemented** | Next.js dashboard cards (menu, shuttle, library), `/giris` login, streaming chat (`/asistan`), bilingual TR/EN `routeStudentQuery` intent router, responsive layout |
| **Docker Compose** | **Implemented** | Four services (`redis`, `mcp-server`, `api-gateway`, `web`) with health checks and isolated `edge` / `internal` / `egress` networks ([`compose.yaml`](compose.yaml)) |
| **Not in PA3** | Gap | PostgreSQL telemetry (`FR-20`); NFR-04 and NFR-06 not evaluated (see the Test Results Report) |

The four scenarios `UC-01`–`UC-04` were accepted with `AT-01`–`AT-04` (**4 / 4 PASS**, 22 Nov 2026) on the four-service Compose stack in Chrome; `UC-04` ran with the real Gemini provider.

---

## Build & Test Instructions

All TypeScript workspaces and the offline unit/integration test suites run without external network access (34 test files, 373 passed, 8 real-Redis tests skipped offline):

```bash
npm install
npm run build
npm test
```

## Running the Demo Stack (Docker Compose)

Full steps, the acceptance runbook and all variables are in the [Deployment Plan](docs/assignment3/Deployment_Plan.md).

```bash
cp .env.example .env        # set a strong JWT_SECRET and GEMINI_API_KEY; never commit .env
docker compose up --build -d
# web: http://localhost:3002   gateway: http://localhost:3000/health
docker compose down
```
