# Deployment Plan

**Campus Data Orchestrator — Model Context Protocol (MCP) Based Campus Data Orchestrator**

| Field | Detail |
| :--- | :--- |
| **Course** | BIL 481 Software Engineering, Fall 2026, TOBB University of Economics and Technology |
| **Assignment** | Project Assignment 3 — Deliverable 1: Deployment Plan |
| **Group Name** | Group-ASYM |
| **Document Lead & Primary Author** | **Ahmet Sefa Efendioğlu** (241101066) — `@Sefa-Efendioglu` |
| **Document Version / Date** | **Version 1.3 (Full 4-Service Compose, AT v0.7 Run 2, Live Smoke & Guest Rate-Limit Limitation), 22 November 2026** |
| **Repository Filepath** | `docs/assignment3/Deployment_Plan.md` |
| **Verified Base Commit SHA** | `dev` @ `2bd45ce` (`PR #48` & `#49` merged) / branch `61af2b038e53738adb089df254c7bc895df6eea3` *(earlier `AT-01..03` & `NFR-01/02` on `13f71d7`)* |
| **Related Documents** | `docs/assignment3/contracts/API_CONTRACT.md` (v1.1), `docs/assignment3/Acceptance_Tests_and_Criteria.md` (v0.7), `docs/assignment3/Test_Results_Report.md` (v1.1), `docs/QA_Plan.md` (v1.6) |

> **Verification Summary (v1.3):** All four containerized services (`redis`, `mcp-server`, `api-gateway`, `web`) in [`compose.yaml`](../../compose.yaml) build cleanly on `node:24-alpine` / `redis:7-alpine`, reach Docker `healthy`, enforce strict `S-06` network isolation (`edge`, `internal: true`, and `mcp-server`-only `egress`), and execute all four official acceptance workflows end-to-end (`AT-01`..`AT-04` **`4 / 4 PASS`**, including `AT-04` Run 2 on Tuesday `2026-11-24T12:10:00+03:00` with `PR #48` Markdown rendering and real Google Gemini via gitignored local `.env`), plus live `--mode=smoke` (`11/11` PASS, [`gateway-live-smoke.txt`](evidence/deployment/gateway-live-smoke.txt)) and the `500`-request `NFR-01`/`NFR-02` benchmark ([`nfr-e2e-latency-cache-benchmark.txt`](evidence/deployment/nfr-e2e-latency-cache-benchmark.txt)).

---

## List of Contributors

In compliance with the Project Assignment 3 deliverables specification, contributors and their verified current status for this document are listed on the first page:

| Member Name | Student ID | GitHub Account | Project Role | Contribution to this Document | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Ahmet Sefa Efendioğlu** | 241101066 | `@Sefa-Efendioglu` | Gateway, Security & Release Lead | **Lead Author:** Authored `apps/api-gateway/Dockerfile`, `.dockerignore`, `compose.yaml` (`egress` fix `PR #44`), Deployment Overview, Configuration Plan; verified full 4-service Compose stack, `S-06` network boundaries, Redis persistence, `--mode=smoke`, `NFR-01`/`NFR-02` benchmark, and `AT-01..AT-04`. | **Completed (v1.3)** |
| **Yunus Emre Biçer** | 241101009 | `@YunusEmre113` | Web Client Lead | Delivered `apps/web/Dockerfile`, `/healthz`, standalone build, `apps/web/README.md` (`PR #18`), `/giris` login (`PR #20`), and streaming chat screen (`Y-07`, `PR #32`). | Handover merged (`#18`, `#20`, `#32`) |
| **Murat Can Işık** | 241101013 | `@cmuratt` | MCP Server & Agent Lead | Delivered `apps/mcp-server/Dockerfile` (`M-13`, `PR #28`), connector-backed MCP runtime (`PR #26`, `#40`), `AgentOrchestrator` + Gemini + `/internal/agent/stream` (`PR #29`, `#34`, `#35`, `#39`), and [`handovers/murat.md`](handovers/murat.md). | Handover merged (`#28`, `#42`, `#45`) |
| **Arda Çelik** | 241101065 | `@ardacelik11` | Connectors & Data Lead | Delivered live Redis connector runtime (`A-02`, `PR #30`, `#31`), advancing `CONNECTOR_FIXED_NOW` (`Q3`), Redis verification commands, and [`handovers/arda.md`](handovers/arda.md). | Handover merged (`#30`, `#31`) |

