# Design Document

**Campus Data Orchestrator — An MCP-Based Campus Data Orchestrator**

| Field | Detail |
| :--- | :--- |
| **Course** | BIL 481 Software Engineering, Fall 2026, TOBB University of Economics and Technology |
| **Assignment** | Project Assignment 2 (Design & Skeleton); updated during Project Assignment 3 (Implementation & Deployment) |
| **Group Name** | Group-ASYM |
| **Document Version / Date** | Version 1.5 (PA3 final status update — acceptance results, web client, MCP server, agent, gateway and connector tier; demo format in 3.7), 28 November 2026. Version 1.0 (PA2 final deliverable, 15 November 2026) is preserved in the Git history of `main`; see the [Change Record](#change-record). |
| **Repository Filepath** | `docs/Design_Document.md` |
| **Related Baseline Documents** | `docs/Project_Definition_Document.md`, `docs/Project_Plan_Document.md`, `docs/Requirements_Document.md`, `docs/QA_Plan.md` |

---

## Document Authorship & Team Attribution

In compliance with the BIL 481 Project Assignment 2 specification, each team member's role, student identity, and specific authoring contributions to this Design Document are detailed below:

| Member Name | Student ID | GitHub Account | Primary Project Role | Specific Contribution to this Design Document |
| :--- | :--- | :--- | :--- | :--- |
| **Murat Can Işık** | 241101013 | [`@cmuratt`](https://github.com/cmuratt) | Lead Developer & MCP Architect | **Document Lead & Editor:** Compiled and structured the final Design Document; authored Section 1 (System Overview, Architecture, Tech Stack), Section 2.2.1 & 2.3.1–2 (MCP Server Core, ToolDispatcher, AI Agent Skeleton), Section 2.3.6 (MCP Tool Contracts & Security Boundary), Section 5, and Section 6. |
| **Yunus Emre Biçer** | 241101009 | [`@YunusEmre113`](https://github.com/YunusEmre113) | Frontend & Intent Router Lead | **Presentation & Use Case Lead:** Authored Section 2.2.2 & 2.3.3 (Web Client Architecture, Bilingual Deterministic Intent Router), Section 2.4 (Visual Interfaces, Responsive Layouts, SVG Wireframes), and Section 3 (Four Selected Use Cases UC-01–UC-04, Sequence Diagrams, Demo Criteria). |
| **Arda Çelik** | 241101065 | [`@ardacelik11`](https://github.com/ardacelik11) | Connector & Data Resilience Lead | **Data & Decisions Lead:** Authored Section 2.1 (Codebase Structure, Monorepo Layout, Packaging), Section 2.2.3 & 2.3.4 (Campus Connectors, Deterministic Mock Data, TTL Caching, Circuit Breaking), Section 4 (Design Decisions: 4.1 Redis vs Memory Map, 4.2 Fastify vs Express editing). |
| **Ahmet Sefa Efendioğlu** | 241101066 | [`@Sefa-Efendioglu`](https://github.com/Sefa-Efendioglu) | QA, Security & Gateway Lead | **Security & QA Verification:** Authored Section 2.2.4 & 2.3.5 (API Gateway Architecture, Perimeter Token Termination, Sliding-Window Rate Limiting), drafted Section 4.2 evaluation material (Fastify vs Express), and performed cross-document QA audit against the QA Plan. |

**PA3 update (Version 1.1):** The web client sections (1.2, 1.3, 2.1, 2.2.2, 2.3.3, 2.4, 3.2–3.6, 5) were updated by Murat Can Işık (document lead, M-11) from the web client handover written by Yunus Emre Biçer ([`docs/assignment3/handovers/yunus.md`](assignment3/handovers/yunus.md), Y-13). The facts come from that handover and were checked against `dev` at `6cc1d07`; the wording is Murat's. The gateway, MCP/agent and connector sections are updated in later PA3 revisions.

**PA3 update (Version 1.2):** The MCP server and agent sections (1.2, 1.3, 2.1 diagram, 2.2.1, 2.3.2, 3.5, 5, 6) were updated by Murat Can Işık (document lead and author of the MCP server and agent, M-11) from his own handover ([`docs/assignment3/handovers/murat.md`](assignment3/handovers/murat.md)), checked against `dev` at `db57ed9`. Statements that depend on pull requests that are not merged yet say so. The gateway and connector sections are not part of this revision; they follow when their handovers are merged.

**PA3 update (Version 1.3):** The gateway sections (1.2, 1.3, 2.2.4, 2.3.5) and the connector sections (1.2, 1.3, 2.2.3, 2.3.4) were updated by Murat Can Işık (document lead, M-11) from the handovers of their authors ([`handovers/sefa.md`](assignment3/handovers/sefa.md), [`handovers/arda.md`](assignment3/handovers/arda.md)); every statement was checked against the code on `dev` at `13b8fb8`, and the MCP and agent statements of Version 1.2 were brought up to date with PR #34, #35, #36 and #39. The authors of the gateway and connector sections should confirm the wording of their parts.

**PA3 update (Version 1.4):** Final status update of 22 November 2026 by Murat Can Işık (document lead): the sections that described pending acceptance runs, open pull requests and the compose network finding were brought in line with `dev` at `1dd775a`, the acceptance results of the QA owner ([`Test_Results_Report.md`](assignment3/Test_Results_Report.md) v1.1) and the merged compose fix (PR #44).

---

## Change Record

| Version | Date | Updated Sections | Description of Changes | Updated By |
| :--- | :--- | :--- | :--- | :--- |
| 1.0 | 15 Nov 2026 | All | PA2 final deliverable (design and skeleton). | All members (see attribution above) |
| 1.1 | 20 Nov 2026 | Header, 1.2, 1.3, 2.1.1, 2.1.2, 2.2.2, 2.3.3, 2.4, 3.2–3.6, 5, 6 | Web client moved from *Planned* to *Implemented* (Next.js 16 App Router, React 19, CSS Modules); three dashboard cards instead of four; router step for personal-timetable words and held-out measurement; current web interfaces; implemented UI vs. wireframe differences; Next.js rewrite of `/api/v1/*` in the sequence diagrams; **design decision: no automatic SSE reconnect** (API Contract v1.1 §3.3). Source: web client handover (Y-13). | Murat Can Işık (source: Yunus Emre Biçer) |
| 1.2 | 21 Nov 2026 | Header, 1.2, 1.3, 2.1 diagram, 2.2.1, 2.3.2, 3.5, 5, 6 | MCP server and AI agent moved from *Planned* to *Implemented*: connector runtime behind the four tools (M-02), real `AgentOrchestrator` with `LlmProvider`, `GeminiProvider` and `FakeProvider`, PII scrubber and redacted outbound log, `POST /internal/agent/stream` (SSE, API Contract v1.1 §3.3). UC-04 flow rewritten to what the code does: the agent runs inside the MCP process and calls the dispatcher in-process; tools run once each, in the order the model asks. **Honest limits recorded:** the real Gemini run was done only directly on the agent (not through the stream endpoint, gateway and UI); `tools/call` through standard MCP clients is an open gap (content type `json`). Source: MCP/agent handover (`handovers/murat.md`) and the code on `dev` at `db57ed9`; PR #34 (stream endpoint), #35 (Gemini 3 fix) and the SSE session fix are marked as open. | Murat Can Işık |
| 1.3 | 22 Nov 2026 | Header, 1.2, 1.3, 2.1 diagram, 2.2.1, 2.2.3, 2.2.4, 2.3.2, 2.3.4, 2.3.5, 3.5, 5, 6 | **Gateway and connector tier moved from *Planned* to *Implemented*** (sources: `handovers/sefa.md` and `handovers/arda.md`, checked against the code on `dev`): real HTTP proxies from the gateway to the MCP server and to the agent, Redis-backed rate limiter with in-memory fallback, error bodies of API Contract v1.1 §3.4; connector Redis runtime selected by `REDIS_URL`, `CONNECTOR_FIXED_NOW` test clock, contract metadata in the MCP JSON block, execution log. **MCP/agent status synchronised:** agent stream, Gemini 3 fix, SSE fix and tool log (PR #34, #35, #36, #39) are merged; one `tool_call` log line per executed tool (AC-04.5); Redis now backs the MCP cache. **Deployment finding recorded:** with `compose.yaml` as on `dev`, `mcp-server` is only on the `internal: true` network and cannot reach the Gemini API. The web statements about the chat screen (Y-07, Y-08) and the viewport checks (Y-10) were brought in line with `handovers/yunus.md` v1.1. Statements about measurements that were not run say so. | Murat Can Işık (sources: Sefa, Arda) |
| 1.4 | 22 Nov 2026 | Header, 1.2, 1.3, 2.2.1, 2.2.3, 2.2.4, 3.5, 5, 6 | Brought to `dev` at `1dd775a` after the acceptance runs (Test Results Report v1.1): **AT-01..AT-04 passed** (QA owner, live Chrome and the four-service Compose stack, mock data; AT-04 Run 1 failed AC-04.6 because of the test data, Run 2 passed). The compose `egress` network for `mcp-server` is merged (PR #44), so the deployment finding of version 1.3 is closed. NFR-01 and NFR-02 are now measured (burst of 500 requests). Statements that said "not yet run in the browser" or "open PR" were removed or corrected. Remaining gaps stay listed: `json` content type for standard MCP clients, no provider streaming, NFR-04 and NFR-06 not evaluated, FR-20 not in PA3. | Murat Can Işık |
| 1.5 | 28 Nov 2026 | Header, 3.7 | Demo format corrected: the four use cases are shown in a recorded video submitted by 5 December 2026 (no live or oral session; see `README.md`). The planned project closure of 15 January 2027 (Project Plan) is unchanged | Yunus Emre Biçer |

---

## Table of Contents

- [Change Record](#change-record)
- [1. System Overview](#1-system-overview)
  - [1.1 Brief Project Description](#11-brief-project-description)
  - [1.2 System Architecture](#12-system-architecture)
  - [1.3 Technology Stack](#13-technology-stack)
- [2. Implementation Details](#2-implementation-details)
  - [2.1 Codebase Structure](#21-codebase-structure)
    - [2.1.1 Monorepo Layout and Ownership](#211-monorepo-layout-and-ownership)
    - [2.1.2 Package Dependencies](#212-package-dependencies)
    - [2.1.3 Build, Test, and Branch Conventions](#213-build-test-and-branch-conventions)
    - [2.1.4 Inside packages/connectors](#214-inside-packagesconnectors)
  - [2.2 Key Implementations](#22-key-implementations)
    - [2.2.1 MCP Server & AI Agent Middleware](#221-mcp-server--ai-agent-middleware)
    - [2.2.2 Frontend & Bilingual Deterministic Intent Router](#222-frontend--bilingual-deterministic-intent-router)
    - [2.2.3 Campus Connectors, TTL Caching & Data Resilience](#223-campus-connectors-ttl-caching--data-resilience)
    - [2.2.4 API Gateway, Identity Perimeter & Rate Limiting](#224-api-gateway-identity-perimeter--rate-limiting)
  - [2.3 Component Interfaces](#23-component-interfaces)
    - [2.3.1 Shared Domain & Protocol Contracts (packages/shared)](#231-shared-domain--protocol-contracts-packagesshared)
    - [2.3.2 MCP Server & ToolDispatcher Signatures (apps/mcp-server)](#232-mcp-server--tooldispatcher-signatures-appsmcp-server)
    - [2.3.3 Frontend Router & View State Contracts (apps/web)](#233-frontend-router--view-state-contracts-appsweb)
    - [2.3.4 Connector, Cache & Resilience Signatures (packages/connectors)](#234-connector-cache--resilience-signatures-packagesconnectors)
    - [2.3.5 API Gateway & Perimeter Security Signatures (apps/api-gateway)](#235-api-gateway--perimeter-security-signatures-appsapi-gateway)
    - [2.3.6 MCP Registered Tool Contracts & Zero-Trust Identity Boundary](#236-mcp-registered-tool-contracts--zero-trust-identity-boundary)
  - [2.4 Visual Interfaces](#24-visual-interfaces)
    - [2.4.1 Campus at a Glance Dashboard Layout](#241-campus-at-a-glance-dashboard-layout)
    - [2.4.2 Conversational Assistant Layout](#242-conversational-assistant-layout)
    - [2.4.3 Responsive Viewport Compatibility (NFR-07)](#243-responsive-viewport-compatibility-nfr-07)
- [3. Use Case Support in Design](#3-use-case-support-in-design)
  - [3.1 Selected Use Cases and Requirements Traceability](#31-selected-use-cases-and-requirements-traceability)
  - [3.2 UC-01 — View Cafeteria Menu](#32-uc-01--view-cafeteria-menu)
  - [3.3 UC-02 — View Shuttle Schedule](#33-uc-02--view-shuttle-schedule)
  - [3.4 UC-03 — View Library Occupancy](#34-uc-03--view-library-occupancy)
  - [3.5 UC-04 — Ask a Combined Course, Shuttle, and Menu Question](#35-uc-04--ask-a-combined-course-shuttle-and-menu-question)
  - [3.6 Cross-Use-Case UI State Rules](#36-cross-use-case-ui-state-rules)
  - [3.7 Final Demonstration Obligations](#37-final-demonstration-obligations)
- [4. Design Decisions (Technology Comparisons)](#4-design-decisions-technology-comparisons)
  - [4.1 Redis vs. Process In-Memory Map](#41-redis-vs-process-in-memory-map)
  - [4.2 Fastify vs. Express](#42-fastify-vs-express)
- [5. GitHub Commit Requirement & Repository Artifacts](#5-github-commit-requirement--repository-artifacts)
- [6. Document-Specific Task Matrix](#6-document-specific-task-matrix)

---

## 1. System Overview

### 1.1 Brief Project Description

**Campus Data Orchestrator** is an open-standard integration platform built on the **Model Context Protocol (MCP)** over JSON-RPC 2.0. In modern universities, everyday student operations are digitally fragmented across isolated silos: cafeteria menus reside on external catering web portals, course schedules are locked inside proprietary Student Information Systems (SIS), campus shuttle ("ring") schedules are hosted on transit trackers, and study space availability is recorded on disconnected turnstile IoT hardware feeds. Answering simple everyday inquiries (such as *"What is for lunch today, and can I catch a ring after my 10:30 class?"*) forces students to switch between multiple portals and manually synthesize contradictory information.

The Campus Data Orchestrator solves this fragmentation by placing a stateless, high-throughput MCP middleware server between campus data feeds and end users. It exposes four core campus services as strictly validated MCP tools, providing two complementary consumption pathways: a **Campus at a Glance Dashboard** that serves frequently requested telemetry (menus, shuttles, library occupancy) instantly from cache without invoking an AI model, and an **Autonomous Conversational Assistant** powered by a Large Language Model (Google Gemini) that plans multi-tool reasoning sequences and synthesizes unified responses. The system enforces strict perimeter identity isolation to prevent student credentials from leaking to external LLM providers and maintains fault isolation through multi-tiered caching (in-memory in Phase 2; Redis in Phase 3), circuit breaking, and synthetic mock fallback.

### 1.2 System Architecture

The system is organized into a **5-tier decoupled architecture**, separating presentation, security perimeter enforcement, agentic reasoning, protocol dispatching, and upstream campus connectors:

1. **Presentation Tier:** Hosts the dual-view web experience (Fast-Access Dashboard and Streaming Conversational Assistant) paired with a client-side **Bilingual Deterministic Intent Router (FR-16)** that classifies incoming natural language queries into either direct widget or agent paths.
2. **API Gateway & Security Tier (Fastify):** Enforces zero-trust perimeter security, verifies JWTs issued by a local mock SSO authority, strips raw credentials to ensure 100% token isolation, enforces per-identity sliding-window rate limiting (FR-07, FR-08), and injects verified internal identity headers (`X-Authenticated-Student-Id`, `X-Authenticated-User-Role`).
3. **AI Agent & MCP Client Tier:** Orchestrates multi-step reasoning plans using Google Gemini (behind a Provider Adapter), applies an in-memory regex pipeline to scrub student Personally Identifiable Information (PII) before external prompt dispatch (FR-14), and invokes MCP tools via standardized JSON-RPC envelopes (FR-13).
4. **MCP Server Core Middleware (Node.js & TypeScript):** The central stateless coordination engine developed by Murat. It implements the Model Context Protocol specification over stdio, legacy HTTP+SSE (`SSEServerTransport`), and direct JSON-RPC HTTP transports (with true Streamable HTTP transport planned for Phase 3) (FR-01, FR-02), registers four strictly validated tools, executes input validation via Zod schemas, enforces perimeter authorization context, and coordinates multi-tiered caching (FR-09), stale-if-error fallback (FR-10), and circuit breaking (FR-11).
5. **Connector Integration Tier (`ICampusConnector`):** Implements pluggable data adapters developed by Arda. Each connector implements a unified interface supporting both live scraping/APIs and deterministic synthetic mock fixtures (FR-12) for air-gapped automated testing.

#### Implementation Maturity Separation

To ensure absolute engineering transparency, the system architecture distinguishes clearly between components operational in the current Phase 2 milestone and components planned for Phase 3 integration:

- **Implemented in Phase 2 (Active Repository Codebase):**
  - **Language & Runtime:** Node.js (v24 / v20), TypeScript (v5.4.5 strict mode), and npm workspaces monorepo structure.
  - **Bilingual Deterministic Intent Router (`apps/web`):** Pure TypeScript regex-based intent classification engine (`routeStudentQuery.ts`) supporting Turkish and English query analysis with zero external runtime dependencies (FR-16).
  - **API Gateway Skeleton (`apps/api-gateway`):** Fastify 4.28 server skeleton, custom mock-SSO JWT verification, token termination/stripping, trusted header injection, and in-memory sliding-window rate limiting store (`InMemoryRateLimiterStore`) (FR-07, FR-08).
  - **MCP Server Core (`apps/mcp-server`):** `@modelcontextprotocol/sdk` (v1.32.2) protocol implementation, Zod 3.23.8 strict schema validation, `ToolDispatcher` pipeline with auth guarding, `StdioServerTransport`, `SSEServerTransport` (legacy HTTP+SSE), custom JSON-RPC 2.0 `POST /mcp` endpoint, `/health` heartbeat, and deterministic sample mock flows (FR-01, FR-02, FR-03–06).
  - **Campus Connectors & Resilience (`packages/connectors`):** Pluggable `ICampusConnector` contracts, deterministic seeded synthetic mock data generators (Mulberry32 PRNG), `InMemoryCacheStore`, 3-state circuit breaker state machine, and stale-if-error fallback executor (FR-03–06, FR-09–12).
  - **Test Infrastructure:** Vitest 5.1.0 test runner executing 146 offline unit and integration tests across 10 test files with zero external service dependencies (NFR-08). *(PA2 baseline. On `dev` at `6cc1d07`, 20 Nov 2026: 230 tests in 20 files, of which 111 are web tests.)*

- **Implemented in Phase 3 (PA3, state of `dev` at `13b8fb8`, 22 November 2026) — web client, MCP server, agent, gateway and connector tier:**
  - **Presentation UI (`apps/web`):** Next.js 16.4.6 (App Router), React 19.3.1 and CSS Modules (no Tailwind; team decision, 19 Nov 2026), Turkish UI. Pages: dashboard `/`, assistant `/asistan`, login `/giris`, health check `/healthz` (FR-18, NFR-09 web part).
  - **Dashboard cards and gateway client:** three cards (cafeteria, shuttle, library) using a typed client for `POST /api/v1/query` (API Contract v1.1 §3.2, §3.4) and a fixture mode with a visible "Örnek veri modu" (sample data mode) banner (FR-18, FR-19).
  - **Mock-SSO login and sign-out (FR-15):** two fixed synthetic personas; JWT kept only in `sessionStorage`.
  - **Chat stream client (FR-17):** `fetch()`-based SSE parser and turn-state reducer for `POST /api/v1/chat/stream`. The chat screen that uses it (Y-07) is merged (PR #32).
  - **Web Docker image** with standalone Next.js output and `/healthz` (NFR-09, web part).
  - **MCP server on real connectors (M-02, PR #26):** the four tools are served by the `packages/connectors` runtime (mock mode, TTL cache, stale-if-error, circuit breaker); responses carry `isSimulated`, `isStale`, `source`, `timestamp` and `durationMs`; the internal service sends no CORS header. MCP Docker image (M-13).
  - **AI agent (M-04..M-07, PR #29):** `AgentOrchestrator` with an `LlmProvider` boundary, `GeminiProvider` (REST through `fetch`, no SDK), `FakeProvider` for tests only, fail-closed PII scrubber and a redacted outbound log (FR-13, FR-14).
  - **Agent stream, Gemini fixes, SSE fix and tool log (PR #34, #35, #36, #39, merged):** `POST /internal/agent/stream`; Gemini 3 `thoughtSignature` handling, retry on transient errors and the default model `gemini-3.5-flash-lite`; session fix of the legacy MCP SSE transport; one `tool_call` log line per executed tool.
  - **API gateway (`apps/api-gateway`, S-01, S-03):** real HTTP proxy to the MCP server (`POST /api/v1/query`) and to the agent (`POST /api/v1/chat/stream`, SSE passed through), mock-SSO login, error bodies of API Contract v1.1 §3.4, sliding-window rate limiter backed by Redis with an in-memory fallback. Verified in the three-service Compose stack (web, gateway, Redis).
  - **Connector tier (`packages/connectors`, A-01..A-12, PR #30 and #31):** Redis cache runtime selected by `REDIS_URL`, `CONNECTOR_FIXED_NOW` test clock, `source`/`isSimulated`/`isStale`/`timestamp`/`durationMs` metadata in the MCP JSON block, one execution log line per call, per-student cache isolation.
  - **Four-service Compose stack:** builds and starts healthy from `compose.yaml` (`redis`, `mcp-server`, `api-gateway`, `web`); `mcp-server` has an isolated `egress` network for the Gemini API (PR #44) while `web` cannot reach `mcp-server` or `redis`. AT-01..AT-04 were executed in this stack on 22 Nov 2026 (QA owner, [`Test_Results_Report.md`](assignment3/Test_Results_Report.md) v1.1; evidence `docs/assignment3/evidence/`).

- **Planned for Phase 3 (Core Development Roadmap):**
  - **Presentation UI (remaining):** the chat screen with a streamed answer and one badge per tool (Y-07, Y-08) is merged (PR #32). The viewport and browser checks (Y-10) are recorded in [`handovers/yunus.md`](assignment3/handovers/yunus.md) v1.1 (Chromium and Firefox done; Safari was checked by Arda in the PR #33 discussion).
  - **AI Agent — remaining work:** none for the acceptance criteria: AT-04 Run 2 passed on 22 Nov 2026 in live Chrome with the real Gemini provider (Run 1 had failed AC-04.6 because of the test data, fixed in AT v0.7). Known limits: the answer is generated first and then split into chunks (no provider streaming; the first text appeared after 13.5 s in that run, the UI limit is 20 s), and standard MCP clients reject the `json` content type of tool results. Results obtained with `FakeProvider` are never reported as the real UC-04 run.
  - **Measurements (NFR-01, NFR-02):** measured on the four-service stack with a burst of 500 requests from 20 virtual students (Sefa): cached round trip p95 44.41 ms (target < 250 ms) and cache hit ratio 99.4 % (target ≥ 90 %); this is a burst, not a soak test. **Not evaluated:** 100 users on 2 instances (NFR-04) and the SUS usability session (NFR-06).
  - **Not done and not planned for PA3:** the Fastify ecosystem plugins (`@fastify/jwt`, `@fastify/rate-limit`, `@fastify/http-proxy`; the gateway uses its own verifier, rate limiter and proxy code on Fastify core) and the official MCP Streamable HTTP transport.
  - **Persistence & Telemetry:** PostgreSQL 16 database and Prisma ORM for cryptographically hashed student audit records, tool execution latency telemetry, and error logging (FR-20).

#### Dual Data Flow Pathways

The architecture supports two distinct execution paths based on query complexity:

- **Path A: Direct Fast-Path (`DIRECT_WIDGET`):** Simple, single-domain queries (e.g., *"yemekte ne var"*, *"next ring to metro"*, *"library floor 2 occupancy"*) contain no conjunctions or inter-service dependencies. The client-side intent router identifies the target service and bypasses the AI Agent tier entirely, dispatching a direct query to the MCP tool endpoint through the gateway. Responses resolve directly from cache, consuming zero LLM tokens and comfortably satisfying the overall P95 < 250 ms (target) response time requirement (NFR-01).
- **Path B: Agentic Orchestration Path (`LLM_AGENT`):** Compound, multi-service, or ambiguous inquiries (e.g., *"Can I eat lunch and catch the ring after my morning lecture?"*) are routed to the AI Agent. The agent extracts temporal constraints, plans multiple tool invocations (`get_course_schedule` → `get_cafeteria_menu` → `get_shuttle_schedule`), invokes the MCP Server via `tools/call`, and synthesizes a unified Markdown response with live execution telemetry badges.

```mermaid
flowchart TD
    subgraph Tier1["1. Presentation Tier (Next.js 16 App Router, implemented in PA3)"]
        ClientUI["Web Client: Dashboard (/) + Assistant (/asistan)"]
        Router{"Bilingual Deterministic Intent Router (FR-16)"}
        Rewrite["Next.js server: rewrites /api/v1/* to GATEWAY_URL"]
        ClientUI -->|"User Query"| Router
    end

    subgraph Tier2["2. API Gateway & Security Perimeter (Fastify)"]
        Gateway["Fastify API Gateway"]
        AuthBoundary["JWT Token Termination & Header Injection (FR-07)"]
        RateLimiter["Sliding-Window Rate Limiter (Redis when REDIS_URL is set, in-memory fallback)"]
        Gateway --> AuthBoundary
        AuthBoundary --> RateLimiter
    end

    subgraph Tier3["3. AI Agent & Orchestration Tier (PA3, inside the MCP process)"]
        Agent["Agent Orchestrator (FR-13; Gemini over REST, FakeProvider for tests)"]
        PIIFilter["Zero-Leakage PII Scrubber + redacted outbound log (FR-14)"]
        GeminiAPI["Google Gemini LLM API (External Provider)"]
        Agent --> PIIFilter
        PIIFilter --> GeminiAPI
    end

    subgraph Tier4["4. MCP Server Core Middleware (Node.js & TypeScript)"]
        MCPServer["MCP Server (FR-01, FR-02: Stdio + Legacy SSE)"]
        ToolRegistry["Tool Definitions Registry (Strict Schemas)"]
        Dispatcher["ToolDispatcher Engine & Auth Guard"]
        CacheStore["Multi-Tiered Cache (Redis in Compose; in-memory for tests and offline development)"]
        CircuitBreaker["Isolated Circuit Breakers (FR-11)"]

        MCPServer --> ToolRegistry
        MCPServer --> Dispatcher
        Dispatcher --> CacheStore
        CacheStore --> CircuitBreaker
    end

    subgraph Tier5["5. Connector Integration Tier (Arda)"]
        DiningConn["Cafeteria Connector (FR-03: Seeded Mock)"]
        ShuttleConn["Shuttle Transit Connector (FR-04: Seeded Mock)"]
        LibraryConn["Library Occupancy Connector (FR-05: Seeded Mock)"]
        SISConn["SIS Timetable Connector (FR-06: Seeded Mock)"]

        CircuitBreaker --> DiningConn
        CircuitBreaker --> ShuttleConn
        CircuitBreaker --> LibraryConn
        CircuitBreaker --> SISConn
    end

    %% Data Routing Links
    Router -->|"Atomic Query: DIRECT_WIDGET"| Rewrite
    Router -->|"Compound Query: LLM_AGENT"| Rewrite
    Rewrite -->|"Same-origin /api/v1/* (no CORS)"| Gateway
    Gateway -->|"Proxied Auth Context (X-Authenticated-*)"| Agent
    Gateway -->|"Direct Fast-Path Tool Invocations"| MCPServer
    Agent -->|"Standardized tools/call Envelopes"| MCPServer
```

### 1.3 Technology Stack

The system distinguishes between technologies actively implemented and executed within the Phase 2 skeleton and external production services planned for Phase 3 containerization:

| Architectural Tier | Technology / Library | Version / Baseline | Status | Justification & Responsibility |
| :--- | :--- | :--- | :--- | :--- |
| **Language & Runtime** | Node.js, TypeScript | Node.js v24 / v20, TS 5.4.5 | **Implemented (Phase 2)** | Foundation execution environment, strict compiler rules (`strict: true`, `NodeNext`), npm workspaces monorepo. |
| **MCP Server Core** | `@modelcontextprotocol/sdk` | SDK 1.32.2 | **Implemented (Phase 2)** | Stateless JSON-RPC 2.0 protocol implementation, Stdio and legacy HTTP+SSE (`SSEServerTransport`) transports, `/mcp` and `/health` endpoints (FR-01, FR-02). |
| **Schema Validation** | Zod | Zod 3.23.8 | **Implemented (Phase 2)** | Runtime parameter validation enforcing strict JSON Schema schemas (`additionalProperties: false`, `.strict()`) across all MCP tools. |
| **Intent Routing** | TypeScript RegExp Engine (`apps/web`) | TS 5.4.5 | **Implemented (Phase 2)** | Client-side bilingual (Turkish/English) deterministic intent classification (`routeStudentQuery`) with zero external runtime dependencies (FR-16). |
| **API Gateway Core** | Fastify | Fastify 4.28.1 | **Implemented (PA3)** | Mock-SSO JWT verification, token termination and header injection, HTTP proxy to the MCP server and to the agent (SSE pass-through), Redis-backed rate limiting with in-memory fallback, API Contract v1.1 §3.4 error bodies (FR-07, FR-08). |
| **Connector Resilience** | In-Memory Cache & Circuit Breaker | Native TypeScript | **Implemented (Phase 2)** | Seeded synthetic mock generators (Mulberry32 PRNG), `InMemoryCacheStore`, 3-state circuit breaker, and stale-if-error fallback executor (FR-03–06, FR-09–12). |
| **Testing & Verification** | Vitest | Vitest 5.1.0 | **Implemented (Phase 2)** | Offline/mock unit and integration testing suite (146 tests, 10 files in PA2; 230 tests, 20 files on `dev` at `6cc1d07`) for air-gapped CI/CD compliance (NFR-08). |
| **Presentation UI** | Next.js (App Router), React, CSS Modules | Next.js 16.4.6, React 19.3.1 | **Implemented (Phase 3)** | Dashboard with three cards, mock-SSO login/sign-out and the SSE chat stream client (FR-15, FR-17, FR-18). The chat screen with the streamed answer and tool badges is implemented (Y-07, Y-08, PR #32). Tailwind CSS was dropped in favour of CSS Modules (fewer dependencies; team decision, 19 Nov 2026). |
| **AI / LLM Integration** | Google Gemini REST API (`generateContent`) through `fetch`; no SDK | Default model `gemini-3.5-flash-lite` (`GEMINI_MODEL`); model availability depends on the account | **Implemented (PA3)**: agent core, stream endpoint, Gemini 3 fix and tool log on `dev` (PR #29, #34, #35, #39); AT-04 Run 2 passed in live Chrome with the real provider on 22 Nov 2026 | Multi-tool function calling, contextual synthesis, prompt PII scrubber (FR-13, FR-14). On 21 Nov 2026 `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` answered 404 for the team key, so the model name must be re-checked before the demo. |
| **Centralized Caching** | Redis | Redis 7.2 (Alpine) | **Implemented (PA3)** | Shared TTL cache of the connector tier (`RedisCacheStore` through the official `redis` client, selected by `REDIS_URL`) and the sliding-window rate limiter of the gateway (FR-08–11). Seen working in the four-service Compose stack; cache hit ratio 99.4 % and cached p95 44.41 ms in the NFR-01/NFR-02 benchmark (burst of 500 requests). |
| **Gateway Production Plugins** | `@fastify/jwt`, `@fastify/rate-limit`, `@fastify/http-proxy` | Latest Fastify 4.x Plugins | **Not used (not planned for PA3)** | The gateway implements JWT verification, rate limiting and proxying itself on Fastify core (no extra dependencies). |
| **Persistence & Telemetry** | PostgreSQL, Prisma ORM | PostgreSQL 16, Prisma 5.x | **Planned (Phase 3)** | Cryptographically hashed student audit records, tool execution latency telemetry, and error logging (FR-20). |

---

## 2. Implementation Details

### 2.1 Codebase Structure

#### 2.1.1 Monorepo Layout and Ownership

The repository is organized as a single **npm workspaces** monorepo written in **TypeScript (strict mode, `module: NodeNext`)**. The layout maps directly to the team task assignments defined in Project Plan §11.1:

```text
BIL481-2026-Project/
├── README.md                  # Project overview, team members, quickstart guide
├── package.json               # Monorepo root: workspaces [apps/*, packages/*], scripts
├── package-lock.json          # Locked dependency tree
├── tsconfig.base.json         # Shared strict compiler configuration (NodeNext, ES2022)
├── vitest.config.mts          # Unified test configuration across monorepo workspaces
├── .env.example               # Full template of environment variables (zero committed secrets)
├── .gitignore                 # Exclusion rules: node_modules/, dist/, .env, .env.local
├── f26_assignment1.pdf        # Course assignment specification
├── packages/
│   ├── shared/                # Core contracts, domain types, tool inputs, constants (Murat)
│   └── connectors/            # 4 campus connectors, mock fixtures, cache & resilience (Arda)
├── apps/
│   ├── mcp-server/            # MCP server, ToolDispatcher, stdio/HTTP transports (Murat)
│   ├── web/                   # Next.js web client, bilingual deterministic intent router (Yunus)
│   │   ├── src/app/           # Pages: / (dashboard), /asistan, /giris, /healthz
│   │   ├── src/components/    # Dashboard, cards/, QueryBox, SessionProvider, SiteHeader, LoginForm
│   │   ├── src/lib/           # gateway/ (query client), chat/ (SSE stream client), auth/ (mock-SSO)
│   │   ├── src/router/        # routeStudentQuery (FR-16)
│   │   ├── tests/             # Web unit tests and fixtures
│   │   └── Dockerfile         # Standalone Next.js image (PA3)
│   └── api-gateway/           # Fastify gateway, JWT termination, rate limiter (Sefa)
├── tests/
│   ├── mcp-server/            # Unit tests for ToolDispatcher, registry, mock flow (Murat)
│   └── connectors/            # Unit & integration tests for connectors, cache, circuit breaker (Arda)
├── comparisons/
│   ├── Redis-vs-memory/       # Design Decision 4.1 code, benchmarks, README (Arda)
│   └── Fastify-vs-Express/    # Design Decision 4.2 code, benchmarks, README (Sefa)
└── docs/
    ├── Concept Notes.pdf      # Assignment 0 concept proposal
    ├── Project_Definition_Document.md, Project_Plan_Document.md, Requirements_Document.md
    ├── Design_Document.md     # Consolidated Project Assignment 2 deliverable
    ├── QA_Plan.md             # Quality Assurance and verification plan (Sefa)
    ├── _sections/             # Individual component design drafts (Murat, Yunus, Arda, Sefa)
    ├── wireframes/            # Low-fidelity SVG visual interface wireframes (Yunus)
    └── assignment3/           # PA3: contracts/, acceptance tests, deployment plan, test results, evidence/, handovers/
```

**Ownership Rule:** Each team member commits primarily within their designated subsystem. Shared interfaces change exclusively in `packages/shared` under Murat's coordination. All features merge into `dev` through peer-reviewed pull requests.

#### 2.1.2 Package Dependencies

```mermaid
flowchart LR
    shared["packages/shared<br/>(contracts, constants)"]
    connectors["packages/connectors<br/>(connectors, cache, resilience)"]
    mcp["apps/mcp-server<br/>(registry, dispatcher, agent)"]
    gateway["apps/api-gateway<br/>(Fastify, JWT, rate limit)"]
    web["apps/web<br/>(router, UI)"]

    connectors --> shared
    mcp --> shared
    mcp -- "createConnectorRuntime +<br/>registerConnectorHandlers (M-02)" --> connectors
    gateway --> shared
    web --> shared
    web -. "HTTP /api/v1 via Next.js rewrite (PA3)" .-> gateway
    gateway -- "HTTP /mcp, /internal/agent/stream" --> mcp
```

- Solid lines indicate compile-time TypeScript package dependencies.
- `packages/connectors` depends only on `packages/shared`. It accepts any handler registry adhering to `{ registerHandler(name, handler) }` (structural typing), eliminating circular dependencies with `apps/mcp-server`.

#### 2.1.3 Build, Test, and Branch Conventions

| Topic | Monorepo Convention |
| :--- | :--- |
| **Compiler Standard** | TypeScript 5.4+, `strict: true`, `noImplicitAny: true`, `noUncheckedIndexedAccess: true`, `NodeNext` module resolution (explicit `.js` extensions). |
| **Workspace Build** | `tsc` per package into `dist/` (git-ignored); `packages/shared` compiles before dependent packages. |
| **Testing Strategy** | Vitest 5.1.0 with root configuration; all suites execute in offline mock mode (NFR-08). |
| **Secret Management** | Credentials reside strictly in `.env`; template keys with placeholders are maintained in `.env.example`. |
| **Git Workflow** | Named feature branches (`feat/*`, `docs/*`) → Pull Request into `dev` → Peer review → Promotion to stable `main`. |

#### 2.1.4 Inside `packages/connectors`

```text
packages/connectors/src/
├── index.ts                     # Public API barrel exports
├── types.ts                     # ConnectorMode, ManagedCampusConnector, ConnectorHealth
├── errors.ts                    # Hierarchical errors: caller errors vs upstream errors
├── config.ts                    # Environment parser, TTLs, seed, upstream timeouts
├── factory.ts                   # createCampusConnectors(), checkConnectorHealth()
├── runtime.ts                   # createConnectorRuntime(): bootstrap bundle for MCP server
├── handlers.ts                  # MCP tool handlers & registerConnectorHandlers()
├── connectors/                  # MockCafeteria, MockShuttle, MockLibrary, MockCourseSchedule, UnavailableLive
├── mock/                        # seededRandom (Mulberry32), turkeyTime (UTC+3), fixtures/
├── cache/                       # CacheStore, InMemoryCacheStore, RedisCacheStore, cacheKeys
├── resilience/                  # CircuitBreaker, withTimeout, ResilientConnectorExecutor
└── testing/                     # FaultInjectingConnector (for failure injection tests)
```

---

### 2.2 Key Implementations

#### 2.2.1 MCP Server & AI Agent Middleware

*Lead: Murat Can Işık (`apps/mcp-server`)*

The core middleware server coordinates tool discovery, validation, dispatching, and agent planning:

1. **Tool Registry & Strict Schemas (`src/registry/toolDefinitions.ts`):** Registers the four authoritative tools (`get_cafeteria_menu`, `get_shuttle_schedule`, `get_library_occupancy`, `get_course_schedule`). Every tool declares an `inputSchema` enforcing `additionalProperties: false`. A companion Zod schema (`.strict()`) validates incoming parameters at runtime. Crucially, `studentId` is excluded from `get_course_schedule`.
2. **Tool Dispatcher (`src/dispatcher/ToolDispatcher.ts`):** Serves as the central execution engine through a 5-step pipeline:
   - *Resolution:* Matches tool name; returns `-32601 (Method not found)` if unrecognized.
   - *Identity Perimeter Guard:* Halts `get_course_schedule` with `AuthenticationRequiredError` if `auth.studentId` is absent.
   - *Strict Validation:* Runs Zod schema check; returns JSON-RPC `-32602 (Invalid params)` on validation failure.
   - *Handler Lookup:* Returns a structured `NOT_IMPLEMENTED` error if no handler is attached.
   - *Execution:* Invokes the handler and wraps output in an `MCPToolResponse` envelope.
3. **Dual Transport Layers (`src/server.ts`, `src/index.ts`):**
   - *HTTP Transport (Legacy HTTP+SSE & Custom JSON-RPC Endpoint):* HTTP connectivity uses `@modelcontextprotocol/sdk`'s `SSEServerTransport` (the legacy MCP HTTP-with-SSE protocol: `GET /sse` or `GET /mcp` opens the stream, the client then posts to the `POST /mcp/messages?sessionId=…` endpoint announced in the first event) alongside a custom JSON-RPC 2.0 `POST /mcp` endpoint for the gateway with `X-Authenticated-*` identity extraction, `GET /health` (including `agent.provider`) and the agent stream endpoint (item 6). The SDK announces its own session id, so sessions are keyed by `transport.sessionId`; the MCP Inspector check (M-09) found that an earlier version keyed them by a random id and answered 404 on every message (fixed in PR #36). One `Server` object serves all SSE sessions, so several simultaneous SSE clients are not supported; the gateway does not use SSE. The official MCP Streamable HTTP transport is not implemented and not claimed.
   - *Stdio Transport:* Implemented via `@modelcontextprotocol/sdk`'s `StdioServerTransport` for CLI-based clients (such as Claude Desktop or the MCP Inspector CLI), strictly routing diagnostic logs to `stderr` and reserving `stdout` exclusively for clean JSON-RPC messaging.
4. **Connector Runtime behind the Tools (`src/server.ts`, M-02):** `createCampusMcpServer` builds `createConnectorRuntime()` from `packages/connectors` (mock or live mode per connector, TTL cache, stale-if-error, circuit breaker) and registers its handlers on the dispatcher. The Phase 2 sample handlers (`src/mocks/sampleMockHandlers.ts`) remain only as an opt-in test fixture (`registerSampleMocks`). Tool results carry `isSimulated`, `isStale`, `source`, `timestamp` and `durationMs` in the JSON block (API Contract v1.1 §3.2). With `REDIS_URL` set (always in Compose) the cache is the shared Redis; without it the cache is in-memory with a warning, and `NODE_ENV=production` refuses to start (section 2.2.3 item 6).
5. **AI Agent Orchestrator (`src/agent/`, M-04..M-07):**
   - *Loop (`AgentOrchestrator.run`):* an `AsyncGenerator<AgentEvent>`. The provider asks for tools; each requested call is validated and executed through the `ToolDispatcher` **in the same process** (not as an HTTP `tools/call`) with the gateway-verified `AuthContext`; results go back to the provider; the provider writes the answer. At most 4 provider rounds, the last one offers no tools. Calls requested in one round run in the order the model gives them, not concurrently.
   - *Identity boundary:* the tool declarations offered to the model contain no `studentId`; identity-like arguments (`studentId`, `userId`, `email`, `name`) a model might add are stripped; the student comes only from the verified header. Each tool is executed at most once per run (a repeated request is refused and produces no `tool` event).
   - *Provider boundary (`LlmProvider`):* `GeminiProvider` calls the Gemini REST API with `fetch`; the API key is sent only in the `x-goog-api-key` header. Gemini 3 models attach a `thoughtSignature` to function calls, which is kept on `LlmFunctionCall` and sent back unchanged (otherwise HTTP 400). Transient 429/500/502/503/504 answers are retried twice (500 ms, 1000 ms) inside one overall timeout (15 s default). `FakeProvider` is a deterministic test double and is marked `isFake` in every log entry.
   - *PII (FR-14):* the question and every tool result are scrubbed; the serialized request is checked again (`assertNoPii`) and the run fails closed if an identifier remains. Tool output keeps `isSimulated` and `isStale`, and the system instruction asks the model to say so.
   - *Logs (AC-04.5, AC-04.7):* the agent calls the `ToolDispatcher` inside the MCP process, so no JSON-RPC `tools/call` exists to inspect. Two kinds of lines are written to the console (`[agent-outbound]`, `[agent-tool]`) and, when `AGENT_OUTBOUND_LOG_FILE` is set, to that file: one line per provider request after scrubbing (with `provider` and `isFake`), and one `tool_call` line per **executed** tool with the arguments really dispatched (identity keys removed, values scrubbed), `status` and `durationMs`. A refused call (unknown or repeated tool) writes no line. The history sent back to the provider carries the same cleaned arguments, so an identity key added by the model neither leaks nor aborts the run. Credentials are never part of a logged request.
   - *Errors:* a provider or tool problem ends the run with one `error` event carrying a fixed safe message; details go only to the server log. The answer is produced first and then split into `token` chunks of about three words, so streaming is of the finished answer, not of the provider.
6. **Agent Stream Endpoint (`src/agent/agentStreamHandler.ts`, M-08, PR #34):** `POST /internal/agent/stream` with body `{"message": "…"}` (1–1000 characters, no other key) and identity from `X-Authenticated-Student-Id` / `X-Authenticated-User-Role` (API Contract v1.1 §3.3, §8 Q4). Before the stream: `400 INVALID_PARAMS` for a bad body, `503 AGENT_UNAVAILABLE` when no `GEMINI_API_KEY` is set (the endpoint never falls back to the fake provider), both as JSON in the §3.4 shape. Then `200 text/event-stream; charset=utf-8` with `Cache-Control: no-cache` and the frames `tool` (once per executed tool), `token`, one `done`, or one `error`; a failure after the headers is an `error` event. If the client closes the connection, the provider call is cancelled with an `AbortSignal`. The endpoint does not authenticate; the gateway does, and the port is internal only.
7. **Known limitation (open gap):** the JSON block of a tool result uses `"type":"json"`, which is not a standard MCP content type. The gateway and API Contract §4 rely on it, but a standard MCP client such as the MCP Inspector rejects `tools/call` results (`tools/list` works). A backward-compatible `text` block is planned after the demo.
8. **Network requirement (fixed by PR #44):** the agent calls the Gemini API over HTTPS, so the `mcp-server` container needs outbound internet access. Before PR #44, `mcp-server` was only on the `internal` network (`internal: true`), which has no route out: the first chat request of the four-service run ended with an `error` event (`Gemini request failed: TypeError`, DNS error `EAI_AGAIN`). `compose.yaml` now attaches `mcp-server` to a second plain bridge network, `egress`, used by no other service, and passes `GEMINI_MODEL`; `web` still cannot reach `mcp-server` or `redis` (tested by the QA owner and by Murat).

##### Implementation Status (Murat)

| Subsystem | FR / NFR | Phase 2 Skeleton Status | PA3 Status (21 Nov 2026) |
| :--- | :--- | :--- | :--- |
| **MCP Tool Registry** | FR-01 | **Implemented:** Strict JSON & Zod schemas with `additionalProperties: false`. | Schema discovery via live frontend widgets. |
| **Transports (HTTP & Stdio)** | FR-02 | **Implemented:** `StdioServerTransport`, `SSEServerTransport` (legacy HTTP+SSE), custom `POST /mcp`, `/health` endpoint. | **Partial:** stdio, `POST /mcp` and `tools/list` over SSE verified with the MCP Inspector; SSE session fixed (PR #36); `tools/call` through standard MCP clients is an open gap; Streamable HTTP not implemented. |
| **Tool Dispatcher** | FR-01, FR-06 | **Implemented:** Pipeline, `-32602` error handling, auth guard. | **Implemented:** connected to `packages/connectors` (M-02, PR #26). |
| **Sample Mocks** | FR-03–06 | **Implemented:** Deterministic mock handlers in `apps/mcp-server`. | **Superseded** by Arda's connector package (M-02); kept as an opt-in test fixture only. |
| **AI Agent Orchestrator** | FR-13 | **Implemented:** TypeScript interfaces, skeleton class. | **Implemented** (code): loop, `GeminiProvider`, `FakeProvider`, stream endpoint, Gemini 3 fix and tool log merged (PR #29, #34, #35, #39). **AT-04 Run 2 passed** in live Chrome with the real Gemini provider (QA owner, 22 Nov 2026). |
| **Prompt PII Scrubber** | FR-14 | **Planned:** Architectural boundary defined. | **Implemented** (PR #29): scrubbing, fail-closed check and redacted outbound log. |

---

#### 2.2.2 Frontend & Bilingual Deterministic Intent Router

*Lead: Yunus Emre Biçer (`apps/web`)*

The presentation tier hosts the user-facing web client and lightweight deterministic routing:

1. **Dual-View UX Strategy:**
   - *Campus at a Glance Dashboard:* Renders **three** responsive cards (Cafeteria, Shuttles, Library) loaded concurrently through the gateway without LLM latency (FR-18). The fourth card of the PA2 design (Service Health / connector telemetry) is **not implemented in PA3**: API Contract v1.1 defines no gateway endpoint for it and AT-01..AT-04 do not cover it. `checkConnectorHealth()` remains available in `packages/connectors` for later use.
   - *Conversational Assistant:* Renders streaming responses over SSE, displaying one status/duration badge per invoked tool (FR-17) and resilient error notices (FR-19). *PA3 status: the stream client and the chat screen with one badge per tool are implemented (Y-07, Y-08, PR #32).*
2. **Bilingual Deterministic Intent Router (FR-16):** Implemented in `apps/web/src/router/routeStudentQuery.ts`. Evaluates natural language queries without network or LLM dependencies:
   - *Step 1:* Normalizes Unicode diacritics, Turkish characters (ç, ğ, ı, ö, ş, ü), case, and whitespace.
   - *Step 2:* If empty, routes to `LLM_AGENT (EMPTY_QUERY)`.
   - *Step 3:* Inspects compound conjunctions (`and`, `then`, `after`, `ve`, `sonra`, commas, `before`, `with`, `ile`, `önce`). If present, routes to `LLM_AGENT (COMPOUND_QUERY)`.
   - *Step 3b (added in PA3):* If the query contains a personal-timetable word (`ders…`, `sınav…`, `laboratuvar…`, `class(es)`, `lecture(s)`, `course(s)`, `exam(s)`), routes to `LLM_AGENT (PERSONAL_QUERY)`, even if it also names a cafeteria, shuttle or library keyword.
   - *Step 4:* Evaluates regex keyword groups for Cafeteria, Shuttle, and Library. Turkish keywords accept suffixes (`servis\w*`, `kutuphane\w*`, `ring\w*`, `metro\w*`, …); English plurals and the words `bus` and `eat` are included (PA3).
   - *Step 5:* If 0 domains match → `LLM_AGENT (UNMATCHED_QUERY)`; if > 1 match → `LLM_AGENT (AMBIGUOUS_QUERY)`.
   - *Step 6:* If exactly 1 domain matches → returns `DIRECT_WIDGET` mapped to the corresponding MCP tool name (`get_cafeteria_menu`, `get_shuttle_schedule`, `get_library_occupancy`).
   - *Identity Protection:* Course queries are never routed directly; they require authenticated session context and route to `LLM_AGENT`.
3. **Router Verification (updated in PA3):** The original 40-query benchmark (20 Turkish, 20 English, written together with the patterns) still passes. On a **held-out set of 40 unseen queries** the PA2 router scored **82.5 %** (compound → agent 7/10) and on a further **20-query validation set 65 %** (compound 3/4) — below the FR-16 targets. After a category-based fix (suffixes, plurals, personal-timetable words) both sets reach 100 % (compound 10/10 and 4/4). The validation result is optimistic because that set was written after the error categories were known. Evidence: [`docs/assignment3/evidence/fr16-router/`](assignment3/evidence/fr16-router/).

##### Implementation Status (Yunus)

| Subsystem | FR / NFR | Phase 2 Skeleton Status (**Implemented**) | Phase 3 Core Development Status (**Planned**) |
| :--- | :--- | :--- | :--- |
| **Query Normalization** | FR-16 | **Implemented:** Turkish diacritic & case normalization. | Expand colloquial slang dictionary. |
| **Intent Router** | FR-16 | **Implemented:** Deterministic regex classification algorithm. | Telemetry tracking for misclassifications. |
| **Shared Tool Mapping** | FR-16 | **Implemented:** Binds directly to `packages/shared`. | Direct UI widget auto-triggering. |
| **Dashboard UI** | FR-18 | **Planned:** Low-fidelity SVG wireframe defined. | **Implemented (PA3):** three cards, gateway client, fixture mode. |
| **SSE Chat Stream** | FR-17, FR-19 | **Planned:** State model & retry backoff designed. | **Client implemented (PA3):** `fetch()` stream + incremental SSE parser, no automatic reconnect. Chat screen **implemented** (Y-07, Y-08, PR #32). |
| **Login / Sign-out** | FR-15 | — | **Implemented (PA3):** mock-SSO login with two synthetic personas, `sessionStorage` session, sign-out. |

---

#### 2.2.3 Campus Connectors, TTL Caching & Data Resilience

*Lead: Arda Çelik (`packages/connectors`)*

The connector tier wraps campus services, enforcing caching and failure isolation:

1. **Unified Connector Interface & Mode Switching (FR-12):** Connectors implement `ICampusConnector<TInput, TOutput>` alongside `ManagedCampusConnector` metadata (`name`, `mode`, `isMock`, `healthCheck()`). Connectors read environment variables (`CAFETERIA_CONNECTOR_MODE=mock|live`, etc.) at startup. Missing values default to `mock`; invalid strings fail fast with `ConnectorConfigError`. When set to `live`, `UnavailableLiveConnector` is bound, returning structured unavailable errors until real campus endpoints are approved (Project Definition §4.3).
2. **Deterministic Synthetic Data Generation (FR-03–FR-06):** Employs an FNV-1a seeded **Mulberry32 PRNG** (`CONNECTOR_MOCK_SEED=481-FALL-2026`). Turkey Local Time (UTC+3) is enforced to ensure reproducibility across time zones:
   - *Cafeteria (FR-03):* Weekdays return realistic 4-course lunch and 3-course dinner with calorie sums and allergen tags; weekends return `available: false` with explanatory message.
   - *Shuttle (FR-04):* Generates chronological future departure slots strictly greater than current system time (second precision); returns active vehicle counts.
   - *Library (FR-05):* Generates floor-level seat counts conforming to hourly bell curves with `isSimulated: true`; floor sums strictly equal total occupancy.
   - *Course Schedule (FR-06):* Binds synthetic schedules to `auth.studentId`. Every student is assigned BIL 481 (Tue 08:30–10:20, Thu 13:30–15:20) ensuring consistent demonstration conditions.
3. **Multi-Tiered TTL Caching (FR-09):** Implements cache-aside via `CacheStore` (`InMemoryCacheStore` for tests and offline development; `RedisCacheStore` over the official `redis` client for the deployed stack, selected by `REDIS_URL`, item 6). Values are cached for standard TTLs (Dining: 3600s, Shuttle: 120s, Library: 60s, Schedule: 300s) and physically retained for **3 × TTL** to serve as stale fallback data.
4. **Stale-If-Error Fallback (FR-10):** Upstream queries enforce an **800 ms timeout** (`UPSTREAM_TIMEOUT_MS`). Upon timeout, connector error, or circuit trip, the executor returns the retained expired cache entry marked with `isStale: true` and the original `timestamp`. If no cache exists, a structured error is returned.
5. **Connector-Level Circuit Breaking (FR-11):** An isolated `CircuitBreaker` protects each connector. Tripping threshold: 3 consecutive failures; cooldown: 60,000 ms. While open, calls immediately return stale cache or error without generating network traffic. A single probe request is permitted in half-open state.
6. **Redis Runtime (`src/cache/redisClient.ts`, A-02):** `createCacheStoreFromEnv()` waits for Redis and fails fast; `createCacheStoreFromEnvSync()` (used by the MCP server) connects in the background. Rule: `REDIS_URL` set → shared Redis; unset → in-memory store with a warning on stderr, except under `NODE_ENV=production`, where the process refuses to start (`ConnectorConfigError`). Commands are not queued while Redis is unreachable and every cache operation is limited to 200 ms, so an outage turns a read into a miss and skips the write instead of consuming the 800 ms upstream budget; the client reconnects in the background (back-off up to 2 s); logs never contain the password part of the URL. Arda ran the Redis tests against a real Redis 7.0 in a separate Linux environment; Murat saw it working in the four-service Compose stack on 22 Nov 2026 (`connector.cache` "ready", keys `cache:dining:<date>`, `cache:schedule:<hash>:<day>` and `cache:shuttle:<route>`, a repeated request answered `CACHE_HIT`).
7. **Test Clock (`src/clock.ts`, API Contract v1.1 §8 Q3):** `CONNECTOR_FIXED_NOW` (ISO-8601 with an explicit offset, for example `2026-11-23T09:00:00+03:00`) sets the instant at which the connector clock *starts*; it then advances in real time, so TTL freshness, the 3 × TTL retention, the 60 s circuit cooldown and `durationMs` still behave (a frozen clock would keep cached data fresh forever). Unset: real time. An invalid or offset-less value stops the server at startup. A clock injected by unit tests always wins.
8. **Response Metadata (`src/handlers.ts`, A-06, API Contract v1.1 §3.2):** every successful tool result carries `source` (`LIVE`, `CACHE_HIT` or `STALE`, never `MOCK`), `isSimulated`, `isStale`, `timestamp` (when the data was fetched; the original time for stale data) and `durationMs` inside the `content[0]` JSON block of the MCP result, because the MCP HTTP path forwards only `content`, `isError`, `isStale` and `timestamp`. The provenance stored with a cached value wins, so mock data stays labelled synthetic even when it is served stale after a switch to live mode.
9. **Execution Log and Privacy (`src/logging.ts`, `src/cache/cacheKeys.ts`, A-04, A-07):** each `ResilientConnectorExecutor.execute()` writes one JSON line to stderr (`event: connector.execute`, `at`, `connector`, `outcome`, `upstreamCalled`, `cacheKey`, `durationMs`, optional `failureCode`, `circuitState`); stdout stays free for the MCP stdio transport. Acceptance runs count executions from these lines (AC-01.7, AC-02.7, AC-03.6). A line never contains tool arguments, the auth context or a student id; course-schedule cache keys use a SHA-256 prefix of the id (`cache:schedule:<hash>:<day>`), so Redis key listings hold no personal data and two students never share an entry.

```mermaid
sequenceDiagram
    autonumber
    participant D as ToolDispatcher (Murat)
    participant H as Connector Tool Handler
    participant E as ResilientConnectorExecutor
    participant C as CacheStore (Redis / Map)
    participant B as CircuitBreaker [Cafeteria]
    participant K as Cafeteria Connector

    D->>H: get_cafeteria_menu({ date? }, auth)
    H->>H: Resolve date (TR today), build key cache:dining:<date>
    H->>E: execute(connector, input, key, ttl=3600)
    E->>C: get(key)
    alt Fresh Cache Hit (now < freshUntil)
        C-->>E: Return fresh entry
        E-->>H: CACHE_HIT (zero upstream call)
    else Cache Miss or Expired
        E->>B: tryAcquire()
        alt Circuit OPEN
            B-->>E: Execution denied
            E-->>H: STALE fallback (isStale=true, original timestamp)
        else Circuit CLOSED / Half-Open
            E->>K: execute(input) [800 ms timeout]
            alt Success
                K-->>E: Return CafeteriaDailyMenu
                E->>B: recordSuccess()
                E->>C: set(key, entry, retention = 3 * TTL)
                E-->>H: LIVE
            else Upstream Timeout / Error
                E->>B: recordFailure() [3rd failure trips circuit]
                E-->>H: STALE fallback if cache retained, else ERROR
            end
        end
    end
    H-->>D: MCPToolResponse { isError, isStale, isSimulated, source, content }
```

##### Implementation Status (Arda)

| Subsystem | FR / NFR | Phase 2 Skeleton Status | PA3 Status (22 Nov 2026) |
| :--- | :--- | :--- | :--- |
| **Connector Contracts** | FR-12 | **Implemented:** `ManagedCampusConnector` & factory. | **Implemented.** Mock versus unavailable-live semantics are documented in `packages/connectors/README.md` (live mode has no confirmed upstream and returns `UPSTREAM_UNAVAILABLE`). |
| **Deterministic Mocks** | FR-03–06 | **Implemented:** Seeded PRNG mock generators. | **Implemented**; the clock can be pinned with `CONNECTOR_FIXED_NOW` for reproducible acceptance runs. |
| **TTL Cache-Aside** | FR-09 | **Implemented:** `InMemoryCacheStore` & Redis adapter. | **Implemented**; Redis runtime merged (PR #31) and seen working in the four-service Compose stack on 22 Nov (Murat). |
| **Stale-If-Error** | FR-10 | **Implemented:** 800ms timeout & 3×TTL fallback. | **Implemented**; each stale or failed call is logged with its `outcome` and `failureCode`. |
| **Circuit Breakers** | FR-11 | **Implemented:** State machine, 3-fail threshold, 60s cooldown. | **Implemented**; the breaker state is part of every execution log line (`circuitState`). A dashboard gauge is not planned for PA3. |
| **Redis Runtime** | FR-09, NFR-04 | — (not in the skeleton) | **Implemented** (A-02, PR #31): chosen by `REDIS_URL`, bounded operations, background reconnect. Verified against a real Redis 7.0 (Arda) and in the Compose stack (Murat). |
| **Test Clock** | AC-02.5, AC-03.7 | — | **Implemented** (Q3): `CONNECTOR_FIXED_NOW`, advancing clock. |
| **Response Metadata** | FR-12, API Contract §3.2 | — | **Implemented** (A-06): five metadata fields in the MCP JSON block. |
| **Execution Log** | AC-01.7, AC-02.7, AC-03.6 | — | **Implemented** (A-04): one JSON line per call, no arguments or student id. |
| **Measurements** | NFR-01, NFR-02 | — | **Measured** on the four-service stack (Sefa, burst of 500 requests): cached p95 44.41 ms, hit ratio 99.4 %. The connector tier alone was also measured by simulation (hit ratio 98.7 %, Arda). A soak test was not run. |

---

#### 2.2.4 API Gateway, Identity Perimeter & Rate Limiting

*Lead: Ahmet Sefa Efendioğlu (`apps/api-gateway`)*

The API Gateway acts as the zero-trust perimeter security enforcement tier:

1. **Perimeter Threat Model:** External requests carry varying sensitivity. While dining and shuttle queries are public, academic timetables contain private educational records. The gateway ensures external tokens never propagate downstream and external LLM providers never receive auth tokens or raw PII (FR-14, NFR-05).
2. **JWT Authentication & Mock-SSO Verification (FR-07):** Inbound requests pass through a Fastify pre-handler hook (`onRequest` / `preHandler`). Unauthenticated requests are assigned `role: GUEST`. If an `Authorization: Bearer <token>` header is present, the gateway verifies signature and expiry. Upon validation, the gateway:
   - Deletes the raw `Authorization` header (`delete req.headers['authorization']`).
   - Strips any inbound `X-Authenticated-*` headers to defeat header spoofing attacks.
   - Injects verified internal headers: `X-Authenticated-Student-Id: <claims.sub>` and `X-Authenticated-User-Role: <claims.role>`.
3. **Sliding-Window Rate Limiting Engine (FR-08):** rate limiting runs as a second `preHandler` hook after token termination; `/health` is exempt. The store is chosen from the environment (`createRateLimiterStoreFromEnv`): with `REDIS_URL` set, `RedisRateLimiterStore` (sorted-set sliding window over a dependency-free RESP client, `RespTcpRedisClient`) is shared by all gateway instances; without it, `InMemoryRateLimiterStore` is used. If Redis fails, the Redis store falls back to an in-memory store (fail open) rather than rejecting users. Verified in the three-service Compose stack (30 requests accepted, the 31st answered `429 RATE_LIMITED`; evidence `docs/assignment3/evidence/deployment/`):
   - Partition keys: `rate:student:<studentId>` for authenticated users; `rate:ip:<clientIp>` for guests.
   - Sliding window: 60 seconds; ceiling: 30 requests per minute.
   - Rejections return HTTP `429 Too Many Requests` with a standard `Retry-After: <seconds>` header.
4. **Endpoints (`src/server.ts`):** `GET /health`; `POST /api/v1/auth/mock-login` (validates `{studentId, name, email, role?}`, issues an HS256 JWT valid for 3600 s); `GET /api/v1/auth/me`; `POST /api/v1/query`; `POST /api/v1/chat/stream`. The gateway sends no CORS headers: the browser reaches it through the Next.js rewrite of `/api/v1/*` (API Contract v1.1 Q5).
5. **Query Proxy (`src/proxy/mcpProxy.ts`, S-01):** sends a JSON-RPC 2.0 `tools/call` to `MCP_URL`. It rejects `studentId`, `student_id` or `userId` in `parameters` with `400 INVALID_PARAMS` even for an authenticated user, rejects a guest `get_course_schedule` with `401` before calling the MCP server, rejects empty `{}` domain payloads (an empty `[]` is valid for the course schedule) and preserves `meta.source`, `meta.isSimulated`, `meta.isStale`, `meta.timestamp` and `meta.durationMs`.
6. **Chat Stream Proxy (`src/proxy/chatStreamProxy.ts`, S-03):** requires a verified student JWT on every request; validates `message` (1–1000 characters) and forbids identity fields in the body; posts `{"message": "…"}` to `AGENT_STREAM_URL` with the verified `X-Authenticated-*` headers (never `Authorization`) and passes the SSE frames through unchanged. Before the stream, upstream failures map to JSON (`503 UPSTREAM_UNAVAILABLE`, `429 RATE_LIMITED` with `Retry-After`, `504 UPSTREAM_TIMEOUT` after 20 s, `502 DOWNSTREAM_ERROR`); after the headers a failure becomes a safe `error` event (`AGENT_ERROR`). It never retries (API Contract v1.1 §3.3).
7. **Errors and Secrets (`src/http/errorResponse.ts`, `src/auth/jwtVerifier.ts`):** browser-facing errors use `{"ok":false,"error":{"code","message"},"timestamp"}` with the codes `INVALID_PARAMS`, `AUTHENTICATION_REQUIRED`, `RATE_LIMITED`, `UPSTREAM_UNAVAILABLE`, `DOWNSTREAM_ERROR`, `UPSTREAM_TIMEOUT` and `INTERNAL_ERROR` (API Contract v1.1 §3.4). JWT verification accepts only HS256, compares the signature in constant time and checks `sub`, `role`, `exp` and the issuer (`MOCK_SSO_ISSUER`); `JWT_SECRET` is required when `NODE_ENV=production`.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Client / Student
    participant Gateway as Fastify API Gateway
    participant Limiter as Rate Limiter (Redis store, in-memory fallback)
    participant MCP as MCP Middleware Server
    participant SIS as SIS Schedule Connector

    Client->>Gateway: POST /api/v1/query (Authorization: Bearer <JWT>)
    Gateway->>Gateway: 1. Validate JWT signature, expiry & issuer
    alt Invalid or Expired Token
        Gateway-->>Client: 401 AUTHENTICATION_REQUIRED ({ "ok": false, "error": { "code", "message" }, "timestamp" })
    else Valid Token (Student ID: 241101066)
        Gateway->>Gateway: 2. Strip raw Authorization & spoofed X-Authenticated-* headers
        Gateway->>Limiter: 3. Check sliding-window rate limit (rate:student:241101066)
        alt Rate Limit Exceeded (> 30 req/min)
            Gateway-->>Client: 429 RATE_LIMITED (Retry-After header, §3.4 error body)
        else Allowed
            Gateway->>Gateway: 4. Inject verified X-Authenticated-Student-Id: 241101066
            Gateway->>MCP: 5. Forward request over internal HTTP (/mcp) with sanitized headers
            MCP->>SIS: 6. Invoke get_course_schedule (AuthContext: 241101066)
            SIS-->>MCP: Return student timetable
            MCP-->>Gateway: Forward tool response
            Gateway-->>Client: 200 OK (Clean response, zero token echo)
        end
    end
```

##### Implementation Status (Sefa)

| Subsystem | FR / NFR | Phase 2 Skeleton Status | PA3 Status (22 Nov 2026) |
| :--- | :--- | :--- | :--- |
| **Fastify Gateway** | FR-07 | **Implemented:** Server skeleton, CORS, health probe. | **Implemented**: real HTTP proxies to the MCP server and the agent; no CORS headers (Next.js rewrite). Verified in the three-service Compose stack (web, gateway, Redis). |
| **JWT Verification** | FR-07 | **Implemented:** Mock SSO signer and token verifier. | **Implemented**; `JWT_SECRET` required in production. A public-key rotation endpoint is not planned. |
| **Token Termination** | FR-07 | **Implemented:** Header stripping and verified context injection. | **Implemented**; client-supplied `X-Authenticated-*` headers are removed and the raw `Authorization` header is never forwarded. |
| **Rate Limiter** | FR-08 | **Implemented:** In-memory sliding-window store for tests. | **Implemented**: Redis store with in-memory fallback; 31st request in a minute answered `429` in the Compose stack. |
| **Query Proxy** | FR-06, FR-07 | — (not in the skeleton) | **Implemented** (S-01): JSON-RPC proxy to `MCP_URL`, identity parameters rejected, metadata preserved. |
| **Chat Stream Proxy** | FR-17 | — | **Implemented** (S-03): SSE pass-through to `AGENT_STREAM_URL`; the chain gateway → agent → Gemini passed AT-04 Run 2 in live Chrome (22 Nov 2026). |
| **Error Envelope** | API Contract §3.4 | — | **Implemented** (`sendGatewayError`). |

---

### 2.3 Component Interfaces

#### 2.3.1 Shared Domain & Protocol Contracts (`packages/shared`)

*Source: `packages/shared/src/types/`*

```typescript
// packages/shared/src/types/domain.ts
export interface CafeteriaLunchMenu {
  soup: string;
  mainDish: string;
  vegOption: string;
  sideDish: string;
  calories: number;
  allergens?: string[];
}

export interface CafeteriaDinnerMenu {
  soup: string;
  mainDish: string;
  sideDish: string;
  calories: number;
}

export interface CafeteriaDailyMenu {
  date: string;
  lunch: CafeteriaLunchMenu | null;
  dinner: CafeteriaDinnerMenu | null;
  available: boolean;
  unavailableReason?: string;
}

export interface ShuttleRouteData {
  routeId: string;
  routeName: string;
  nextDepartures: string[];
  activeVehicles: number;
  lastUpdated: string;
}

export interface LibraryFloorOccupancy {
  floorId: string;
  name: string;
  occupiedSeats: number;
  maxSeats: number;
  isQuietArea: boolean;
}

export interface LibraryOccupancyReport {
  timestamp: string;
  isSimulated: boolean;
  totalCapacity: number;
  totalOccupied: number;
  floors: LibraryFloorOccupancy[];
}

export interface StudentClassEntry {
  courseCode: string;
  courseTitle: string;
  instructor: string;
  classroom: string;
  day?: string;
  startTime: string;
  endTime: string;
}

// packages/shared/src/types/mcp.ts
export type UserRole = 'STUDENT' | 'FACULTY' | 'GUEST';

export interface AuthContext {
  studentId?: string;
  role: 'STUDENT' | 'FACULTY' | 'GUEST';
}

export interface MCPContentBlock {
  type: string;
  text?: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface MCPToolResponse<T = unknown> {
  isError: boolean;
  content: MCPContentBlock[] | T;
  isStale?: boolean;
  timestamp?: string;
}

export interface ICampusConnector<TInput = unknown, TOutput = unknown> {
  readonly isMock?: boolean;
  execute(input: TInput, context?: AuthContext): Promise<TOutput>;
}
```

---

#### 2.3.2 MCP Server & ToolDispatcher Signatures (`apps/mcp-server`)

*Source: `apps/mcp-server/src/`*

```typescript
// apps/mcp-server/src/dispatcher/ToolDispatcher.ts
export type ToolHandler<TInput = any, TOutput = any> = (
  args: TInput,
  auth: AuthContext
) => Promise<TOutput>;

export interface DispatcherResult<T = unknown> {
  isError: boolean;
  code?: number | string;
  message?: string;
  error?: {
    code: number | string;
    message: string;
    data?: unknown;
  };
  content: Array<{ type: string; text?: string; data?: unknown; [key: string]: unknown }> | T;
  isStale?: boolean;
  timestamp?: string;
}

export class ToolDispatcher {
  public registerHandler<TInput = any, TOutput = any>(
    name: string,
    handler: ToolHandler<TInput, TOutput>
  ): void;

  public hasHandler(name: string): boolean;

  public async dispatch(
    name: string,
    args: unknown,
    auth: AuthContext
  ): Promise<DispatcherResult>;
}

// apps/mcp-server/src/agent/AgentOrchestrator.ts
export interface AgentTelemetryBadge {
  toolName: string;
  status: 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';
  durationMs: number;
}

// Maps 1:1 to the SSE frames of API Contract v1.1 §3.3
export type AgentEvent =
  | ({ type: 'tool' } & AgentTelemetryBadge)            // once per executed tool
  | { type: 'token'; text: string }                      // chunk of the answer
  | { type: 'done'; answer: string; toolsInvoked: string[]; isComplete: true }
  | { type: 'error'; code: 'AGENT_ERROR'; message: string };

export interface AgentSynthesisResult {
  text: string;
  toolsInvoked: string[];
  badges: AgentTelemetryBadge[];
  isComplete: boolean;
}

export interface IAgentOrchestrator {
  executePlan(query: string, auth: AuthContext): Promise<AgentSynthesisResult>;
}

export interface AgentOrchestratorOptions {
  provider?: LlmProvider;      // none: run() throws NOT_IMPLEMENTED, never a fake
  outboundLog?: OutboundLog;   // redacted record of every provider request
  maxRounds?: number;          // default 4; the last round offers no tools
  nowMs?: () => number;
  tokenChunkWords?: number;    // default 3
}

export interface AgentRunOptions {
  pii?: Pick<PiiContext, 'name' | 'email' | 'extraTerms'>;
  signal?: AbortSignal;        // cancels the provider call
}

export class AgentOrchestrator implements IAgentOrchestrator {
  constructor(dispatcher: ToolDispatcher, options?: AgentOrchestratorOptions);
  public getDispatcher(): ToolDispatcher;
  public getProviderName(): string | undefined;
  public run(query: string, auth: AuthContext, options?: AgentRunOptions): AsyncGenerator<AgentEvent>;
  public executePlan(query: string, auth: AuthContext): Promise<AgentSynthesisResult>;
}

// apps/mcp-server/src/agent/LlmProvider.ts
export interface LlmFunctionCall {
  name: string;
  args: Record<string, unknown>;
  thoughtSignature?: string;   // Gemini 3: must be sent back unchanged
}

export interface LlmProvider {
  readonly name: string;       // e.g. "gemini", "fake"
  readonly isFake: boolean;    // written to the outbound log
  generate(request: LlmRequest, signal?: AbortSignal): Promise<LlmResponse>;
}

// apps/mcp-server/src/agent/GeminiProvider.ts
export function createGeminiProviderFromEnv(env?: Record<string, string | undefined>): GeminiProvider | undefined;
// returns undefined without a usable GEMINI_API_KEY; callers never substitute a fake

// apps/mcp-server/src/agent/agentStreamHandler.ts
export interface AgentStreamHandlerOptions {
  dispatcher: ToolDispatcher;
  provider?: LlmProvider;      // undefined: the endpoint answers 503 AGENT_UNAVAILABLE
  outboundLog?: OutboundLog;
}
export function createAgentStreamHandler(options: AgentStreamHandlerOptions): AgentStreamHandler;

// apps/mcp-server/src/agent/outboundLog.ts
export interface ToolCallLogEntry {
  event: 'tool_call';          // provider request entries have no `event` field
  timestamp: string;
  round: number;               // provider round in which the model asked for the tool
  toolName: string;
  arguments: Record<string, unknown>;   // as dispatched: identity keys removed, values scrubbed
  status: 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';
  durationMs: number;
}
export interface OutboundLog {
  record(entry: OutboundLogEntry): void;
  recordToolCall?(entry: ToolCallLogEntry): void;
}
```

---

#### 2.3.3 Frontend Router & View State Contracts (`apps/web`)

*Source: `apps/web/src/`*

```typescript
// apps/web/src/router/routeStudentQuery.ts
export type QueryRoute = 'DIRECT_WIDGET' | 'LLM_AGENT';
export type DirectIntent = 'CAFETERIA' | 'SHUTTLE' | 'LIBRARY';

export interface DirectWidgetRoute {
  route: 'DIRECT_WIDGET';
  intent: DirectIntent;
  toolName: 'get_cafeteria_menu' | 'get_shuttle_schedule' | 'get_library_occupancy';
  normalizedQuery: string;
}

export type AgentRoutingReason =
  | 'EMPTY_QUERY' | 'COMPOUND_QUERY' | 'PERSONAL_QUERY' | 'AMBIGUOUS_QUERY' | 'UNMATCHED_QUERY'; // PERSONAL_QUERY added in PA3

export interface AgentRoute {
  route: 'LLM_AGENT';
  reason: AgentRoutingReason;
  normalizedQuery: string;
}

export type StudentQueryRoute = DirectWidgetRoute | AgentRoute;

export function normalizeStudentQuery(query: string): string;
export function routeStudentQuery(query: string): StudentQueryRoute;
```

The following interfaces were added in PA3 (summarised; full definitions in the source files):

```typescript
// apps/web/src/lib/gateway/client.ts — POST /api/v1/query (API Contract v1.1 §3.2, §3.4)
export function createGatewayClient(options: { transport: Transport; baseUrl?: string; timeoutMs?: number }): GatewayClient;
interface GatewayClient {
  query<T extends ToolName>(toolName: T, parameters: ToolParams<T>,
    options?: { token?: string | null; signal?: AbortSignal }): Promise<QueryResult<T>>;
}
type QueryResult<T> =
  | { ok: true; toolName: T; data: ToolData<T>; meta: ResponseMeta }   // meta: isSimulated, isStale, source, timestamp, durationMs?
  | { ok: false; code: GatewayErrorCode | ClientErrorCode; message: string; status?: number; retryAfterSeconds?: number };
// A studentId parameter is refused before any request is sent (identity comes only from the JWT).

// apps/web/src/lib/chat/chatStreamClient.ts — POST /api/v1/chat/stream (API Contract v1.1 §3.3)
export function createChatStreamClient(options: {
  transport: ChatTransport; baseUrl?: string; processingNoticeMs?: number /* 5000 */; idleTimeoutMs?: number /* 20000 */;
}): { send(message: string, options: { token: string | null | undefined; signal?: AbortSignal;
        onUpdate?: (state: ChatTurnState) => void }): Promise<ChatTurnState> };
interface ChatTurnState {
  phase: 'connecting' | 'streaming' | 'done' | 'error';
  text: string;                    // streamed chunks, then the authoritative done.answer
  tools: { toolName: string; status: 'LIVE' | 'CACHE_HIT' | 'STALE' | 'ERROR'; durationMs: number }[]; // one per tool event
  toolsInvoked: string[] | null; isComplete: boolean; slow: boolean; error: ChatError | null;
}

// apps/web/src/lib/auth/authClient.ts and src/components/SessionProvider.tsx — mock-SSO session (FR-15)
export function createAuthClient(options: { transport: AuthTransport }): {
  login(user: SessionUser): Promise<LoginResult>;                        // POST /api/v1/auth/mock-login
  verify(token: string): Promise<'valid' | 'invalid' | 'unreachable'>;   // GET /api/v1/auth/me
};
export function useSession(): {
  state: { status: 'loading' } | { status: 'guest'; endReason: 'expired' | 'invalid' | null }
       | { status: 'authenticated'; session: { token: string; user: SessionUser; expiresAt: number } };
  login(personaId: string): Promise<LoginResult>; logout(): void; reportUnauthorized(): void;
};
```

**Component structure (PA3):**

```mermaid
flowchart TB
  subgraph Browser["Browser (Next.js client components)"]
    QB[QueryBox] --> R[routeStudentQuery]
    D[Dashboard] --> MC[MenuCard] & SC[ShuttleCard] & LC[LibraryCard]
    MC & SC & LC --> UQ[useToolQuery] --> GC[gateway client]
    AV[AssistantView] -- "chat screen (Y-07)" --> CC[chat stream client]
    SP[SessionProvider] --> AC[auth client]
    H[SiteHeader] --> SP
    AV --> SP
  end
  GC -->|POST /api/v1/query| NX[Next.js server: rewrite /api/v1/*]
  CC -->|POST /api/v1/chat/stream| NX
  AC -->|mock-login, /auth/me| NX
  NX -->|GATEWAY_URL| GW[Fastify gateway]
  GC -. fixtures mode .-> FX[fixture transports]
  AC -. fixtures mode .-> FX
```

---

#### 2.3.4 Connector, Cache & Resilience Signatures (`packages/connectors`)

*Source: `packages/connectors/src/`*

```typescript
// packages/connectors/src/types.ts
export type ConnectorMode = 'mock' | 'live';
export type ConnectorName = 'cafeteria' | 'shuttle' | 'library' | 'courseSchedule';
export type Clock = () => Date;

export interface ConnectorHealth {
  connector: ConnectorName;
  mode: ConnectorMode;
  status: 'UP' | 'DOWN';
  checkedAt: string;
  detail?: string;
}

export interface ManagedCampusConnector<TInput = unknown, TOutput = unknown>
  extends ICampusConnector<TInput, TOutput> {
  readonly name: ConnectorName;
  readonly mode: ConnectorMode;
  readonly isMock: boolean;
  healthCheck(): Promise<ConnectorHealth>;
}

// packages/connectors/src/cache/
export interface CacheEntry<T> {
  value: T;
  cachedAt: string;
  freshUntil: string;
}

export interface CacheStore {
  get<T>(key: string): Promise<CacheEntry<T> | null>;
  set<T>(key: string, entry: CacheEntry<T>, retentionSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

// packages/connectors/src/resilience/
export class CircuitBreaker {
  constructor(name: string, options?: { failureThreshold?: number; cooldownMs?: number; clock?: Clock });
  tryAcquire(): boolean;
  recordSuccess(): void;
  recordFailure(): void;
  releaseWithoutResult(): void;
  snapshot(): { state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'; consecutiveFailures: number; retryAt: string | null };
}

export class ResilientConnectorExecutor {
  constructor(options: { cache: CacheStore; clock?: Clock; timeoutMs?: number; retentionMultiplier?: number; onEvent?: ConnectorEventSink });
  execute<TInput, TOutput>(request: ResilientExecuteRequest<TInput, TOutput>): Promise<ResilientResult<TOutput>>;
}

// packages/connectors/src/runtime.ts
export interface ConnectorRuntimeOptions {
  env?: EnvSource; cache?: CacheStore; clock?: Clock;
  onEvent?: ConnectorEventSink;                 // execution log sink, default JSON lines on stderr
  onCacheWarning?: (line: string) => void;      // cache backend warnings, default stderr
}
export interface ConnectorRuntime extends ConnectorHandlerDeps {
  config: ConnectorRuntimeConfig; cache: CacheStore; clock: Clock;
  cacheBackend: string;                          // 'redis', 'memory' or 'custom'
  close(): Promise<void>;
}
export function createConnectorRuntime(options?: ConnectorRuntimeOptions): ConnectorRuntime;          // Redis connects in the background
export function createConnectorRuntimeFromEnv(options?: Omit<ConnectorRuntimeOptions, 'cache'>): Promise<ConnectorRuntime>;  // waits, fails fast

// packages/connectors/src/handlers.ts
export interface ConnectorResponseMeta {
  source: 'LIVE' | 'CACHE_HIT' | 'STALE';        // never 'MOCK'
  isSimulated: boolean; isStale: boolean;
  timestamp: string; durationMs: number;
}

// packages/connectors/src/clock.ts
export function resolveConnectorClock(fixedNowIso: string | null): Clock;   // CONNECTOR_FIXED_NOW

// packages/connectors/src/logging.ts
export interface ConnectorExecutionEvent {
  event: 'connector.execute'; at: string; connector: ConnectorName;
  outcome: 'CACHE_HIT' | 'LIVE' | 'STALE' | 'ERROR';
  upstreamCalled: boolean; cacheKey: string; durationMs: number;
  failureCode?: string; circuitState: CircuitState;   // never arguments, auth context or a student id
}
```

---

#### 2.3.5 API Gateway & Perimeter Security Signatures (`apps/api-gateway`)

*Source: `apps/api-gateway/src/`*

```typescript
// apps/api-gateway/src/types/auth.ts
export interface JWTPayload {
  sub: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'FACULTY' | 'GUEST' | 'ADMIN';
  iat: number;
  exp: number;
  iss: string;
}

export interface AuthenticatedRequestContext {
  studentId: string | null;
  role: 'STUDENT' | 'FACULTY' | 'GUEST' | 'ADMIN';
  isAuthenticated: boolean;
  verifiedAt: string;
  clientIp: string;
}

// apps/api-gateway/src/server.ts
export interface BuildGatewayOptions {
  rateLimiterStore?: RateLimiterStore;
  rateLimit?: number;          // default 30
  rateLimitWindow?: number;    // seconds, default 60
  mcpUrl?: string;             // default MCP_URL
  agentStreamUrl?: string;     // default AGENT_STREAM_URL
  mcpTimeoutMs?: number;       // default 10 000
  chatTimeoutMs?: number;      // default 20 000
  fetchImpl?: typeof fetch;
}
export function buildGateway(options?: BuildGatewayOptions): FastifyInstance;
export function authenticateAndTerminateToken(request: FastifyRequest, reply: FastifyReply): Promise<void>;
export function createRateLimiterMiddleware(limit?: number, windowSeconds?: number, store?: RateLimiterStore): (req: FastifyRequest, reply: FastifyReply) => Promise<void>;

// apps/api-gateway/src/http/errorResponse.ts (API Contract v1.1 §3.4)
export type GatewayErrorCode = 'INVALID_PARAMS' | 'AUTHENTICATION_REQUIRED' | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE' | 'DOWNSTREAM_ERROR' | 'UPSTREAM_TIMEOUT' | 'INTERNAL_ERROR';
export function sendGatewayError(reply: FastifyReply, statusCode: number, code: GatewayErrorCode, message: string, headers?: Record<string, string>): FastifyReply;

// apps/api-gateway/src/rate-limiter/redisRateLimiterStore.ts
export function createRateLimiterStoreFromEnv(env?: NodeJS.ProcessEnv, options?: { failOpen?: boolean; timeoutMs?: number }): RateLimiterFactoryResult;

// apps/api-gateway/src/proxy/chatStreamProxy.ts
export async function handleChatStream(request: FastifyRequest, reply: FastifyReply, options: ChatStreamProxyOptions): Promise<void>;
```

---

#### 2.3.6 MCP Registered Tool Contracts & Zero-Trust Identity Boundary

The four registered MCP tools are governed by the specifications below:

| Tool Identifier | Input Parameters | Strict Schema Constraints | Cache TTL | Linked Requirements | Functional Scope |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`get_cafeteria_menu`** | `date?: string` | `pattern: ^\d{4}-\d{2}-\d{2}$`, `additionalProperties: false` | **3600 s** (1 hour) | FR-01, FR-03, FR-09 | Daily lunch/dinner menu, calorie counts, allergen tags, weekend/holiday status. |
| **`get_shuttle_schedule`**| `route?: string` | `enum: [MAIN_RING, METRO_LINE, DORMITORY_LINE]`, `additionalProperties: false` | **120 s** (2 minutes) | FR-01, FR-04, FR-09 | Upcoming chronological future departures, route identifiers, active vehicle fleet. |
| **`get_library_occupancy`**| `floor?: string` | `enum: [FLOOR_1, FLOOR_2, FLOOR_3, ALL]`, `additionalProperties: false` | **60 s** (1 minute) | FR-01, FR-05, FR-09 | Real-time seat occupancy and capacity by study floor (`isSimulated: true`). |
| **`get_course_schedule`** | `day?: string` | Free string day filter (`TODAY`, `MONDAY`…), `additionalProperties: false` | **300 s** (5 minutes) | FR-01, FR-06, FR-07 | Personal student class timetable sorted by `startTime`. Accessible only with verified student ID. |

> [!CAUTION]
> **Zero-Trust Identity Isolation Rule (FR-06, FR-07, FR-14):**
> 1. `studentId` is **strictly excluded** from `GetCourseScheduleInput` and the MCP tool's JSON Schema.
> 2. The client application and external LLM provider have zero authority to specify or alter student identity parameters.
> 3. Student identity is extracted exclusively by the API Gateway from verified JWT claims and injected into internal `X-Authenticated-Student-Id` headers.
> 4. Any attempt by a client or LLM to inject `studentId` into tool arguments (`{ "day": "MONDAY", "studentId": "241101999" }`) is rejected immediately with JSON-RPC error `-32602 (Invalid params)` by Zod schema enforcement.

---

### 2.4 Visual Interfaces

The visual presentation tier is designed around two committed low-fidelity SVG wireframes:

1. [Campus at a Glance Dashboard wireframe](wireframes/dashboard-wireframe.svg)
2. [Conversational Assistant wireframe](wireframes/conversational-assistant-wireframe.svg)

```
       +-----------------------------------------------------------------------+
       | [Logo] Campus Data Orchestrator               [Murat Can Isik - Auth] |
       +-----------------------------------------------------------------------+
       | [DASHBOARD VIEW]                                  [CONVERSATIONAL UI] |
       |                                                                       |
       | +--------------------------------+ +--------------------------------+ |
       | | CARD A: TODAY'S DINING MENU    | | CARD B: NEXT SHUTTLE RINGS     | |
       | | Lunch: Orman Kebabi (820 kcal) | | Main Ring: 12:35 (in 5 mins)   | |
       | | Dinner: Firin Tavuk (740 kcal) | | Metro Line: 12:50 (in 20 mins) | |
       | | [Fresh: Cached at 11:30]       | | [Buffer: 3 min walk to ring]   | |
       | +--------------------------------+ +--------------------------------+ |
       |                                                                       |
       | +--------------------------------+ +--------------------------------+ |
       | | CARD C: LIBRARY OCCUPANCY      | | CARD D: CONNECTOR HEALTH       | |
       | | Total: 190 / 300 Seats (63%)   | | SIS: UP | Dining: UP           | |
       | | Floor 1: 48/100 | Fl 3: 60/80  | | Shuttle: UP | Library: MOCK    | |
       | | [Simulated Data Notice]        | | [All Connectors Operational]   | |
       | +--------------------------------+ +--------------------------------+ |
       +-----------------------------------------------------------------------+
```

*The wireframes and the layout descriptions in 2.4.1–2.4.3 are the PA2 design. The implemented PA3 web client differs as recorded in the table below; where they differ, the table describes the implemented system.*

**Implemented UI vs. PA2 design (PA3, `dev` at `6cc1d07`):**

| PA2 design says | Implemented in PA3 | Reason |
| :--- | :--- | :--- |
| Card A: *tabbed* Lunch/Dinner | Lunch and dinner shown **together**, plus a **date picker** (default: today in Türkiye time) | Both meals fit on the card; the date picker lets AT-01 check weekends through the UI |
| Card B: countdowns *with walking-time buffer* | Countdowns (e.g. "12 dk sonra" — "in 12 min") and a route selector (Ana Ring / Metro / Yurtlar); **no walking buffer** | The shuttle contract carries no walking-time data |
| Card C: *circular gauge* | Large percentage plus per-floor **bars**, floor selector | Simpler and accessible (`role="meter"`) |
| Card D: connector telemetry | **Not implemented** | No gateway endpoint in API Contract v1.1; not covered by AT-01..AT-04 |
| Clicking a card pre-fills the assistant input | **Not implemented**; the dashboard query box offers example questions instead | Not needed by AT-01..AT-04; recorded as a gap |
| Header "[Name – Auth]" | Guest with "Giriş yap" (sign in), or name + student number + "Çıkış" (sign out) | FR-15 |
| Badges for simulated / cache / stale data | Every card shows a "Sentetik veri" (synthetic data) badge from `meta.isSimulated`, **separately** from the source badge from `meta.source`; a stale warning with the original cache time; an error state with retry; last-updated time and refresh | API Contract v1.1 §1 (source and simulation are not conflated) |
| Mobile: collapsed chat drawer; desktop > 1440 px: side-by-side assistant | Dashboard and assistant are **separate pages** (`/` and `/asistan`); cards use a responsive grid (one column on phones) | Simpler navigation for PA3 |
| — | A **fixture-mode banner** ("Örnek veri modu" — sample data mode) | Screenshots taken with fixtures can never be mistaken for end-to-end evidence |

#### 2.4.1 Campus at a Glance Dashboard Layout

The dashboard organizes essential campus metrics to be reachable within **one click** from landing without scrolling (NFR-06):
- **Card A (Cafeteria Menu):** Tabbed Lunch/Dinner view displaying menu items, calorie counts, and allergen chips.
- **Card B (Campus Shuttles):** Chronological departure countdowns partitioned by route with walking-time buffer indicators.
- **Card C (Library Occupancy):** Circular gauge for total building capacity alongside per-floor occupied/available seat counts.
- **Card D (Connector Telemetry):** Real-time service health indicators (`UP` / `DOWN`) and cache latency badges.
- **Interactive Action:** Clicking any card pre-fills a contextual inquiry into the assistant prompt input (e.g., clicking the shuttle card prefills *"When is the next Main Ring shuttle?"*).

#### 2.4.2 Conversational Assistant Layout

The assistant provides full operational transparency into the agentic reasoning pipeline:
- **Streaming Tokens:** Assistant responses stream character-by-character over SSE frames (FR-17).
- **Execution Badges:** Displays dynamic badges above the text indicating tool execution status: `[Tool: get_cafeteria_menu | Cache Hit (target: P95 < 250 ms)]`.
- **Status Banners:** Visual banners indicate degraded operational states:
  - Amber banner for stale cache fallback: *"Serving cached menu from 10:15 — Dining service unavailable"*.
  - Blue banner for synthetic stubs: *"Simulated library turnstile feed"*.
  - ~~Reconnecting banner with retry countdowns during SSE drops (FR-19).~~ **Superseded in PA3:** when the stream drops, the partial answer is kept and an explicit "Tekrar dene" (retry) action is offered; there is **no automatic reconnect** (see §3.5, API Contract v1.1 §3.3).
- **Draft Preservation:** Typed input is never cleared during query retries.
- *PA3 status:* the assistant page exists; the streamed chat screen with one badge per tool (Y-07, PR #32) is built on the implemented stream client.

#### 2.4.3 Responsive Viewport Compatibility (NFR-07)

| Target Viewport | Breakpoint | Responsive Presentation Layout |
| :--- | :--- | :--- |
| **Mobile Displays** | 375 px – 767 px | Single-column stacked cards; collapsed full-screen chat drawer; compact header; wrapping tool badges. |
| **Tablet Displays** | 768 px – 1023 px | 2-column dashboard card grid; tabbed navigation between Dashboard and Conversational views. |
| **Desktop Displays**| 1024 px – 1920 px| 2-column dashboard grid; persistent side-by-side assistant view on wide displays (>1440px) without horizontal scrolling. |

*PA3 status (NFR-07):* the implemented client uses separate dashboard and assistant pages and a responsive card grid. It has been checked at 375 px and on desktop in Chrome with no horizontal scrolling; 768, 1440 and 1920 px were also checked in Chromium and Firefox visually (Y-10; evidence `docs/assignment3/evidence/y10-responsive/`, `handovers/yunus.md`); Safari was checked by Arda in the PR #33 discussion.

---

## 3. Use Case Support in Design

### 3.1 Selected Use Cases and Requirements Traceability

The team selected four core use cases as the formal architectural baseline for Assignment 2 and final demonstration verification:

| Use Case ID | Name | Primary User Goal | Linked Functional Requirements |
| :--- | :--- | :--- | :--- |
| **UC-01** | View Cafeteria Menu | Retrieve today's daily lunch or dinner menu with nutritional details. | FR-01, FR-03, FR-09, FR-12, FR-16, FR-18 |
| **UC-02** | View Shuttle Schedule | Retrieve upcoming chronological departures for a campus ring route. | FR-01, FR-04, FR-09, FR-12, FR-16, FR-18 |
| **UC-03** | View Library Occupancy | Check real-time seat availability across library study floors. | FR-01, FR-05, FR-09, FR-12, FR-16, FR-18 |
| **UC-04** | Ask Combined Course, Shuttle & Menu Question | Receive a single synthesized answer coordinating personal timetable and public feeds. | FR-01, FR-06, FR-07, FR-13, FR-14, FR-16, FR-17, FR-19 |

---

### 3.2 UC-01 — View Cafeteria Menu

- **Primary Actor:** Student, Faculty/Staff, or Guest User.
- **Trigger:** User opens the dining dashboard card or submits *"Bugün yemekte ne var?"*.
- **Preconditions:** Web client reachable; public route (no authentication required).
- **Postconditions:** Daily menu rendered with calorie counts and freshness status; zero LLM token consumption.
- **Main Flow:**
  1. User submits menu query.
  2. Router classifies query as `DIRECT_WIDGET` mapped to `get_cafeteria_menu`.
  3. Client dispatches direct query to `/api/v1/query` on the web app's own origin, bypassing AI Agent; the Next.js server rewrites it to the Gateway (`GATEWAY_URL`, API Contract v1.1 §1, §7).
  4. Gateway forwards request to MCP Server.
  5. MCP Server evaluates 3600s cache (`cache:dining:<date>`).
  6. On cache hit, returns cached menu. On miss, connector retrieves data, populating cache.
  7. Client renders the menu card (lunch and dinner together, date picker) with calorie metrics.
- **Alternative / Error Flows:**
  - *Weekend/Holiday:* Returns `available: false` with explanatory message; UI renders clear closed notice.
  - *Upstream Outage with Retained Cache:* Serves 3×TTL expired cache with amber stale banner and original timestamp (FR-10).
  - *Outage with Empty Cache:* Renders retryable error card without crashing.

```mermaid
sequenceDiagram
    actor User
    participant UI as Web Dashboard
    participant Router as routeStudentQuery
    participant NX as Next.js server (rewrite)
    participant Gateway as API Gateway
    participant MCP as MCP Server + Cache
    participant Dining as Cafeteria Connector

    User->>UI: Submit menu query
    UI->>Router: routeStudentQuery("Bugün yemekte ne var?")
    Router-->>UI: DIRECT_WIDGET (get_cafeteria_menu)
    UI->>NX: POST /api/v1/query (same origin)
    NX->>Gateway: Rewrite to GATEWAY_URL
    Gateway->>MCP: Forward sanitized tool call
    alt Fresh Cache Hit (< 3600s)
        MCP-->>Gateway: Return cached menu (target: P95 < 250 ms)
    else Cache Miss
        MCP->>Dining: execute({ date })
        Dining-->>MCP: Return CafeteriaDailyMenu
        MCP-->>Gateway: Return tool response
    end
    Gateway-->>NX: Normalized {ok, data, meta}
    NX-->>UI: Deliver payload
    UI-->>User: Render menu card (lunch + dinner)
```

---

### 3.3 UC-02 — View Shuttle Schedule

- **Primary Actor:** Student, Faculty/Staff, or Guest User.
- **Trigger:** User selects a shuttle route or asks *"Metro servisi ne zaman?"*.
- **Preconditions:** Web client reachable; valid route identifier (`MAIN_RING`, `METRO_LINE`, `DORMITORY_LINE`).
- **Postconditions:** Upcoming departures displayed in chronological order; past times filtered out.
- **Main Flow:**
  1. User queries shuttle times.
  2. Router returns `DIRECT_WIDGET` mapped to `get_shuttle_schedule`.
  3. Client dispatches request to `/api/v1/query` on its own origin; the Next.js server rewrites it to the Gateway, which forwards it to the MCP Server.
  4. MCP Server checks 120s cache (`cache:shuttle:<route>`).
  5. Connector evaluates scheduled timetable against UTC+3 clock, filtering out past departures.
  6. UI renders upcoming departures as countdowns with a route selector and active vehicle count (no walking buffer in PA3, see §2.4).
- **Alternative / Error Flows:**
  - *End of Service:* Returns empty departures array; UI renders "No more departures today".
  - *Invalid Route Argument:* Schema validator rejects input with `-32602 (Invalid params)`.

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard / Chat
    participant Router as routeStudentQuery
    participant NX as Next.js server (rewrite)
    participant Gateway as API Gateway
    participant MCP as MCP Server + Cache
    participant Shuttle as Shuttle Connector

    User->>UI: Query shuttle departures
    UI->>Router: routeStudentQuery("Next shuttle?")
    Router-->>UI: DIRECT_WIDGET (get_shuttle_schedule)
    UI->>NX: POST /api/v1/query (same origin)
    NX->>Gateway: Rewrite to GATEWAY_URL
    Gateway->>MCP: Forward sanitized tool call
    alt Cache Hit (< 120s)
        MCP-->>Gateway: Return cached departures
    else Cache Miss
        MCP->>Shuttle: execute({ route: "MAIN_RING" })
        Shuttle-->>MCP: Return future departures
        MCP-->>Gateway: Return tool response
    end
    Gateway-->>NX: Normalized {ok, data, meta}
    NX-->>UI: Deliver payload
    UI-->>User: Render departure countdowns
```

---

### 3.4 UC-03 — View Library Occupancy

- **Primary Actor:** Student, Faculty/Staff, or Guest User.
- **Trigger:** User opens library widget or asks *"Kütüphanede boş yer var mı?"*.
- **Preconditions:** Web client reachable; floor is `FLOOR_1`, `FLOOR_2`, `FLOOR_3`, `ALL`, or omitted.
- **Postconditions:** Building capacity and floor breakdown rendered with prominent simulation tag.
- **Main Flow:**
  1. User queries occupancy.
  2. Router returns `DIRECT_WIDGET` mapped to `get_library_occupancy`.
  3. Request goes to `/api/v1/query` on the web app's origin, is rewritten by the Next.js server to the Gateway and passed to the MCP Server without LLM call.
  4. MCP Server queries 60s cache (`cache:library:<floor>`).
  5. Synthetic mock connector calculates occupancy based on time-of-day bell curves.
  6. UI renders the total percentage and per-floor bars (floor selector), tagged "Sentetik veri" (synthetic data) from `isSimulated: true`.
- **Alternative / Error Flows:**
  - *Invalid Floor Selection:* Local form validation rejects input or returns `-32602`.
  - *Connector Outage:* Circuit breaker trips; stale cache served with amber warning banner.

```mermaid
sequenceDiagram
    actor User
    participant UI as Dashboard View
    participant Router as routeStudentQuery
    participant NX as Next.js server (rewrite)
    participant Gateway as API Gateway
    participant MCP as MCP Server + Cache
    participant Library as Library Connector

    User->>UI: Check library seats
    UI->>Router: routeStudentQuery("Kütüphane dolu mu?")
    Router-->>UI: DIRECT_WIDGET (get_library_occupancy)
    UI->>NX: POST /api/v1/query (same origin)
    NX->>Gateway: Rewrite to GATEWAY_URL
    Gateway->>MCP: Forward sanitized tool call
    alt Cache Hit (< 60s)
        MCP-->>Gateway: Return cached occupancy
    else Cache Miss
        MCP->>Library: execute({ floor: "ALL" })
        Library-->>MCP: Return LibraryOccupancyReport
        MCP-->>Gateway: Return tool response
    end
    Gateway-->>NX: Normalized {ok, data, meta}
    NX-->>UI: Deliver payload
    UI-->>User: Render occupancy bars + "Sentetik veri" label
```

---

### 3.5 UC-04 — Ask a Combined Course, Shuttle, and Menu Question

- **Primary Actor:** Authenticated Student.
- **Trigger:** Student submits compound inquiry: *"10:30 dersimden sonra ringe yetişir miyim, bugün yemekte ne var?"*.
- **Preconditions:** Student holds valid mock-SSO JWT; Gateway and AI Agent operational. *(PA3, API Contract v1.1 §1 "Chat access": the chat always requires login, for every compound question; a guest is asked to sign in before a chat message can be sent, while the dashboard cards stay public.)*
- **Postconditions:** Unified natural language response streamed to user; exactly one telemetry badge displayed per tool call; zero raw tokens or student PII transmitted to Gemini.
- **Main Flow:**
  1. Student enters compound question.
  2. Router detects conjunctions (`sonra`, commas) and multiple domains, returning `LLM_AGENT`.
  3. Client sends `POST /api/v1/chat/stream` with the query and the JWT (`Authorization: Bearer`) to its own origin; the Next.js server rewrites it to the Gateway. The browser reads the SSE response from the `fetch()` response stream (an `EventSource` cannot send a POST body or an `Authorization` header).
  4. Gateway validates token, strips raw credentials, and creates trusted `AuthContext`.
  5. Gateway forwards `{"message": "…"}` and the verified identity headers (`X-Authenticated-Student-Id`, `X-Authenticated-User-Role`) to `POST /internal/agent/stream` of the MCP process (`AGENT_STREAM_URL`, API Contract v1.1 §8 Q4). The agent runs inside that process.
  6. Agent scrubs PII (FR-14), checks the request again (fail closed), records it in the redacted outbound log and sends the question with the four tool declarations (no `studentId`) to Gemini.
  7. Gemini asks for tools. The agent executes each requested tool at most once through the `ToolDispatcher` **in-process**, in the order requested, with the verified `AuthContext` (`studentId` is never an argument), and emits one `tool` event per execution.
  8. The scrubbed tool results, with `isSimulated` and `isStale`, go back to Gemini in the next round.
  9. Gemini writes the answer; the agent emits `token` chunks and exactly one `done` event.
  10. Gateway passes the frames through unchanged; the UI appends the tool badges and the streamed text.
- **Alternative / Error Flows:**
  - *Expired Token:* Gateway rejects with HTTP 401; UI prompts login while keeping draft text.
  - *Slow LLM Response (> 5s):* UI displays "Still processing..." notice when no answer text has arrived after 5 s; the request is cancelled with a retry option after **20 s without any data** (idle timeout), so a long answer that keeps streaming is not cut off.
  - *SSE Connection Drop (design decision revised in PA3):* the partial answer and the typed draft are kept, the turn ends with `STREAM_INTERRUPTED`, and the user retries explicitly with "Tekrar dene" (retry). There is **no automatic reconnect or resend**, because without server-side replay a reconnect would run the tool chain a second time (API Contract v1.1 §3.3). This replaces the PA2 rule "automatic retry with backoff (1s, 2s, 4s)" (FR-19).
  - *Agent not configured (no `GEMINI_API_KEY`) (PA3):* the agent endpoint answers `503` JSON before any stream starts; the gateway maps it to its own `503 UPSTREAM_UNAVAILABLE` and the UI shows an error with a retry option. The system never answers with fake data in this case.
  - *Provider failure after the stream started (PA3):* the agent emits one `error` event with a fixed safe message (no tokens, PII or stack trace) instead of `done`; the user retries explicitly. Transient provider overload (429/5xx) is retried twice inside the provider before this happens.
  - *Agent cannot reach the provider (PA3, fixed):* before PR #44 the `mcp-server` container had no route to the Gemini API in the four-service Compose stack and the chat ended with an `error` event (section 2.2.1 item 8). With the `egress` network of PR #44 this no longer happens.
  - *Real-run status (PA3):* AT-04 Run 2 (22 Nov 2026, QA owner, live Chrome, real Gemini provider, test clock Tuesday 12:10) passed: `POST /api/v1/chat/stream` answered 200 with 3 `tool`, 21 `token` and 1 `done` frames and three badges; the agent tool log has three `tool_call` lines without identity arguments; the provider requests contain no JWT, student id, name or e-mail. Honest limits: the data is synthetic; the first answer text appeared after 13.5 s (the answer is generated before it is split into tokens), close to the 20 s UI limit; Run 1 had failed AC-04.6 because of the test data.

```mermaid
sequenceDiagram
    actor Student
    participant UI as Conversational Assistant
    participant Router as routeStudentQuery
    participant NX as Next.js server (rewrite)
    participant Gateway as API Gateway
    participant Agent as Agent + PII Scrubber (in the MCP process)
    participant LLM as Gemini (external)
    participant MCP as ToolDispatcher + connectors

    Student->>UI: Compound inquiry (Course + Shuttle + Menu)
    UI->>Router: routeStudentQuery(query)
    Router-->>UI: LLM_AGENT (COMPOUND_QUERY)
    UI->>NX: POST /api/v1/chat/stream + JWT Authorization header
    NX->>Gateway: Rewrite to GATEWAY_URL
    Gateway->>Gateway: Verify JWT, strip token, inject AuthContext
    Gateway->>Agent: POST /internal/agent/stream {message} + X-Authenticated-* headers
    Agent->>Agent: Scrub PII, fail-closed check, redacted outbound log
    Agent->>LLM: generateContent (question + tool declarations, no studentId)
    LLM-->>Agent: function call(s)
    loop each requested tool, at most once
        Agent->>MCP: dispatch(tool, args, AuthContext) in-process
        MCP-->>Agent: result + isSimulated/isStale/source/durationMs
        Agent-->>Gateway: event: tool
    end
    Agent->>LLM: generateContent (scrubbed tool results)
    LLM-->>Agent: answer text
    Agent-->>Gateway: event: token (chunks), event: done
    Gateway-->>NX: SSE frames (tool, token, done | error) unchanged
    NX-->>UI: SSE stream read via fetch()
    UI-->>Student: Render synthesized answer + 3 tool badges
```

---

### 3.6 Cross-Use-Case UI State Rules

| Operational State | UI Rendering Behavior | Linked Requirements |
| :--- | :--- | :--- |
| **Simulated Data** | Visible blue badge indicating simulated data; never presented as live campus feed. | FR-12, FR-18 |
| **Stale Cache Fallback** | Amber warning notice displaying original cache timestamp and failed service. | FR-10, FR-19 |
| **Empty State** | Structured explanatory message (e.g., *"No classes scheduled for today"*). | FR-19 |
| **High Latency (> 5s)** | Pulsing "Still processing..." status indicator while no answer text has arrived. | FR-19 |
| **Request Timeout (20s)**| Cancellation after 20 s without any data (idle timeout) paired with a one-click retry button. | FR-19 |
| **SSE Disconnection** | *(Revised in PA3)* The partial answer and the user draft are kept; an explicit "Tekrar dene" (retry) action is offered. No automatic reconnect, so the tool chain never runs twice silently (API Contract v1.1 §3.3). | FR-19 |
| **Tool Telemetry** | Exactly one badge rendered per invoked tool displaying status and duration in milliseconds. | FR-17 |
| **Unauthenticated Route**| Sign-in prompt for private endpoints and for the chat (every compound question) while public widgets remain accessible. | FR-15 |
| **Fixture Mode** *(PA3)* | "Örnek veri modu" (sample data mode) banner whenever the web client runs on local fixtures instead of the gateway. | FR-12, FR-18 |

---

### 3.7 Final Demonstration Obligations

Assignment 2 establishes these four use cases as the immutable demonstration contract for final project closure (15 January 2027). All four workflows are demonstrated in a **recorded demo video** (no live or oral session), submitted by **5 December 2026**, under both nominal conditions and simulated fault scenarios (stale cache fallback, network disconnection, and invalid parameter rejection).

---

## 4. Design Decisions (Technology Comparisons)

### 4.1 Redis vs. Process In-Memory Map

*Author: Arda Çelik. Reference Code: [`comparisons/Redis-vs-memory/`](../comparisons/Redis-vs-memory/README.md), Demonstration Test: [`tests/connectors/redisVsMemory.demo.test.ts`](../tests/connectors/redisVsMemory.demo.test.ts).*

#### Problem Statement
Where should cached MCP tool responses reside? The caching layer must:
- Enforce per-tool granular TTLs (60s to 3600s, FR-09).
- Retain expired data for 3×TTL to serve as stale-if-error fallback (FR-10).
- Support horizontal scaling across multiple stateless container instances (NFR-04).
- Sustain a minimum 90% cache hit ratio under normal campus loads (NFR-02).

#### Evaluation Matrix

| Evaluation Criterion | Process In-Memory `Map` | Redis 7 (Alpine) — **Selected** |
| :--- | :--- | :--- |
| **Multi-Instance Sharing (NFR-04)** | ✗ Cache fragmented across Node processes; duplicate upstream queries. | ✓ Shared centralized cache; instant hit sharing across all instances. |
| **Restart Survivability (FR-10)** | ✗ Cache completely lost upon container restart or crash. | ✓ Persisted independently; stale fallback data survives restarts. |
| **Automated Expiry Handling** | ✗ Requires manual interval timers or lazy sweeping in Node event loop. | ✓ Native millisecond-precision key expiry (`PX` parameter). |
| **Memory Isolation** | ✗ Contends with Node.js heap limit (`--max-old-space-size`). | ✓ Dedicated container with isolated memory allocation. |
| **Infrastructure Overhead** | ✓ Zero operational overhead; standard JavaScript data structure. | ✗ Requires dedicated container and internal network hop (Docker Compose). |
| **Offline Testability (NFR-08)** | ✓ Trivial execution in test suites. | ✓ Supported via in-memory mock store (`InMemoryCacheStore`). |

#### Trade-Off Analysis & Architectural Decision
While a local JavaScript `Map` offers sub-millisecond retrieval, it fails the fundamental scalability (NFR-04) and resilience (FR-10) requirements. If an MCP server container crashes during an upstream campus portal outage, an in-memory cache loses all retained fallback data, causing immediate customer-facing failures.

**Decision:** **Redis 7** is selected as the production caching store. An abstract `CacheStore` interface allows seamless switching to `InMemoryCacheStore` during offline unit tests, ensuring compliance with NFR-08.

---

### 4.2 Fastify vs. Express

*Author: Ahmet Sefa Efendioğlu. Reference Code: [`comparisons/Fastify-vs-Express/`](../comparisons/Fastify-vs-Express/README.md). Edited by: Arda Çelik.*

#### Problem Statement
The API Gateway sits on the critical path of every client interaction. It must:
- Terminate external JWT tokens and sanitize inbound headers (FR-07).
- Execute sliding-window rate limiting on every transaction (FR-08).
- Introduce minimal middleware latency to satisfy the P95 < 250 ms (target) constraint (NFR-01).

#### Evaluation Matrix

| Evaluation Criterion | Fastify 4.28.x — **Selected** | Express 4.19.x |
| :--- | :--- | :--- |
| **Framework Overhead (Synthetic)** | Higher throughput baseline (`≈ 77,193 req/sec` in published benchmarks). | Lower throughput baseline (`≈ 14,200 req/sec` in published benchmarks). |
| **Schema Validation Pipeline** | Native JSON Schema compilation via Ajv at server startup. | Requires third-party middleware (e.g., celebrate/joi) per route. |
| **Lifecycle Hooks for Security** | Strongly-typed lifecycle hooks (`onRequest`, `preHandler`, `onSend`). | Linear middleware chaining relying on mutable `next()` calls. |
| **Asynchronous Error Handling** | First-class `Promise` / async-await error propagation without wrapping. | Unhandled rejections require explicit `try/catch` or monkey-patching. |
| **Testing Harness** | Built-in `app.inject()` for socket-less HTTP injection in CI pipelines. | Requires binding ephemeral TCP ports via `supertest`. |

*Source Benchmark Citation:* Published synthetic HTTP benchmark metrics cited from Fastify Official Documentation (*Benchmarks*, autocannon `-c 100 -d 40 -p 10`): <https://cdn.jsdelivr.net/npm/fastify@5.12.5/README.md>. These figures represent framework overhead baselines; project-specific gateway latencies are measured under Phase 4 load testing.

#### Trade-Off Analysis & Architectural Decision
Fastify's compiled schema architecture and strongly-typed lifecycle hooks (`onRequest` / `preHandler`) perfectly match the perimeter token termination pipeline: the gateway strips the raw bearer token and injects verified internal headers before route handlers execute.

**Decision:** **Fastify** is selected for `apps/api-gateway`. The comparative implementation in `comparisons/Fastify-vs-Express/` demonstrates the structural advantages of Fastify's lifecycle hooks over Express's untyped middleware chain.

---

## 5. GitHub Commit Requirement & Repository Artifacts

In compliance with the BIL 481 Project Assignment 2 guidelines, all design decisions, architectural contracts, wireframes, and comparison implementations are committed in the repository with verified relative links:

### 1. Concrete Source Code Implementations
- **Shared Contracts & Domain Models:** [`packages/shared/src/index.ts`](../packages/shared/src/index.ts)
  - Domain Types: [`packages/shared/src/types/domain.ts`](../packages/shared/src/types/domain.ts)
  - Tool Inputs & Strict Schemas: [`packages/shared/src/types/tools.ts`](../packages/shared/src/types/tools.ts)
  - Protocol Contracts & Connector Interface: [`packages/shared/src/types/mcp.ts`](../packages/shared/src/types/mcp.ts)
  - Registered Tool Names & Cache Constants: [`packages/shared/src/constants.ts`](../packages/shared/src/constants.ts)
- **MCP Server Core Middleware:** [`apps/mcp-server/src/index.ts`](../apps/mcp-server/src/index.ts)
  - Tool Registry & Schemas: [`apps/mcp-server/src/registry/toolDefinitions.ts`](../apps/mcp-server/src/registry/toolDefinitions.ts)
  - Tool Dispatcher Engine: [`apps/mcp-server/src/dispatcher/ToolDispatcher.ts`](../apps/mcp-server/src/dispatcher/ToolDispatcher.ts)
  - Server & SSE Handlers: [`apps/mcp-server/src/server.ts`](../apps/mcp-server/src/server.ts)
  - AI Agent: [`apps/mcp-server/src/agent/`](../apps/mcp-server/src/agent/) — [`AgentOrchestrator.ts`](../apps/mcp-server/src/agent/AgentOrchestrator.ts), [`LlmProvider.ts`](../apps/mcp-server/src/agent/LlmProvider.ts), [`GeminiProvider.ts`](../apps/mcp-server/src/agent/GeminiProvider.ts), [`FakeProvider.ts`](../apps/mcp-server/src/agent/FakeProvider.ts), [`piiScrubber.ts`](../apps/mcp-server/src/agent/piiScrubber.ts), [`outboundLog.ts`](../apps/mcp-server/src/agent/outboundLog.ts); stream endpoint [`agentStreamHandler.ts`](../apps/mcp-server/src/agent/agentStreamHandler.ts)
  - Sample Mocks (opt-in test fixture only since M-02): [`apps/mcp-server/src/mocks/sampleMockHandlers.ts`](../apps/mcp-server/src/mocks/sampleMockHandlers.ts)
- **Web Client & Bilingual Intent Router:** [`apps/web/src/index.ts`](../apps/web/src/index.ts)
  - Deterministic Intent Router: [`apps/web/src/router/routeStudentQuery.ts`](../apps/web/src/router/routeStudentQuery.ts)
  - *(PA3)* Next.js pages: [`apps/web/src/app/`](../apps/web/src/app/); dashboard cards: [`apps/web/src/components/cards/`](../apps/web/src/components/cards/)
  - *(PA3)* Gateway client: [`apps/web/src/lib/gateway/`](../apps/web/src/lib/gateway/); chat stream client: [`apps/web/src/lib/chat/`](../apps/web/src/lib/chat/); mock-SSO session: [`apps/web/src/lib/auth/`](../apps/web/src/lib/auth/)
  - *(PA3)* Web Docker image: [`apps/web/Dockerfile`](../apps/web/Dockerfile)
- **Campus Connectors & Data Resilience:** [`packages/connectors/src/index.ts`](../packages/connectors/src/index.ts)
  - Resilient Connector Executor: [`packages/connectors/src/resilience/ResilientConnectorExecutor.ts`](../packages/connectors/src/resilience/ResilientConnectorExecutor.ts)
  - Circuit Breaker State Machine: [`packages/connectors/src/resilience/CircuitBreaker.ts`](../packages/connectors/src/resilience/CircuitBreaker.ts)
  - Seeded Synthetic Mock Connectors: [`packages/connectors/src/connectors/`](../packages/connectors/src/connectors/)
- **API Gateway & Perimeter Security:** [`apps/api-gateway/src/index.ts`](../apps/api-gateway/src/index.ts)
  - Token Termination Middleware: [`apps/api-gateway/src/auth/tokenTermination.ts`](../apps/api-gateway/src/auth/tokenTermination.ts)
  - Sliding-Window Rate Limiter: [`apps/api-gateway/src/rate-limiter/slidingWindowRateLimiter.ts`](../apps/api-gateway/src/rate-limiter/slidingWindowRateLimiter.ts)

### 2. Visual Interfaces & Wireframes
- **Campus at a Glance Dashboard Wireframe:** [`docs/wireframes/dashboard-wireframe.svg`](wireframes/dashboard-wireframe.svg)
- **Conversational Assistant View Wireframe:** [`docs/wireframes/conversational-assistant-wireframe.svg`](wireframes/conversational-assistant-wireframe.svg)

### 3. Technology Comparison Code Snippets
- **Redis vs. In-Memory Cache Comparison:** [`comparisons/Redis-vs-memory/README.md`](../comparisons/Redis-vs-memory/README.md)
  - In-Memory Implementation: [`comparisons/Redis-vs-memory/in-memory-map-cache.ts`](../comparisons/Redis-vs-memory/in-memory-map-cache.ts)
  - Redis Implementation: [`comparisons/Redis-vs-memory/redis-cache.ts`](../comparisons/Redis-vs-memory/redis-cache.ts)
- **Fastify vs. Express Gateway Comparison:** [`comparisons/Fastify-vs-Express/README.md`](../comparisons/Fastify-vs-Express/README.md)
  - Fastify Gateway Sample: [`comparisons/Fastify-vs-Express/fastify-gateway-sample.ts`](../comparisons/Fastify-vs-Express/fastify-gateway-sample.ts)
  - Express Gateway Sample: [`comparisons/Fastify-vs-Express/express-gateway-sample.ts`](../comparisons/Fastify-vs-Express/express-gateway-sample.ts)

### 4. Automated Offline Test Suites
The repository contains a 100% offline-executable, zero-network test suite executed via Vitest (`npm test` / `vitest run`), validating all contracts, mock flows, intent routing, and security boundaries in compliance with NFR-08:
- **Connector test group (`tests/connectors/`):** [`tests/connectors/`](../tests/connectors/) (76 tests passing across 7 test files, covering mock connectors, cache stores, circuit breaker state machine, config parser, and resilient executor)
- **Web intent router (`apps/web/tests/routeStudentQuery.test.ts`):** [`apps/web/tests/routeStudentQuery.test.ts`](../apps/web/tests/routeStudentQuery.test.ts) (45 tests passing, validating bilingual normalization and deterministic routing across 40 labeled queries)
- **MCP server and agent (`tests/mcp-server/`):** [`tests/mcp-server/`](../tests/mcp-server/) (95 tests in 7 files at the time of PR #39: dispatcher, HTTP connectors, agent orchestrator, agent stream, SSE transport, Gemini provider with a stubbed `fetch`, PII scrubber). These tests use stubs and the fake provider; they are not acceptance tests.
- **API gateway (`apps/api-gateway/tests/jwtAuth.test.ts`):** [`apps/api-gateway/tests/jwtAuth.test.ts`](../apps/api-gateway/tests/jwtAuth.test.ts) (7 tests passing, verifying JWT verification, token stripping, header injection, and rate limiting)

**Overall Test Suite Total:** **146 tests, 10 test files** (0 failures, completed in < 1s offline). *(PA2 baseline.)*

**PA3 update:** `npx vitest run` on `dev` at `1dd775a` (22 Nov 2026, run by Murat Can Işık on Windows 11, Node.js v24, Vitest 5.1.0): **373 tests passed, 8 skipped, in 34 files**. The 8 skipped tests are the real-Redis group of the connector tests (they need a Redis server; Arda ran them against Redis 7.0 in a separate Linux environment, see `handovers/arda.md` §7). Acceptance results are in the Test Results Report v1.1.

---

## 6. Document-Specific Task Matrix

The task matrix below records the individual efforts contributed exclusively toward researching, drafting, cross-reviewing, and finalizing this **Design Document** deliverable for Project Assignment 2.

> [!IMPORTANT]
> **Effort Accounting & Double-Counting Policy:**
> In accordance with course project guidelines, software engineering implementation hours (e.g., coding `packages/shared`, `apps/mcp-server`, `packages/connectors`, `apps/web`, `apps/api-gateway`, and test suites) are tracked separately under Phase 2 development budgets (1.5 h estimated per member) and are **excluded** from this document matrix.
> 
> Actual hours are reported strictly where team members formally logged their time in their handoff notes; where not recorded, they are marked as *"Not reported"* or *"Not recorded"* to prevent artificial equalizations.

| Task ID | Document Authoring Work Package | Assigned Lead | Reviewer | Planned Allocation (h) | Actual Effort (h) | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TSK-DES-01** | Section 1 (System Overview, Architecture Diagram, Tech Stack) & Document Consolidation | Murat Can Işık | Ahmet Sefa Efendioğlu | 0.75 | 0.50 | Completed |
| **TSK-DES-02** | Section 2.2.1, 2.3.1, 2.3.2 & 2.3.6 (MCP Server, ToolDispatcher, AI Agent Skeleton, Tool Contracts) | Murat Can Işık | Arda Çelik | 0.75 | 0.50 | Completed |
| **TSK-DES-03** | Section 2.2.2 & 2.3.3 (Web Client Architecture, Bilingual Deterministic Intent Router) | Yunus Emre Biçer | Murat Can Işık | 0.50 | Not reported | Completed |
| **TSK-DES-04** | Section 2.4 (Visual Interfaces, Responsive Layouts, SVG Wireframe Descriptions) | Yunus Emre Biçer | Ahmet Sefa Efendioğlu | 0.50 | Not reported | Completed |
| **TSK-DES-05** | Section 3 (Use Cases UC-01–UC-04, Traceability, Sequence Diagrams, Demo Criteria) | Yunus Emre Biçer | Arda Çelik | 0.50 | Not reported | Completed |
| **TSK-DES-06** | Section 2.1 (Monorepo Layout, Packaging, Codebase Structure) | Arda Çelik | Murat Can Işık | 0.30 | Not recorded | Completed |
| **TSK-DES-07** | Section 2.2.3 & 2.3.4 (Campus Connectors, Deterministic Mocking, TTL Caching, Resilience) | Arda Çelik | Murat Can Işık | 0.50 | Not recorded | Completed |
| **TSK-DES-08** | Section 2.3.4 (Component Signatures for Connectors, Cache, and Circuit Breakers) | Arda Çelik | Murat Can Işık | 0.30 | Not recorded | Completed |
| **TSK-DES-09** | Section 4 (Design Decisions: 4.1 Redis vs Memory Map, 4.2 Fastify vs Express Editing) | Arda Çelik | Ahmet Sefa Efendioğlu | 0.40 | Not recorded | Completed |
| **TSK-DES-10** | Section 2.2.4 & 2.3.5 (API Gateway Architecture, Perimeter Security, Rate Limiter Signatures) | Ahmet Sefa Efendioğlu | Murat Can Işık | 0.15 | Not reported | Completed |
| **TSK-DES-11** | Section 4.2 Material (Fastify vs Express Benchmark Evaluation & Comparison Code) | Ahmet Sefa Efendioğlu | Arda Çelik | 0.15 | Not reported | Completed |
| **Total Effort**| **Collaborative Design Document Authoring & Cross-Review** | **All Members** | **Full Team** | **4.80 h** | **Collaborative** | **Completed** |

**PA3 update tasks (Version 1.1 onward):**

| Task ID | Document Work Package | Assigned Lead | Source / Reviewer | Planned Allocation (h) | Actual Effort (h) | Status |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **TSK-DES-12** | Web client handover for the Design Document (Y-13) | Yunus Emre Biçer | Murat Can Işık (review, PR #21) | Not recorded | Not recorded | Completed |
| **TSK-DES-13** | Update of the web client sections 1.2, 1.3, 2.1, 2.2.2, 2.3.3, 2.4, 3.2–3.6, 5; SSE reconnect decision (M-11) | Murat Can Işık | Source: Yunus Emre Biçer; reviewer: Yunus Emre Biçer | Not recorded | Not recorded | In review |
| **TSK-DES-14** | Update of gateway, MCP/agent and connector sections (M-11) | Murat Can Işık | Sources: Murat (MCP/agent), Sefa and Arda handovers (gateway, connectors; Version 1.3) | Not recorded | Not recorded | Completed (Version 1.4) |

*Summary of Member Document Allocations:*
- **Murat Can Işık:** Estimated 1.50 h | Actual: 1.00 h
- **Yunus Emre Biçer:** Estimated 1.50 h | Actual: Not reported
- **Arda Çelik:** Estimated 1.50 h | Actual: Not recorded
- **Ahmet Sefa Efendioğlu:** Estimated 0.30 h | Actual: Not reported
- **Planned Documentation Subtotal:** **4.80 h** (matches Phase 2 documentation planning allocations).
