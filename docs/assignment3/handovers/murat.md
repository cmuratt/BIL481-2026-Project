# Handover — MCP Server, Shared Contract & UC-04 Agent (Murat Can Işık)

| Field | Detail |
| :--- | :--- |
| **Author** | Murat Can Işık (241101013) — `@cmuratt` |
| **Component** | `apps/mcp-server/**`, `packages/shared/**`, `docs/Design_Document.md` (M-11), `docs/assignment3/traceability.md` (M-12), `docs/assignment3/contracts/API_CONTRACT.md` (steward) |
| **For** | Ahmet Sefa Efendioğlu (Deployment Plan, Test Results), Yunus Emre Biçer (chat UI, AT-04 steps), Arda Çelik (connector runtime used by the MCP server) |
| **Version / Date** | 1.3, 28 November 2026 (1.0 – 1.2 were written on 21 and 22 November 2026; 1.3 only replaces the live demo on 26 Nov with the demo video due 5 Dec in section 8) |
| **State described** | `dev` at `1dd775a`. All pull requests of Murat (#26, #28, #29, #34 – #43, #45) and the compose pull request of Sefa (#44) are merged; no pull request is open |
| **Team guide tasks** | M-01 .. M-13 |

> **How to use this note.** Section 1 is the status of every task. Section 3 is what the MCP process does on the wire, which Sefa and Yunus need for the Deployment Plan. Section 5 lists every environment variable. Section 7 lists what is **not** done. Acceptance results are not repeated here; they are in [`Test_Results_Report.md`](../Test_Results_Report.md) v1.1 (AT-01..AT-04 passed on 22 Nov 2026).

---

## Contents

1. [Task status at a glance](#1-task-status-at-a-glance)
2. [Design Document status](#2-design-document-status)
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
| M-13 | MCP Docker image and Compose service | Merged (PR #28); the Compose change for the Gemini API (PR #44, Sefa) is merged | `apps/mcp-server/Dockerfile`, `compose.yaml` |
| M-04 .. M-07 | Agent core: `AgentOrchestrator`, `LlmProvider`, `FakeProvider`, `GeminiProvider`, PII scrubber, redacted outbound log | Merged (PR #29) | `apps/mcp-server/src/agent/` |
| M-08 | `POST /internal/agent/stream` (SSE, contract §3.3 / §8 Q4) | Merged (PR #34) | `apps/mcp-server/src/agent/agentStreamHandler.ts`, `src/index.ts` |
| M-05 follow-up | Gemini 3 `thoughtSignature` kept across rounds, retry on 429/5xx, default model `gemini-3.5-flash-lite` | Merged (PR #35) | `apps/mcp-server/src/agent/GeminiProvider.ts`, `LlmProvider.ts` |
| M-09 | MCP Inspector check; found and fixed an SSE session bug | Merged (PR #36); one **open gap** in section 7 | `apps/mcp-server/src/index.ts` |
| M-07 follow-up | One `tool_call` log line per executed tool (AC-04.5 evidence); cleaned tool arguments in the history sent back to the provider | Merged (PR #39); AT v1.0 uses these lines | `apps/mcp-server/src/agent/AgentOrchestrator.ts`, `outboundLog.ts` |
| M-02 follow-up | `/health` shows the real cache backend; stale "Redis not wired" log removed; README updated | Merged (PR #40, #42) | `apps/mcp-server/src/index.ts`, `apps/mcp-server/README.md` |
| M-10 | Tests for the MCP server and agent | Merged with each branch; 95 tests in 7 files under `tests/mcp-server/` at the time of PR #39 | `tests/mcp-server/` |
| M-11 | Design Document: web, MCP server, agent, gateway and connector parts | Merged (PR #38, #43); status update in version 1.4 | `docs/Design_Document.md` |
| M-12 | Traceability matrix | Merged; final update in version 0.4 | `docs/assignment3/traceability.md` |
| Evidence | Curl run of the chain in the four-service Compose stack with real Gemini (clean run, after PR #44) | Merged (PR #41, #45) | `docs/assignment3/evidence/AT-04/gateway-agent-gemini-compose-smoke.txt` |

**What works end to end.** AT-01..AT-04 passed on 22 Nov 2026 (QA owner, live Chrome, four-service Compose stack, mock data). AT-04 Run 2 used the real Gemini provider (`gemini-3.5-flash-lite`): three `tool` events, three `tool_call` log lines without identity arguments, no personal data in the provider requests. AT-04 Run 1 had failed AC-04.6 because of the test data (a Monday 09:00 clock and a student without a 10:30 class); the test data was fixed (AT v0.7, PR #49) and the chat renders light Markdown (PR #48).

---

## 2. Design Document status

The MCP server, agent, gateway and connector sections are up to date in Design Document version 1.4 (PR #38, #43 and the final status update). Nothing is pending from this handover.

---

## 3. Wire behaviour of the MCP process

One HTTP server, default port `3001` (`MCP_SERVER_PORT`, then `PORT`). It is internal only: Compose publishes no host port.

| Endpoint | Behaviour |
| :--- | :--- |
| `GET /health` | `{ status, service, version, transports, tools, runtime, agent, timestamp, uptime }`. `runtime.cache` is the configured backend (`redis`, `in-memory`, `custom`); `agent.provider` is `gemini` or `not-configured` (the key itself is never shown). |
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
- **Logs (AC-04.5, AC-04.7).** The agent calls the `ToolDispatcher` inside the MCP process, so no JSON-RPC `tools/call` exists to inspect. Two kinds of lines are written to the console (`[agent-outbound]`, `[agent-tool]`; read them with `docker compose logs mcp-server`) and additionally to `AGENT_OUTBOUND_LOG_FILE` when it is set:
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
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | passed as `${GEMINI_MODEL:-gemini-3.5-flash-lite}` (PR #44) | Switch the model by setting it in `.env` and restarting `mcp-server`; no rebuild needed |
| `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS` | Google v1beta, `15000` | not passed | Optional |
| `AGENT_OUTBOUND_LOG_FILE` | none (console only) | not passed | Not needed: `docker compose logs mcp-server` carries the `[agent-outbound]` and `[agent-tool]` lines |
| `REDIS_URL` | none | `redis://redis:6379` | Used since PR #31. `NODE_ENV=production` without it stops the server at startup (Compose sets both) |
| `NODE_ENV` | none | `production` | |
| `CAFETERIA_/SHUTTLE_/LIBRARY_/SCHEDULE_CONNECTOR_MODE`, `UPSTREAM_TIMEOUT_MS`, `CACHE_TTL_*`, `CONNECTOR_MOCK_SEED` | see `.env.example` | passed | Owned by Arda |
| `CONNECTOR_FIXED_NOW` | unset | passed as `${CONNECTOR_FIXED_NOW:-}` | ISO-8601 with an offset; AT v1.0 uses `2026-11-24T12:10:00+03:00` (Tuesday) for AT-04 |

**Network requirement.** `mcp-server` needs outbound internet access to reach the Gemini API. `compose.yaml` gives it a second network, `egress`, used by no other service (PR #44); `web` cannot reach `mcp-server` or `redis`.

---

## 6. Verification performed

| Check | Result |
| :--- | :--- |
| `npm install`, `npm run build`, `npx vitest run` on `dev` at `1dd775a` (22 Nov 2026, Windows, Node `v24.18.0`) | exit 0; 34 files, **373 tests passed**, 8 skipped (the real-Redis group; it needs a Redis server) |
| `tests/mcp-server/` | 95 tests in 7 files at the time of PR #39 (dispatcher, HTTP connectors, agent orchestrator, agent stream, SSE transport, Gemini provider with a stubbed `fetch`, PII scrubber) |
| MCP Inspector, stdio and SSE | `tools/list` passes on both; invalid parameters give `-32602`; unauthenticated course schedule gives `-32600`; `tools/call` of the public tools is rejected by the Inspector, see section 7 |
| Curl run, four-service Compose, real Gemini, clean `compose.yaml` (Murat, 22 Nov) | 3 `tool`, 24 / 22 `token`, 1 `done` (cold / warm cache); 6 `tool_call` lines; 0 occurrences of the student id, the raw JWT and the API key in the `mcp-server` log; evidence in `docs/assignment3/evidence/AT-04/gateway-agent-gemini-compose-smoke.txt` |
| Acceptance tests (Sefa, 22 Nov 2026) | AT-01, AT-02, AT-03 and AT-04 (Run 2) passed in live Chrome on the four-service stack, mock data; NFR-01 and NFR-02 measured (burst of 500 requests): cached p95 44.41 ms, hit ratio 99.4 %. See the Test Results Report v1.1 |

**Gemini model facts (21 Nov 2026, one free-tier key; may differ for other accounts).** `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` answered `404` ("no longer available to new users") although the models list still showed them. `gemini-3.8-flash`, `3.7-flash`, `3.1-flash-lite` and `flash-latest` answered `503` ("high demand"); `3.6-flash` and `3.5-flash` timed out. `gemini-3.5-flash-lite` answered tool calls in about 0.7 s. Re-check the model before the demo.

**Not run:** the Redis-backed tests of Arda's group on the development machine (8 skipped); a soak test; NFR-04 (100 users on 2 instances) and NFR-06 (SUS).

---

## 7. Known gaps and open decisions

| Gap / decision | Detail | Decision / next step |
| :--- | :--- | :--- |
| **Answer latency (demo risk)** | The answer is generated first and then split into chunks, so the first text appears only when the whole answer is ready. In the AT-04 Run 2 browser run this took 13.5 s (curl runs took 2–3 s); the UI gives up after 20 s without data. Gemini's speed varies. | Accepted for PA3. Rehearse the demo question shortly before the demo; if Gemini is slow, set another `GEMINI_MODEL` in `.env` and restart `mcp-server`. |
| **Open gap: `tools/call` through standard MCP clients** | The result block uses `"type":"json"`, which is not a standard MCP content type (`text`, `image`, `audio`, `resource`). The MCP Inspector rejects the result (`Invalid tools/call result`). The gateway uses `POST /mcp` and API Contract §4 documents `json`, so the acceptance tests are not affected, but FR-01 "MCP protocol compliance" is only met for `tools/list`. | Left open (Murat, 21 Nov). A backward-compatible fix would add a `text` block next to the `json` block; it touches the contract, the gateway adapter and Arda's fixtures, so it is planned after the demo. |
| Single `Server` object for SSE | Several simultaneous MCP SSE clients are not supported. The gateway does not use SSE. | Not planned. |
| MCP process does not return 401 | The gateway authenticates. Without identity headers the agent runs as `GUEST`. | By design (API Contract §4); the MCP port must stay unreachable from outside. |
| Gemini availability | Free-tier models can answer `503` or disappear. Retry covers short spikes only. | Keep a second model name ready (`GEMINI_MODEL`). |
| Answer quality | The text comes from the model on synthetic data and depends on the test data and clock (AT-04 Run 1 failed AC-04.6 for that reason). It is judged only by the acceptance criteria. | Use the AT v1.0 test data (Tuesday 12:10) for the demo. |
| SSE reconnect | No automatic reconnect; the user presses "Tekrar dene" (API Contract §3.3). | Decided 20 Nov 2026. |
| Gemini key | Murat's own free-tier key, only in `.env`. | Decided (API Contract §8 Q2). |

---

## 8. Dependencies on other members

| Item | Owner | Needed for | Status |
| :--- | :--- | :--- | :--- |
| Compose network for the Gemini API and `GEMINI_MODEL` | Sefa | Chat with Gemini in Compose; model switch | Done (PR #44) |
| AT-01..AT-04 in the browser; AT document v1.0 | Sefa, Yunus | Acceptance result | Done (22 Nov 2026) |
| Deployment Plan and Test Results Report | Sefa | Deliverables | Done (v1.3, v1.1) |
| Connector rows verification in the traceability matrix | Arda | `handovers/arda.md` is on `dev`; rows still marked "owner verification pending" | Open |
| Demo video: record the four scenarios with the AT v1.0 test data (Tuesday 12:10 clock for AT-04) and a ready second model name; there is no oral session | Murat, Sefa, Yunus | Demo video, due 5 Dec 2026 (after the PA3 submission on 29 Nov) | Open |