---

## Table of Contents

1. [Document-Specific Task Matrix](#document-specific-task-matrix)
2. [Deployment Overview](#1-deployment-overview)
   - 2.1 [Service Topology & Network Architecture](#11-service-topology--network-architecture)
   - 2.2 [Tools, Runtime & Observed Environment](#12-tools-runtime--observed-environment)
   - 2.3 [Mock vs. Live Data Source Boundary](#13-mock-vs-live-data-source-boundary)
3. [Deployment Process](#2-deployment-process)
   - 3.1 [Verified Local Build, Test & Standalone Gateway Runbook](#21-verified-local-build-test--standalone-gateway-runbook)
   - 3.2 [Verified 4-Service Docker Compose Stack (`web` + `api-gateway` + `mcp-server` + `redis`)](#22-verified-4-service-docker-compose-stack-web--api-gateway--mcp-server--redis)
   - 3.3 [Acceptance Runbook (`CONNECTOR_FIXED_NOW` & Fault Mode)](#23-acceptance-runbook-connector_fixed_now--fault-mode)
   - 3.4 [Smoke Verification, Benchmark & Shutdown / Rollback](#24-smoke-verification-benchmark--shutdown--rollback)
4. [Configuration Plan](#3-configuration-plan)
   - 4.1 [Environment Variables & Port Allocation](#31-environment-variables--port-allocation)
   - 4.2 [Authentication, Secret Handling & Dev-Only Mock SSO Notice](#32-authentication-secret-handling--dev-only-mock-sso-notice)
   - 4.3 [Network Security Boundary & Healthchecks](#33-network-security-boundary--healthchecks)
   - 4.4 [Cache TTLs, Rate Limits & Timezone Defaults](#34-cache-ttls-rate-limits--timezone-defaults)
   - 4.5 [Known Limitations & Open Items](#35-known-limitations--open-items)
5. [Change Record](#change-record)

---

## Document-Specific Task Matrix

| Task ID | Work Package Description | Assignee | Reviewer | Status |
| :--- | :--- | :--- | :--- | :--- |
| **TSK-DEP-01** | Draft Deployment Overview, topology, runtime inventory, and mock boundary (§1) | Ahmet Sefa Efendioğlu | Entire Team | **Completed (v1.3)** |
| **TSK-DEP-02** | Author `apps/api-gateway/Dockerfile`, `.dockerignore`, and `compose.yaml` (`S-05`, `S-06`, `PR #22`, `#44`) | Ahmet Sefa Efendioğlu | Murat Can Işık, Yunus Emre Biçer | **Completed & Verified** (`compose config`, isolated `egress` network, live 4-service Compose smoke) |
| **TSK-DEP-03** | Document verified local build/test/stub runbook & 4-service Compose procedure (§2) | Ahmet Sefa Efendioğlu | Entire Team | **Completed (v1.3)** |
| **TSK-DEP-04** | Finalize Configuration Plan, env matrix, secret handling, and network boundaries (§3) | Ahmet Sefa Efendioğlu | Arda Çelik, Murat Can Işık | **Completed (v1.3)** |
| **TSK-DEP-05** | Integrate `apps/web/Dockerfile` handover (`PR #18`) into `dev` and verify web container build | Yunus Emre Biçer / Ahmet Sefa Efendioğlu | Ahmet Sefa Efendioğlu | **Completed & Verified** (`#18` merged & verified in 3-service & 4-service Compose) |
| **TSK-DEP-06** | Deliver `apps/mcp-server/Dockerfile`, connector registration, `/internal/agent/stream` (`M-02`..`M-08`, `M-13`) | Murat Can Işık | Ahmet Sefa Efendioğlu | **Completed & Verified** (`#26`, `#28`, `#29`, `#34`–`#40`, `#44`, `#45` merged) |
| **TSK-DEP-07** | Deliver live Redis connector config, `CONNECTOR_FIXED_NOW`, and Redis handover (`A-02`, `A-12`, `Q3`) | Arda Çelik | Ahmet Sefa Efendioğlu | **Completed & Verified** (`#30`, `#31` merged; Redis `cache:*` & `PTTL` verified in Compose) |
| **TSK-DEP-08** | Execute 4-service `docker compose up --build`, health checks, live `--mode=smoke`, and E2E benchmark (`S-05`, `S-06`, `S-07`) | Ahmet Sefa Efendioğlu | Entire Team | **Completed & Verified** (`compose-4service-egress-smoke.txt`, `gateway-live-smoke.txt`, `nfr-e2e-latency-cache-benchmark.txt`) |

---

## 1. Deployment Overview

### 1.1 Service Topology & Network Architecture

The Campus Data Orchestrator demo stack runs as four Docker Compose services partitioned across three Docker bridge networks (`API Contract v1.1 §1`, `§7`):

```text
Browser (User)
   │  HTTP :3002 (/, /giris, /asistan, /api/v1/*)
   ▼
[web] Next.js 16 Standalone (:3002, network: edge ONLY, USER web)
   │  Server-side rewrite /api/v1/* -> http://api-gateway:3000 (no gateway CORS needed)
   ▼
[api-gateway] Fastify 4.28 (:3000, networks: edge + internal, USER node)
   │  1. Verify mock-SSO HS256 JWT; strip raw Authorization & client X-Authenticated-* headers
   │  2. Sliding-window rate limit (30 req/60s via Redis sorted set or fail-open fallback)
   │  3. Inject trusted X-Authenticated-Student-Id & X-Authenticated-User-Role
   │
   ├── POST http://mcp-server:3001/mcp (JSON-RPC 2.0 tools/call) ──┐
   └── POST http://mcp-server:3001/internal/agent/stream (SSE)  ──┼──► [mcp-server] (:3001, networks: internal + egress, USER node)
                                                                       │      │
                                                                 (internal)  (egress -> HTTPS 443)
                                                                       ▼      ▼
                                                             [redis] (:6379)  External Gemini API
                                                     (network: internal ONLY) (generativelanguage.googleapis.com)
```

### 1.2 Tools, Runtime & Observed Environment

| Component / Tool | Target / Observed Version | Notes |
| :--- | :--- | :--- |
| **Operating System** | Host verification: **Windows 11 (`Windows_NT 10.0.26200`)**; Container runtime: **`node:24-alpine`** | Linux containers executed via WSL 2 engine |
| **Node.js / npm** | Observed locally: **Node.js `v26.4.0`**, **npm `11.17.0`** | Monorepo npm workspaces (`shared`, `connectors`, `mcp-server`, `api-gateway`, `web`) |
| **TypeScript / Build** | TypeScript `^5.4.5` (`strict`, `NodeNext`), Next.js `16.4.6` (`output: 'standalone'`) | `tsc` & `apps/web/Dockerfile` build cleanly on `node:24-alpine` *(Windows sandbox hits transient `EPERM: mkdir` during standalone trace; Docker build is unaffected)* |
| **Test Runner** | Vitest `^5.1.0` | **34 test files / 373 passed \| 8 skipped** (`8` Redis integration tests require `REDIS_TEST_URL`, verified in `PR #31` against Redis 7.0.15) |
| **Container Engine** | **Docker `29.9.3`**, **Docker Compose `v5.7.0`** | Full 4-service `compose.yaml` build & runtime verified |
| **Browser (AT Runner)** | **Google Chrome `157.0.8103.79`** | Real CDP headless execution at `1440×900` and `375×812` |
| **Cache Store** | **`redis:7-alpine`** (`internal` network only) | Used simultaneously by connector TTL/3×TTL cache (`cache:*`) and gateway sliding-window rate limiter (`rate:*`) |

### 1.3 Mock vs. Live Data Source Boundary

Official TOBB ETÜ production campus APIs (dining portal, shuttle GPS, library turnstiles, SIS timetable) are unavailable to the team. All four connectors run in **deterministic synthetic mock mode** (`*_CONNECTOR_MODE=mock`). Every response returns `meta.source` (`LIVE | CACHE_HIT | STALE | ERROR`, execution path) independently from `meta.isSimulated: true` (synthetic data provenance). Switching any `*_CONNECTOR_MODE=live` exercises the fail-closed placeholder (`UPSTREAM_UNAVAILABLE`) and triggers Redis stale-if-error fallback (`AT-03` Step 7).

---

## 2. Deployment Process

### 2.1 Verified Local Build, Test & Standalone Gateway Runbook

Verified on clean `origin/dev` (`2bd45ce`):

1. **Install dependencies cleanly from repository root:**
   ```bash
   npm ci
   ```
   *(On Windows, run `npm.cmd ci` / `npx.cmd` if PowerShell execution policy restricts `.ps1` shims.)*
2. **Build TypeScript packages in dependency order and run the offline Vitest suite:**
   ```bash
   npm run build --workspace @campus-orchestrator/shared
   npm run build --workspace @campus-orchestrator/api-gateway
   npx vitest run
   ```
   **Observed result:** Build exits `0`; Vitest reports **`34` test files passed, `373` tests passed, `8` skipped** (the `8` real-Redis integration tests in `tests/connectors/redisIntegration.test.ts`).
3. **Run the gateway contract & security stub self-test harness (gateway-only verification):**
   ```bash
   node apps/api-gateway/scripts/run-acceptance-harness.mjs --mode=stub-self-test
   ```
   **Observed result:** `12/12` assertions passed (`STUB_SELF_TEST_PASSED`, zero raw `Authorization` headers forwarded).

### 2.2 Verified 4-Service Docker Compose Stack (`web` + `api-gateway` + `mcp-server` + `redis`)

Verified in full after `PR #44` (`compose.yaml` `egress` network fix), `PR #45`, `PR #48` (chat Markdown), and `PR #49` (`AT v0.7`) on `2bd45ce` with real `.env` `GEMINI_API_KEY`:

1. **Create `.env` from template (never commit `.env`):**
   ```bash
   cp .env.example .env
   ```
   Set a strong non-default `JWT_SECRET` and set the team `GEMINI_API_KEY` (`GEMINI_MODEL=gemini-3.5-flash-lite`).
2. **Validate Compose topology:**
   ```bash
   JWT_SECRET=compose-validation-placeholder docker compose -f compose.yaml config --quiet
   ```
   **Observed result:** Exit code `0`.
3. **Build and launch all four services together (respecting `depends_on: condition: service_healthy`):**
   ```bash
   docker compose up --build -d
   ```
   **Observed startup order (`Arda §5` / `compose.yaml`):**
   `redis` (`healthy`) → `mcp-server` (`healthy`, `/health` reports `runtime.cache: "redis"`, `agent.provider: "gemini"`) → `api-gateway` (`healthy`, `:3000/health`) → `web` (`healthy`, `:3002/healthz`).
4. **Verify Compose security & egress (`compose-4service-egress-smoke.txt` & `AT-04` Run 2 live run):**
   - `mcp-server` outbound HTTPS via isolated `egress` network: `generativelanguage.googleapis.com:443 -> EGRESS_OK:172.217.112.4:TLSv1.3` and real Gemini streamed responses (`AT-04` Run 2: `3` `tool`, `21` `token`, `1` `done`).
   - `S-06` isolation intact: `redis` on `*_internal` only (`Ports: {"6379/tcp":null}`), `mcp-server` on `*_internal` + `*_egress` (`Ports: {"3001/tcp":null}`), `web` on `*_edge` only (`3002:3002`); host `:3001` `ECONNREFUSED`; `web -> mcp-server:3001` `BLOCKED:TIMEOUT`; `web -> redis:6379` `BLOCKED:TIMEOUT`.

### 2.3 Acceptance Runbook (`CONNECTOR_FIXED_NOW` & Fault Mode)

1. **Pin connector test clock (`AT-01..AT-03` Monday 09:00 / `AT-04` Tuesday 12:10):**
   ```bash
   # AT-01..AT-03 weekday 09:00 clock:
   CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 docker compose up --build -d
   # AT-04 (AT v0.7) Tuesday 12:10 clock before clearing cache:
   CONNECTOR_FIXED_NOW=2026-11-24T12:10:00+03:00 docker compose up -d mcp-server
   ```
   *Operational note (observed in AT-03 Step 7):* `CONNECTOR_FIXED_NOW` anchors the connector clock to the specified instant **when the `mcp-server` process starts** and advances in real time. Recreating `mcp-server` with the same `CONNECTOR_FIXED_NOW` re-anchors its clock back to that instant; when testing `STALE` fallback across a restart, ensure the elapsed uptime of the restarted container exceeds the `cachedAt` offset + `60 s` TTL while remaining inside the `180 s` (`3 × TTL`) Redis physical retention window.
2. **Reset tool cache between scenarios:**
   ```bash
   docker compose exec redis sh -c "redis-cli --scan --pattern 'cache:*' | xargs -r redis-cli del"
   ```
3. **End-of-service override (`AT-02` Step 8) & stale fault injection (`AT-03` Step 7):**
   ```bash
   CONNECTOR_FIXED_NOW=2026-11-23T22:30:00+03:00 docker compose up -d mcp-server
   LIBRARY_CONNECTOR_MODE=live docker compose up -d mcp-server
   # Restore defaults afterward:
   CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 LIBRARY_CONNECTOR_MODE=mock docker compose up -d mcp-server
   ```

### 2.4 Smoke Verification, Benchmark & Shutdown / Rollback

- **Live gateway smoke harness (`S-07`, `2026-11-22T16:39:48Z`):**
  ```bash
  GATEWAY_URL=http://localhost:3000 node apps/api-gateway/scripts/run-acceptance-harness.mjs --mode=smoke
  ```
  **Observed result:** **`11 / 11` PASS** including live `UC-04_CHAT_SSE_STREAM` (`received 1886 bytes of SSE frames`, [`gateway-live-smoke.txt`](evidence/deployment/gateway-live-smoke.txt)).
- **End-to-end Compose throughput & cache benchmark (`nfr-e2e-latency-cache-benchmark.txt`):**
  20 concurrent authenticated students × 25 requests (`500` requests, `0` errors, wall time `869.9 ms`, `574.8 req/s`): **`99.4%` cache hit ratio** (`497 CACHE_HIT`, `3 LIVE`) and **`44.41 ms` cached P95 latency** (`44.26 ms` overall P95).
- **Graceful shutdown & clean reset:**
  - Standalone gateway traps `SIGINT` / `SIGTERM` and closes Fastify + Redis TCP sockets cleanly.
  - Full stack teardown:
    ```bash
    docker compose down --remove-orphans
    ```
  - Rollback: checkout target tag/SHA (`git checkout <sha>`), run `docker compose up --build -d`.

---

## 3. Configuration Plan

### 3.1 Environment Variables & Port Allocation

Aligned with `API Contract v1.1 §7`, `.env.example`, [`apps/mcp-server/README.md`](../../apps/mcp-server/README.md), and `compose.yaml`:

| Variable | Owner | Local Default | Compose Value | Required / Sensitive | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | Sefa | `development` | `production` | No | Enforces mandatory `JWT_SECRET` and `REDIS_URL` |
| `GATEWAY_PORT` | Sefa | `3000` | `3000` | No | Gateway listen port (`API Contract §8 Q6`) |
| `HOST` | Sefa | `0.0.0.0` | `0.0.0.0` | No | Gateway bind interface |
| `MCP_SERVER_PORT` | Murat | `3001` | `3001` (internal only) | No | Internal MCP server port (`expose` only, zero host `ports`) |
| `WEB_PORT` / `PORT` | Yunus | `3002` | `3002` | No | Next.js standalone listen port |
| `GATEWAY_URL` | Yunus | `http://localhost:3000` | `http://api-gateway:3000` | No (build arg) | Server-side `/api/v1/*` rewrite target in `apps/web/Dockerfile` |
| `NEXT_PUBLIC_WEB_DATA_SOURCE` | Yunus | `fixtures` | `gateway` | No (build arg) | Switches UI from offline fixtures to live gateway |
| `MCP_URL` | Sefa | `http://localhost:3001/mcp` | `http://mcp-server:3001/mcp` | No | Internal JSON-RPC 2.0 `tools/call` endpoint |
| `AGENT_STREAM_URL` | Murat / Sefa | `http://localhost:3001/internal/agent/stream` | `http://mcp-server:3001/internal/agent/stream` | No | Internal SSE stream endpoint (`API Contract §8 Q4`) |
| `REDIS_URL` | Arda / Sefa | `redis://localhost:6379` | `redis://redis:6379` | Required in Compose/prod | Shared cache (`mcp-server`) & rate limiter (`api-gateway`) |
| `JWT_SECRET` | Sefa | Dev fallback in non-prod | `${JWT_SECRET:?Set JWT_SECRET...}` | **Yes (Secret)** | HS256 JWT secret; throws at startup if unset when `NODE_ENV=production` |
| `MOCK_SSO_ISSUER` | Sefa | `campus-mock-sso` | `${MOCK_SSO_ISSUER:-campus-mock-sso}` | No | Expected JWT `iss` claim |
| `GEMINI_API_KEY` | Murat | Unset | `${GEMINI_API_KEY:-}` | **Yes (Secret)** | Google Gemini API key (`mcp-server` only; empty → `503 UPSTREAM_UNAVAILABLE`) |
| `GEMINI_MODEL` | Murat / Sefa | `gemini-3.5-flash-lite` | `${GEMINI_MODEL:-gemini-3.5-flash-lite}` | No | Demo model selector (`PR #44`; `gemini-2.0/2.5` returned 404 on team free tier on 21 Nov) |
| `*_CONNECTOR_MODE` | Arda | `mock` | `${*_CONNECTOR_MODE:-mock}` | No | `CAFETERIA_`, `SHUTTLE_`, `LIBRARY_`, `SCHEDULE_CONNECTOR_MODE` |
| `UPSTREAM_TIMEOUT_MS` | Arda | `800` | `${UPSTREAM_TIMEOUT_MS:-800}` | No | Connector upstream timeout bound (NFR-01) |
| `CACHE_TTL_*` | Arda | `3600` / `120` / `60` / `300` | Same | No | Cafeteria / Shuttle / Library / Schedule TTLs in seconds |
| `CONNECTOR_MOCK_SEED` | Arda | `481-FALL-2026` | `${CONNECTOR_MOCK_SEED:-481-FALL-2026}` | No | Deterministic synthetic data seed |
| `CONNECTOR_FIXED_NOW` | Arda | Unset (real UTC+3) | `${CONNECTOR_FIXED_NOW:-}` | No | Anchors connector clock at MCP boot (`API Contract §8 Q3`) |

### 3.2 Authentication, Secret Handling & Dev-Only Mock SSO Notice

- **Dev-Only Mock SSO:** `POST /api/v1/auth/mock-login` generates HS256 JWTs for synthetic personas (`demo-student-01`, `demo-student-02`) for academic demonstration only.
- **Secret Isolation:** `.env` and `.env.*` (except `.env.example`) are excluded via `.gitignore`, `apps/api-gateway/Dockerfile.dockerignore`, and `apps/mcp-server/Dockerfile.dockerignore`. All JWTs and API keys are omitted or redacted (`eyJ...<redacted>`) in repository logs and artifacts.

### 3.3 Network Security Boundary & Healthchecks

- **`edge` (`driver: bridge`):** Connects host-published `web` (`3002:3002`) and `api-gateway` (`3000:3000`). No CORS is enabled in `api-gateway` (`API Contract §8 Q5`).
- **`internal` (`driver: bridge`, `internal: true`):** Connects `api-gateway`, `mcp-server`, and `redis`. Neither `mcp-server` nor `redis` binds host `ports:`.
- **`egress` (`driver: bridge`):** Attached **exclusively** to `mcp-server` (`PR #44`) so `GeminiProvider` can resolve DNS and call `generativelanguage.googleapis.com:443` while keeping `web` and `redis` completely off external networks.
- **Healthchecks:** `api-gateway` (`127.0.0.1:3000/health`), `web` (`127.0.0.1:3002/healthz`), `mcp-server` (`127.0.0.1:3001/health`), `redis` (`redis-cli ping`).

### 3.4 Cache TTLs, Rate Limits & Timezone Defaults

- **Rate Limit Policy (FR-08):** `30` requests / `60 s` sliding window per `studentId` (`rate:student:<id>`) or guest IP (`rate:ip:<ip>`) stored in Redis sorted sets via `RespTcpRedisClient`, failing open to in-memory only on Redis outage; returns `429 RATE_LIMITED` + `Retry-After`. *(Unauthenticated guests behind Next.js server-side rewrites share the `web` container IP bucket; see §3.5 item 4.)*
- **Gateway Timeouts:** `10,000 ms` on `/api/v1/query` (`504 UPSTREAM_TIMEOUT`), `20,000 ms` on `/api/v1/chat/stream`.
- **Timezone:** Campus schedule and menu calculations use Türkiye Time (`UTC+3`).

### 3.5 Known Limitations & Open Items

1. **Standard MCP Client `tools/call` Gap (`M-09`):** `mcp-server` uses content `type: "json"` (contract §4); standard MCP Inspector accepts `tools/list` and rejects `tools/call` (`Invalid tools/call result`). Gateway and UI are unaffected; fix is planned post-demo.
2. **Gemini Free-Tier Model Availability:** Model availability depends on the active `.env` `GEMINI_API_KEY`; re-verify `GEMINI_MODEL` (`gemini-3.5-flash-lite`) before live presentation (`compose.yaml` passes it without rebuild).
3. **Deferred Scope:** PostgreSQL/Prisma user persistence (`FR-20`), Connector Health Card D (`FR-18`), and 5-student empirical SUS session (`NFR-06`) are deferred outside PA3 scope.
4. **Shared Guest Rate-Limit Bucket Behind Next.js Rewrite (`FR-08`):** Fastify runs with `trustProxy: false` (`apps/api-gateway/src/server.ts`), so `request.ip` reflects the TCP peer address (`apps/api-gateway/src/auth/tokenTermination.ts`). Authenticated users are keyed by `rate:student:<studentId>` (`apps/api-gateway/src/rate-limiter/slidingWindowRateLimiter.ts`) and are unaffected, whereas all unauthenticated guest requests proxied through Next.js's server-side `/api/v1/*` rewrite (`apps/web/next.config.ts`) arrive from the `web` container's `edge` bridge IP and share a single `30 req / 60 s` sliding-window bucket (`rate:ip:<web-container-ip>`). Enabling `trustProxy` / trusting `X-Forwarded-For` is intentionally avoided without a hardened perimeter reverse proxy, because Next.js rewrites do not inject or strip client-supplied `X-Forwarded-For` headers, which would allow trivial IP spoofing and rate-limit bypass. This is acceptable for the single-user academic demo; production deployment requires a trusted front-end reverse proxy (e.g., Nginx or Envoy) that overwrites `X-Forwarded-For`, paired with hop-scoped Fastify `trustProxy`.

---

## Change Record

| Version | Date | Updated Section | Description of Changes | Updated By |
| :--- | :--- | :--- | :--- | :--- |
| **0.1** | 20 Nov 2026 | All | Initial Deployment Plan draft; added `compose.yaml`, gateway `Dockerfile`/`.dockerignore`, verified local build/test baseline, and recorded container/teammate blockers honestly. | Ahmet Sefa Efendioğlu |
| **0.2** | 20 Nov 2026 | Overview, §1.2, §2.2–2.4, §3.5 | Installed Docker Desktop `29.9.3` + Compose `v5.7.0`; fixed `.dockerignore`; verified `compose.yaml config`, gateway build, and live `api-gateway` + `redis:7-alpine` smoke test. | Ahmet Sefa Efendioğlu |
| **0.3** | 20 Nov 2026 | Overview, Contributors, Task Matrix, §1.2, §2.2, §3.5 | Verified 3-service Compose (`web` + `api-gateway` + `redis`) after `PR #18` & `#20` merge (`compose-3service-smoke.txt`); updated Vitest count to `230/230`. | Ahmet Sefa Efendioğlu |
| **1.0** | 22 Nov 2026 | All (`dev` @ `13f71d7`) | Integrated Murat (`#26`, `#28`, `#29`, `#34`–`#40`, `#45`) and Arda (`#30`, `#31`) deliverables + `PR #44` (`egress` network & `GEMINI_MODEL`); recorded full 4-service Compose verification (`compose-4service-egress-smoke.txt`), `NFR-01`/`NFR-02` benchmark (`nfr-e2e-latency-cache-benchmark.txt`), acceptance runbook (`CONNECTOR_FIXED_NOW`), and closed all deployment code blockers. | Ahmet Sefa Efendioğlu |
| **1.1** | 22 Nov 2026 | Summary, Task Matrix, §2.2, §2.4, §3.5 | Recorded full `AT-01`..`AT-04` **`4 / 4 PASS`** with real Gemini configured in gitignored `.env`, added live `run-acceptance-harness.mjs --mode=smoke` (`11/11 PASS`, `gateway-live-smoke.txt`), and closed the local `.env` key limitation in §3.5. | Ahmet Sefa Efendioğlu |
| **1.2** | 22 Nov 2026 | §3.4, §3.5 | Added known limitation for the shared guest IP rate-limit bucket behind Next.js rewrites and documented why `X-Forwarded-For` is intentionally untrusted without a perimeter reverse proxy (per Yunus Emre Biçer's review). | Ahmet Sefa Efendioğlu |
| **1.3** | 22 Nov 2026 | Header, §1.2, §2.1–2.4 | Synced with `dev` @ `2bd45ce` (`PR #48` chat Markdown + `PR #49` `AT v0.7`); added `AT-04` Tuesday `2026-11-24T12:10:00+03:00` clock command to §2.3; updated Vitest counts (`34` files, `373` passed / `8` skipped) and `AT-04` Run 2 / live `--mode=smoke` (`1886 bytes`) observations. | Ahmet Sefa Efendioğlu |
