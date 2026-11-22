# Handover — API Gateway, Perimeter Security & Release Orchestration (Ahmet Sefa Efendioğlu)

| Field | Detail |
| :--- | :--- |
| **Author** | Ahmet Sefa Efendioğlu (241101066) — `@Sefa-Efendioglu` |
| **Component** | `apps/api-gateway/**`, `compose.yaml`, `tests/contracts/fixtures/query-{invalid-params,unauthorized}.json`, `docs/assignment3/{Deployment_Plan,Test_Results_Report}.md`, `docs/QA_Plan.md`, `docs/assignment3/evidence/{AT-01..04,deployment,security}/` |
| **For** | Murat Can Işık (`Design_Document` M-11, `traceability` M-12), Arda Çelik (`TC-06` alignment), Yunus Emre Biçer (`AT-01..AT-04` v1.0 & release check) |
| **Version / Date** | **1.3, 22 November 2026** *(1.0/1.1: 20 Nov; 1.2–1.3: 22 Nov 2026)* |
| **Verified Base SHAs** | `dev` @ `13f71d738a895c62d8e28293e0bf47d60b01e1d5` (`AT-01`..`AT-03`, `NFR-01/02`) & `18d2e309ba154d4b61648c0f6252a66c72ea992e` (`AT-04` + `--mode=smoke`) |

---

## 1. API Contract v1.1 §8 & Compose Updates (Owner: Sefa)

- **Q4 (`AGENT_STREAM_URL`), Q5 (No CORS / Next.js rewrite), Q6 (`GATEWAY_PORT=3000`):** Merged in `PR #22` and verified end-to-end across all four services.
- **PR #44 (`fix/pa3-compose-mcp-egress`, merged on `dev`):** Added the `egress` (`driver: bridge`) network attached **solely** to `mcp-server` (`networks: [internal, egress]`) plus `GEMINI_MODEL: ${GEMINI_MODEL:-gemini-3.5-flash-lite}`. Resolved Murat's `EAI_AGAIN` Gemini DNS block (`generativelanguage.googleapis.com:443 -> TLSv1.3`) while keeping `web` (`edge` only) and `redis` (`internal` only) isolated (`web -> mcp-server:3001` & `web -> redis:6379` `BLOCKED:TIMEOUT`).

---

## 2. Implemented Gateway Endpoints & Security Guarantees

- `GET /health`: rate-limit exempt heartbeat.
- `POST /api/v1/auth/mock-login`, `GET /api/v1/auth/me`: HS256 mock-SSO (`MOCK_SSO_ISSUER=campus-mock-sso`), `getJwtSecret()` fails fast in `NODE_ENV=production` when unset.
- `POST /api/v1/query` & `POST /api/v1/chat/stream`: real HTTP JSON-RPC 2.0 & SSE proxies (`30 req/60s` Redis sorted-set sliding-window rate limiter via `RespTcpRedisClient` with fail-open fallback). Strips all inbound `X-Authenticated-*` and `Authorization` headers; forwards only verified identity headers; maps errors to Contract §3.4 (`400`/`401`/`429`/`502`/`503`/`504`).

---

## 3. Verified Acceptance, Benchmark & QA Documentation Status (22 Nov 2026)

Executed end-to-end in real headless Google Chrome (`157.0.8103.79`) + full 4-service Docker Compose (`Docker 29.9.3`, `Compose v5.7.0`) with gitignored local `.env` carrying `GEMINI_API_KEY`:

- **Vitest (`npx vitest run`):** **33 / 33 files, 366 passed | 8 skipped** (`tests/connectors/redisIntegration.test.ts` requires local `REDIS_TEST_URL`).
- **Gateway Harnesses (`S-07`):** `--mode=stub-self-test` **`12 / 12` PASS**; live Compose `--mode=smoke` **`11 / 11` PASS** (`gateway-live-smoke.txt`, `2186 bytes` SSE).
- **4-Service Compose & Egress (`compose-4service-egress-smoke.txt`):** `4/4` `healthy`, `mcp-server /health` reports `runtime.cache: "redis"` and `agent.provider: "gemini"`, outbound TLS 443 OK, `S-06` isolation verified, Redis cache & live `429` rate limit verified.
- **Official Acceptance Tests (`Acceptance_Tests_and_Criteria.md` v0.6) — `4 / 4 PASS`:**
  - **`AT-01` (UC-01):** **`PASS`** (`evidence/AT-01/` — Steps 1–9 incl. 1st `LIVE` / 2nd `CACHE_HIT` `1` upstream call, weekend, `400 INVALID_PARAMS`, `375 px` `scrollWidth=375`).
  - **`AT-02` (UC-02):** **`PASS`** (`evidence/AT-02/` — Steps 1–8 incl. `22:30` restart empty-state `AC-02.5`).
  - **`AT-03` (UC-03):** **`PASS`** (`evidence/AT-03/` — Steps 1–7 incl. `LIBRARY_CONNECTOR_MODE=live` at `+83.4 s` returning Redis `STALE` with original timestamp).
  - **`AT-04` (UC-04):** **`PASS`** (`evidence/AT-04/` — Steps 1–9 PASS + Step 10 conditional `>5 s` slow notice observed at `7664 ms`: browser `"Gönder"` → `POST /api/v1/chat/stream` HTTP 200, `3` `tool` + `23` `token` + `done`, `3` UI badges, `3` `[agent-tool]` lines with `0` identity args, `provider="gemini"` `isFake=false`, `0` raw JWT/key/PII leaks across `mcp-server` logs, forged header stripped on query & chat, host `:3001` `ECONNREFUSED`, expired/tampered JWT `401`).
- **`NFR-01` / `NFR-02` Benchmark (`nfr-e2e-latency-cache-benchmark.txt`):** 20 concurrent students × 25 requests (`500/500` HTTP `200`), **`99.4%` cache hit ratio**, **`44.41 ms` cached P95 latency** (`44.26 ms` overall).
- **Finalized Deliverables:** `Test_Results_Report.md` **v1.0**, `Deployment_Plan.md` **v1.1**, `QA_Plan.md` **v1.5** (applied Arda's **TC-06** threshold note from `handovers/arda.md` §5).

---

## 4. Review Confirmations & Release Coordination (`S-12`, `S-13`)

1. **For Murat (`M-11` / `M-12` Design & Traceability Review):**
   - **Confirmed:** `docs/Design_Document.md` **v1.3** sections **§2.2.4** and **§2.3.5** and `docs/assignment3/traceability.md` **v0.3** accurately reflect the implemented API gateway, Redis rate limiter, token termination, and error contracts (only noting the pre-`PR #44` `compose.yaml` network finding is resolved by `PR #44` and all `AT-01..AT-04` rows can move to `PASS`).
2. **For Arda:** `TC-06` in `docs/QA_Plan.md` **v1.5** reflects `≤ 850 ms` (`800 ms` timeout cutoff + `50 ms` overhead) for Step 3 and `< 50 ms` for Step 5 open-circuit fallback, and live Redis `STALE` fallback passed end-to-end in `AT-03` Step 7.
3. **For Yunus (`Acceptance_Tests_and_Criteria.md` v1.0 freeze on 26 Nov):** All `15` screenshots, redacted network/MCP logs, and `AT-01..AT-04` Appendix A records (`4/4 PASS`) are stored under `docs/assignment3/evidence/AT-01..04/`.
