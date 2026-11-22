# Handover — MCP Server, Shared Contract & UC-04 Agent (Murat Can Işık)

| Field | Detail |
| :--- | :--- |
| **Author** | Murat Can Işık (241101013) — `@cmuratt` |
| **Component** | `apps/mcp-server/**`, `packages/shared/**`, `docs/Design_Document.md` (M-11), `docs/assignment3/traceability.md` (M-12), `docs/assignment3/contracts/API_CONTRACT.md` (steward) |
| **For** | Ahmet Sefa Efendioğlu (Deployment Plan, Test Results, Compose), Yunus Emre Biçer (chat UI, AT-04 steps), Arda Çelik (connector runtime used by the MCP server) |
| **Version / Date** | 1.1, 22 November 2026 (1.0 was written on 21 November 2026) |
| **State described** | `dev` at `13b8fb8` (PR #26, #28, #29, #31, #34 – #39 merged). Items that are only in open pull requests are marked **(PR #n, open)** |
| **Team guide tasks** | M-01 .. M-13 |

> **How to use this note.** Section 1 is the status of every task. Section 3 is what the MCP process does on the wire, which Sefa and Yunus need for the Deployment Plan and AT-04. Section 5 lists every environment variable. Section 7 lists what is **not** done. Everything here reflects code that exists; planned items are labelled as planned. Nothing here is an acceptance-test result: AT-01..AT-04 have **not** been run by the QA owner.

---

## Contents

1. [Task status at a glance](#1-task-status-at-a-glance)
2. [Design Document updates for the agent (M-11)](#2-design-document-updates-for-the-agent-m-11)
3. [Wire behaviour of the MCP process](#3-wire-behaviour-of-the-mcp-process)
4. [Agent design (UC-04)](#4-agent-design-uc-04)
5. [Environment variables for the Deployment Plan](#5-environment-variables-for-the-deployment-plan)
6. [Verification performed](#6-verification-performed)
7. [Known gaps and open decisions](#7-known-gaps-and-open-decisions)
8. [Dependencies on other members](#8-dependencies-on-other-members)

---

## 1. Task status at a glance

| Task | What | Status | Where |
| :--- | :--- | :--- | :--- |
| M-01 / M-02 / M-03 | MCP server uses the `packages/connectors` runtime instead of sample handlers; `tools/call` returns the contract §3.2 metadata (`isSimulated`, `isStale`, `source`, `timestamp`, `durationMs`) in the JSON block; invalid params `-32602`; no CORS header on the internal service | Merged (PR #26) | `apps/mcp-server/src/server.ts`, `src/index.ts`, `src/wire/jsonRpc.ts` |
| M-13 | MCP Docker image and Compose service | Merged (PR #28). Built and run in Compose by Murat on 20 and 22 Nov (see section 6) | `apps/mcp-server/Dockerfile`, `compose.yaml` |
| M-04 .. M-07 | Agent core: `AgentOrchestrator`, `LlmProvider`, `FakeProvider`, `GeminiProvider`, PII scrubber, redacted outbound log | Merged (PR #29) | `apps/mcp-server/src/agent/` |
| M-08 | `POST /internal/agent/stream` (SSE, contract §3.3 / §8 Q4) | Merged (PR #34) | `apps/mcp-server/src/agent/agentStreamHandler.ts`, `src/index.ts` |
| M-05 follow-up | Gemini 3 `thoughtSignature` kept across rounds, retry on 429/5xx, default model `gemini-3.5-flash-lite` | Merged (PR #35) | `apps/mcp-server/src/agent/GeminiProvider.ts`, `LlmProvider.ts` |
| M-09 | MCP Inspector check; found and fixed an SSE session bug | Merged (PR #36); one **open gap** in section 7 | `apps/mcp-server/src/index.ts` |
| M-07 follow-up | One `tool_call` log line per executed tool (AC-04.5 evidence); cleaned tool arguments in the history sent back to the provider | Merged (PR #39) | `apps/mcp-server/src/agent/AgentOrchestrator.ts`, `outboundLog.ts` |
| M-02 follow-up | `/health` shows the real cache backend; stale "Redis not wired" log removed; README updated | **PR #40, open** (README in this documentation PR) | `apps/mcp-server/src/index.ts`, `apps/mcp-server/README.md` |
| M-10 | Tests for the MCP server and agent | Written with each branch; 95 tests in 7 files under `tests/mcp-server/` | `tests/mcp-server/` |
| M-11 | Design Document: web, MCP server and agent parts | Merged (PR #38 for MCP/agent); gateway and connector parts in a later revision | `docs/Design_Document.md` |
| M-12 | Traceability matrix | Merged; Murat rows updated again in v0.3 (this documentation PR) | `docs/assignment3/traceability.md` |
| Evidence | Curl run of the chain in the four-service Compose stack with real Gemini | **PR #41, open** | `docs/assignment3/evidence/AT-04/gateway-agent-gemini-compose-smoke.txt` |

**What works end to end today.** On 22 Nov 2026 the four-service Compose stack was started and a chat question was sent through the gateway with a mock-SSO JWT: three `tool` events, `token` events and one `done` event from the **real Gemini provider**, Redis as the cache (`CACHE_HIT` on repeated calls), and one `[agent-tool]` line per tool. This was a curl run, **not** a browser run and **not** an AT-04 result. It only worked with an extra Compose network for `mcp-server` (finding in section 7); without it the agent cannot reach Gemini.

---

## 2. Design Document updates for the agent (M-11)

The MCP server and agent sections were updated in Design Document v1.2 (PR #38) from the first version of this handover. Changes since then that a later revision should pick up:

| Design Document section | Change since v1.2 |
| :--- | :--- |
| §1.2, §2.2.1, §3.5 (statements about open PRs) | PR #34, #35 and the SSE fix (#36) are merged; remove the "open" wording. |
| §2.2.1 item 4 (connector runtime) | The cache is Redis in Compose since PR #31; the "in-memory until PR #31" sentence is out of date. |
| §2.2.1 item 5 (agent) | Add the `tool_call` log line and that the history sent back to the provider carries the cleaned arguments (PR #39). |
| §3.5 UC-04 | The agent needs outbound internet access to Gemini; the `mcp-server` container needs a network with egress (section 7). |

---

## 3. Wire behaviour of the MCP process

One HTTP server, default port `3001` (`MCP_SERVER_PORT`, then `PORT`). It is internal only: Compose publishes no host port.

| Endpoint | Behaviour |
| :--- | :--- |
| `GET /health` | `{ status, service, version, transports, tools, runtime, agent, timestamp, uptime }`. `runtime.cache` is the configured backend (`redis`, `in-memory`, `custom`; PR #40 for the Redis case); `agent.provider` is `gemini` or `not-configured` (the key itself is never shown). |
| `POST /mcp` | JSON-RPC 2.0 `tools/list` and `tools/call`. Identity from `X-Authenticated-Student-Id` / `X-Authenticated-User-Role`. Result block: `{"type":"json","data":…,"isSimulated":…,"isStale":…,"source":…,"timestamp":…,"durationMs":…}`. This is the path the gateway uses. |
| `GET /sse`, `GET /mcp`, `POST /mcp/messages` | Legacy MCP SSE transport, sessions keyed by the SDK session id (fixed in PR #36). |
| `POST /internal/agent/stream` | UC-04 agent stream, described below. |

### `POST /internal/agent/stream`

- **Request:** `Content-Type: application/json`, body `{"message": "<1..1000 characters>"}`. No other key is accepted (a `studentId` in the body is rejected). Maximum body 8 KiB. Identity only from the `X-Authenticated-*` headers; the MCP process does not authenticate (the gateway does), so a request without identity runs as `GUEST` and the course-schedule tool answers with an error.
- **Before the stream** (JSON in the contract §3.4 shape `{ok:false,error:{code,message},timestamp}`):

| Status | `error.code` | When |
| :--- | :--- | :--- |
| 400 | `INVALID_PARAMS` | Invalid JSON, not an object, extra key, empty or too long `message` |
| 405 | `METHOD_NOT_ALLOWED` | Anything but POST (`Allow: POST`) |
| 503 | `AGENT_UNAVAILABLE` | No usable `GEMINI_API_KEY`. The endpoint **never** falls back to the fake provider. The gateway maps this to its own `503 UPSTREAM_UNAVAILABLE`. |

- **Stream:** `200`, `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-cache`.

```text
event: tool
data: {"toolName":"get_course_schedule","status":"LIVE","durationMs":2}

event: token
data: {"text":"Dersler: ders yok "}

event: done
data: {"answer":"…","toolsInvoked":["get_course_schedule"],"isComplete":true}
```

  `tool` is sent once per **actual** tool execution; `token` carries chunks of the finished answer (about three words each); `done` is sent exactly once; on failure a single `error` event `{"code":"AGENT_ERROR","message":"…"}` replaces `done`. If the client or gateway closes the connection, the provider call is cancelled through an `AbortSignal`.

---

## 4. Agent design (UC-04)

- **Identity.** The student id comes from the gateway header. The agent strips identity-like arguments (`studentId`, `userId`, `email`, `name`) from every model-requested call and the tool declarations do not offer them, so the model cannot choose another student. The history sent back to the provider carries the same cleaned arguments, so an identity key added by the model neither leaks nor aborts the run (PR #39).
- **Once per tool.** A tool already used in a run is refused with a short message to the model and produces no `tool` event and no log line (AC-04.4).
- **PII.** The user's question and every tool result are scrubbed; the serialized request is checked again and the run fails closed if an identifier remains. Tool output keeps `isSimulated` and `isStale`, and the system instruction tells the model to say so in the answer.
- **Logs (AC-04.5, AC-04.7).** The agent calls the `ToolDispatcher` inside the MCP process, so no JSON-RPC `tools/call` exists to inspect. Two kinds of lines are written, to the console (`[agent-outbound]`, `[agent-tool]`) and additionally to `AGENT_OUTBOUND_LOG_FILE` when it is set:
  - one **provider request** line per round, after scrubbing, with `provider` and `isFake` (no `event` field);
  - one **`tool_call`** line per executed tool: `event`, `timestamp`, `round`, `toolName`, the arguments really dispatched (identity keys removed, values scrubbed), `status`, `durationMs`.
  The API key and the JWT are never part of a request body. For Gemini 3 the provider request lines contain the opaque `thoughtSignature` token (no personal data).
- **Errors.** Provider or tool problems end the run with one safe `error` event; details go only to the server log.
- **Provider (`GeminiProvider`).** `fetch` against `generateContent`; key only in the `x-goog-api-key` header. Gemini 3 models attach a `thoughtSignature` to function calls and reject the next round with HTTP 400 if it is not sent back, so it is kept on `LlmFunctionCall` and echoed unchanged. Transient 429/500/502/503/504 are retried twice (500 ms, 1000 ms) inside the single request timeout (15 s default); 4xx is not retried.

---

## 5. Environment variables for the Deployment Plan

| Variable | Default | Compose (`mcp-server`) | Notes |
| :--- | :--- | :--- | :--- |
| `MCP_SERVER_PORT` | `3001` | `3001`, `expose` only | Internal port |
| `GEMINI_API_KEY` | none | passed from `.env` as `${GEMINI_API_KEY:-}` | Never committed. Empty or the placeholder gives `503 AGENT_UNAVAILABLE` and `/health` shows `not-configured` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | **not passed by `compose.yaml`** | Optional. Switching the model on demo day needs this variable in Compose, or a rebuilt default (requested from Sefa) |
| `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS` | Google v1beta, `15000` | not passed | Optional |
| `AGENT_OUTBOUND_LOG_FILE` | none (console only) | **not passed** | Not needed for evidence: `docker compose logs mcp-server` carries the `[agent-outbound]` and `[agent-tool]` lines |
| `REDIS_URL` | none | `redis://redis:6379` | Used since PR #31. `NODE_ENV=production` without it stops the server at startup (Compose sets both) |
| `NODE_ENV` | none | `production` | |
| `CAFETERIA_/SHUTTLE_/LIBRARY_/SCHEDULE_CONNECTOR_MODE`, `UPSTREAM_TIMEOUT_MS`, `CACHE_TTL_*`, `CONNECTOR_MOCK_SEED` | see `.env.example` | passed | Owned by Arda |
| `CONNECTOR_FIXED_NOW` | unset | passed as `${CONNECTOR_FIXED_NOW:-}` | ISO-8601 with an offset, e.g. `2026-11-23T09:00:00+03:00`; set it for acceptance runs so the cafeteria is open |

**Network requirement.** `mcp-server` needs outbound internet access to reach the Gemini API. On `dev` it is only on the `internal` network (`internal: true`), which has no route out. See section 7.

`compose.yaml` is Sefa's file. Requested from Sefa: the extra network for `mcp-server` (required for the demo) and `GEMINI_MODEL` (optional).

---

## 6. Verification performed

| Check | Result |
| :--- | :--- |
| `npm install`, `npm run build`, `npx vitest run` on `dev` at `13b8fb8` (22 Nov 2026, Windows, Node `v24.18.0`) | exit 0; 33 files, **365 tests passed**, 8 skipped (the real-Redis group; it needs a Redis server) |
| `tests/mcp-server/` | 95 tests in 7 files at the time of PR #39 (dispatcher, HTTP connectors, agent orchestrator, agent stream, SSE transport, Gemini provider with a stubbed `fetch`, PII scrubber) |
| `node apps/mcp-server/tests/verify-mcp-server.mjs` | 7 of 7 cases passed (21 Nov 2026) |
| MCP Inspector, stdio | `tools/list` passes; invalid parameters give `-32602`; unauthenticated course schedule gives `-32600`; unknown tool is reported. `tools/call` of the three public tools fails, see section 7 |
| MCP Inspector, SSE | `tools/list` passes after PR #36 (it answered 404 before) |
| Four-service Compose, 22 Nov 2026 (`CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00`) | `redis`, `mcp-server`, `api-gateway`, `web` healthy; host ports 3001 and 6379 not reachable; `mcp-server` log `connector.cache` "ready" for Redis; Redis keys `cache:dining:…`, `cache:schedule:…:MONDAY`, `cache:shuttle:MAIN_RING`; second shuttle request `CACHE_HIT` |
| Chat through the gateway, real Gemini (`gemini-3.5-flash-lite`), same run | guest request 401; with JWT: 3 `tool`, 25 `token`, 1 `done` in about 2 s; 3 `[agent-tool]` lines; 0 occurrences of the student id, the raw JWT and the API key in the `mcp-server` log. Needed the extra network of section 7 |
| Isolation with that extra network | `web` → `mcp-server:3001` and `web` → `redis:6379` blocked (timeout) |

Evidence: `docs/assignment3/evidence/AT-04/gateway-agent-gemini-compose-smoke.txt` (PR #41, open).

**Gemini model facts (21 Nov 2026, one free-tier key; may differ for other accounts).** `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` answered `404` ("no longer available to new users") although the models list still showed them. `gemini-3.8-flash`, `3.7-flash`, `3.1-flash-lite` and `flash-latest` answered `503` ("high demand"); `3.6-flash` and `3.5-flash` timed out. `gemini-3.5-flash-lite` answered tool calls in about 0.7 s. Re-check the model before the demo.

**Not run:** AT-01..AT-04 by the QA owner; any run through the browser UI; the Redis-backed tests of Arda's group on this machine (8 skipped).

---

## 7. Known gaps and open decisions

| Gap / decision | Detail | Decision / next step |
| :--- | :--- | :--- |
| **`mcp-server` cannot reach Gemini in Compose** (blocking for the demo) | On `dev`, `mcp-server` is only on the `internal` network (`internal: true`). The first chat request of the 22 Nov run ended with an `error` event (`Gemini request failed: TypeError`, DNS error `EAI_AGAIN`). A second network used only by `mcp-server` fixes it (`networks: { egress: { driver: bridge } }` and `mcp-server.networks: [internal, egress]`); with it `web` still cannot reach `mcp-server` or `redis`. | **BLOCKED on Sefa** (`compose.yaml`); requested on 22 Nov. |
| **Open gap: `tools/call` through standard MCP clients** | The result block uses `"type":"json"`, which is not a standard MCP content type (`text`, `image`, `audio`, `resource`). The MCP Inspector rejects the result (`Invalid tools/call result`). The gateway uses `POST /mcp` and API Contract §4 documents `json`, so the demo is not affected, but FR-01 "MCP protocol compliance" is only met for `tools/list`. | Left open (Murat, 21 Nov). A backward-compatible fix would add a `text` block next to the `json` block; it touches the contract, the gateway adapter and Arda's fixtures, so it is planned after the demo. |
| AC-04.11 / AT-04 not satisfied formally | The real-Gemini run went through the gateway but with curl, not the browser UI, and not by the QA owner. Fake-provider results are never reported as AT-04 or AC-04.11. | The QA owner runs AT-04 in the browser after the Compose fix; the `tool_call` lines are the AC-04.5 evidence. |
| Tokens are not provider streaming | The answer is produced first, then split into chunks. Latency to the first token equals the full generation time. | Accepted for PA3. |
| Single `Server` object for SSE | Several simultaneous MCP SSE clients are not supported. The gateway does not use SSE. | Not planned. |
| MCP process does not return 401 | The gateway authenticates. Without identity headers the agent runs as `GUEST`. | By design (API Contract §4); the MCP port must stay unreachable from outside. |
| Gemini availability | Free-tier models can answer `503` or disappear. Retry covers short spikes only. | Keep a second model name ready; see section 5 for `GEMINI_MODEL`. |
| Answer quality | The text comes from the model on synthetic data (for example it can misread class times). It is not an acceptance criterion. | Choose and try the demo question beforehand. |
| SSE reconnect | No automatic reconnect; the user presses "Tekrar dene" (API Contract §3.3). | Decided 20 Nov 2026. |
| Gemini key | Murat's own free-tier key, only in `.env`. | Decided (API Contract §8 Q2). |

---

## 8. Dependencies on other members

| Item | Owner | Needed for | Status |
| :--- | :--- | :--- | :--- |
| Extra network for `mcp-server` in `compose.yaml`; optionally `GEMINI_MODEL` | Sefa | Chat with Gemini in Compose; model switch on demo day | Requested 22 Nov |
| Merge of PR #40 (`/health`) and PR #41 (evidence) | Reviewer (Sefa) | Accurate `/health`; evidence file in the repository | Open |
| Clean re-run of the Compose chat after the network fix | Murat | Evidence without a local override | After Sefa's change |
| AT-04 in the browser; AT document v1.0 (AC-04.5 uses the `tool_call` lines) | Sefa, Yunus | Formal AT-04 result | Open |
| Deployment Plan and Test Results Report updated to the four-service state | Sefa | Deliverables | Open |
| Connector rows verification in the traceability matrix | Arda | `handovers/arda.md` is on `dev`; rows still marked "owner verification pending" | Open |
| Chat screen shows the gateway's `503 UPSTREAM_UNAVAILABLE` JSON as an error with retry | Yunus | AC-04.12 | Not checked by Murat |
