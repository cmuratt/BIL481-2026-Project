# Handover — MCP Server, Shared Contract & UC-04 Agent (Murat Can Işık)

| Field | Detail |
| :--- | :--- |
| **Author** | Murat Can Işık (241101013) — `@cmuratt` |
| **Component** | `apps/mcp-server/**`, `packages/shared/**`, `docs/Design_Document.md` (M-11), `docs/assignment3/traceability.md` (M-12), `docs/assignment3/contracts/API_CONTRACT.md` (steward) |
| **For** | Ahmet Sefa Efendioğlu (Deployment Plan, Test Results, Compose), Yunus Emre Biçer (chat UI, AT-04 steps), Arda Çelik (connector runtime used by the MCP server) |
| **Version / Date** | 1.0, 21 November 2026 |
| **State described** | `dev` at `db57ed9` (PR #29 merged). Items that are only in open pull requests are marked **(PR #n, open)** |
| **Team guide tasks** | M-01 .. M-13 |

> **How to use this note.** Section 1 is the status of every task. Section 3 is what the MCP process does on the wire, which Sefa and Yunus need for the Deployment Plan and AT-04. Section 5 lists every environment variable. Section 7 lists what is **not** done. Everything here reflects code that exists; planned items are labelled as planned. Nothing here is an acceptance-test result: AT-01..AT-04 have **not** been run.

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
| M-13 | MCP Docker image and Compose service | Merged. Built and run locally on 20 Nov (image about 63 MB, four services healthy, no host port for `mcp-server`). **No evidence file is committed** for this run | `apps/mcp-server/Dockerfile`, `compose.yaml` |
| M-04 .. M-07 | Agent core: `AgentOrchestrator`, `LlmProvider`, `FakeProvider`, `GeminiProvider`, PII scrubber, redacted outbound log | Merged (PR #29) | `apps/mcp-server/src/agent/` |
| M-08 | `POST /internal/agent/stream` (SSE, contract §3.3 / §8 Q4) | **PR #34, open** | `apps/mcp-server/src/agent/agentStreamHandler.ts`, `src/index.ts` |
| M-05 follow-up | Gemini 3 `thoughtSignature` kept across rounds, retry on 429/5xx, default model `gemini-3.5-flash-lite` | **PR #35, open** | `apps/mcp-server/src/agent/GeminiProvider.ts`, `LlmProvider.ts` |
| M-09 | MCP Inspector check | Done. Found and fixed an SSE session bug (**PR open**, branch `fix/pa3-mcp-sse-session`); one **open gap** in section 7 | `apps/mcp-server/src/index.ts` |
| M-10 | Tests for the MCP server and agent | Written with each branch; 71 tests in 5 files on `dev` under `tests/mcp-server/` | `tests/mcp-server/` |
| M-11 | Design Document: web part | Merged. Agent part still to do (section 2) | `docs/Design_Document.md` |
| M-12 | Traceability matrix | Merged; Murat rows updated in this change (v0.2) | `docs/assignment3/traceability.md` |

**What works end to end today.** With Redis, `api-gateway` and `web` running and an injected `FakeProvider`, the agent stream produces the three tool events, token events and one `done` event. With the real Gemini provider, the agent loop was run directly (no HTTP, no gateway, no UI) and produced a Turkish answer from three tool results. **The chain web chat → gateway → `/internal/agent/stream` → Gemini has not been run** and will only be possible after PR #34 and #35 are merged.

---

## 2. Design Document updates for the agent (M-11)

The web part of the Design Document was updated from `handovers/yunus.md`. The agent part is still the Assignment 2 text. This is what it should say, section by section.

| Design Document section | What it says now | What it should say |
| :--- | :--- | :--- |
| §2.2.1 Agent orchestrator | Skeleton with `NOT_IMPLEMENTED` | LLM-driven loop: provider asks for tools, each tool runs through the `ToolDispatcher` with the gateway-verified identity (never as an argument), results go back to the provider, provider writes the answer. Up to 4 provider rounds; the last offers no tools. Each tool at most once per run. |
| §2.2.1 PII scrubber | Planned | Implemented: every provider request is scrubbed, checked again fail-closed (`assertNoPii`), and written to a redacted outbound log. Tool declarations have no `studentId`. |
| §2.2.1 LLM provider | Not described | `LlmProvider` interface; `GeminiProvider` calls the Gemini REST API with `fetch` (no SDK). `FakeProvider` exists for tests only and is marked `isFake` in the log. |
| §2.3.x agent interfaces | `executePlan` only | `AgentOrchestrator.run(query, auth, { pii, signal })` is an `AsyncGenerator<AgentEvent>` with `tool`, `token`, `done`, `error`; `executePlan` wraps it. |
| §3.5 UC-04 sequence | Generic | Web → Next.js rewrite → gateway chat proxy (JWT, body checks) → `POST /internal/agent/stream` → agent → MCP tools → Gemini → SSE frames back unchanged. Explicit retry only; no automatic reconnect (already recorded from Yunus). |
| §3.6 error rules | Generic | Before the stream: JSON 400 / 503. After the headers: an `error` event. No tokens, PII or stack traces in either. |

---

## 3. Wire behaviour of the MCP process

One HTTP server, default port `3001` (`MCP_SERVER_PORT`, then `PORT`). It is internal only: Compose publishes no host port.

| Endpoint | Behaviour |
| :--- | :--- |
| `GET /health` | `{ status, service, version, transports, tools, runtime, agent, timestamp, uptime }`. `agent.provider` is `gemini` or `not-configured` (the key itself is never shown). |
| `POST /mcp` | JSON-RPC 2.0 `tools/list` and `tools/call`. Identity from `X-Authenticated-Student-Id` / `X-Authenticated-User-Role`. Result block: `{"type":"json","data":…,"isSimulated":…,"isStale":…,"source":…,"timestamp":…,"durationMs":…}`. This is the path the gateway uses. |
| `GET /sse`, `GET /mcp`, `POST /mcp/messages` | Legacy MCP SSE transport. **Fixed in PR (open)**; before the fix every message POST answered 404. |
| `POST /internal/agent/stream` | UC-04 agent stream, described below. **PR #34, open.** |

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

- **Identity.** The student id comes from the gateway header. The agent strips identity-like arguments (`studentId`, `userId`, `email`, `name`) from every model-requested call and the tool declarations do not offer them, so the model cannot choose another student.
- **Once per tool.** A tool already used in a run is refused with a short message to the model and produces no `tool` event (AC-04.4).
- **PII.** The user's question and every tool result are scrubbed; the serialized request is checked again and the run fails closed if an identifier remains. Tool output keeps `isSimulated` and `isStale`, and the system instruction tells the model to say so in the answer.
- **Outbound log (AC-04.7).** Every provider request is recorded after scrubbing, with `provider` and `isFake`. Console always; additionally a file when `AGENT_OUTBOUND_LOG_FILE` is set. The API key and the JWT are never part of a request body. For Gemini 3 the log contains the opaque `thoughtSignature` token (no personal data).
- **Errors.** Provider or tool problems end the run with one safe `error` event; details go only to the server log.
- **Provider (`GeminiProvider`).** `fetch` against `generateContent`; key only in the `x-goog-api-key` header. Gemini 3 models attach a `thoughtSignature` to function calls and reject the next round with HTTP 400 if it is not sent back, so it is kept on `LlmFunctionCall` and echoed unchanged (**PR #35, open**). Transient 429/500/502/503/504 are retried twice (500 ms, 1000 ms) inside the single request timeout (15 s default); 4xx is not retried.

---

## 5. Environment variables for the Deployment Plan

| Variable | Default | Compose (`mcp-server`) | Notes |
| :--- | :--- | :--- | :--- |
| `MCP_SERVER_PORT` | `3001` | `3001`, `expose` only | Internal port |
| `GEMINI_API_KEY` | none | passed from `.env` as `${GEMINI_API_KEY:-}` | Never committed. Empty or the placeholder gives `503 AGENT_UNAVAILABLE` and `/health` shows `not-configured` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` (after PR #35) | **not passed by `compose.yaml` today** | Optional. Changing the model at demo time needs this variable in Compose, or a rebuilt default |
| `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS` | Google v1beta, `15000` | not passed | Optional |
| `AGENT_OUTBOUND_LOG_FILE` | none (console only) | **not passed** | Needed to capture the AC-04.7 evidence file from a container |
| `REDIS_URL` | none | `redis://redis:6379` | Today the MCP process still uses its in-memory cache and logs that it ignores the URL. Arda's PR #31 (open) wires Redis; with it, `NODE_ENV=production` **requires** `REDIS_URL` |
| `NODE_ENV` | none | `production` | |
| `CAFETERIA_/SHUTTLE_/LIBRARY_/SCHEDULE_CONNECTOR_MODE`, `UPSTREAM_TIMEOUT_MS`, `CACHE_TTL_*`, `CONNECTOR_MOCK_SEED` | see `.env.example` | passed | Owned by Arda |
| `CONNECTOR_FIXED_NOW` | unset | passed | Arda's PR #31 (open); needed for reproducible acceptance runs |

`compose.yaml` is Sefa's file. Two additions are requested from Sefa and are optional for the demo: `GEMINI_MODEL` and `AGENT_OUTBOUND_LOG_FILE`.

---

## 6. Verification performed

All on 21 Nov 2026, Windows, Node `v24.18.0`.

| Check | Result |
| :--- | :--- |
| `npm install`, `npm run build` on `dev` at `db57ed9` | exit 0 |
| `npx vitest run` on `dev` at `db57ed9` | 25 files, **292 tests passed** (71 in `tests/mcp-server/`) |
| `node apps/mcp-server/tests/verify-mcp-server.mjs` | 7 of 7 cases passed |
| Branch of PR #34 | 26 files, 301 tests passed; `curl -N` without a key: `503` JSON; with an injected `FakeProvider`: three `tool` events, `token` events, one `done` |
| Branch of PR #35 | 25 files, 301 tests passed |
| MCP Inspector, stdio | `tools/list` passes; invalid parameters give `-32602`; unauthenticated course schedule gives `-32600`; unknown tool is reported. `tools/call` of the three public tools fails, see section 7 |
| MCP Inspector, SSE | `404` before the fix; `tools/list` passes with the fix (PR open) |
| Live Gemini, agent called directly (not through HTTP) | `gemini-3.5-flash-lite`: three tools, token events, one answer in about 1.5 s; outbound log has no student id and no API key |

**Gemini model facts (21 Nov 2026, one free-tier key; may differ for other accounts).** `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` answered `404` ("no longer available to new users") although the models list still showed them. `gemini-3.8-flash`, `3.7-flash`, `3.1-flash-lite` and `flash-latest` answered `503` ("high demand"); `3.6-flash` and `3.5-flash` timed out. `gemini-3.5-flash-lite` answered tool calls in about 0.7 s. Re-check the model before the demo.

**Not run:** AT-01..AT-04; the web → gateway → agent → Gemini chain; a four-service Compose run with the agent endpoint and a real key.

---

## 7. Known gaps and open decisions

| Gap / decision | Detail | Decision / next step |
| :--- | :--- | :--- |
| **Open gap: `tools/call` through standard MCP clients** | The result block uses `"type":"json"`, which is not a standard MCP content type (`text`, `image`, `audio`, `resource`). The MCP Inspector rejects the result (`Invalid tools/call result`). The gateway uses `POST /mcp` and API Contract §4 documents `json`, so the demo is not affected, but FR-01 "MCP protocol compliance" is only met for `tools/list`. | Left open (Murat, 21 Nov). A backward-compatible fix would add a `text` block next to the `json` block; it touches the contract, the gateway adapter and Arda's fixtures, so it is planned after the demo. |
| AC-04.11 is not satisfied | The live run did not go through the stream endpoint, gateway or UI. Fake-provider results are never reported as AT-04 or AC-04.11. | After PR #34 and #35 are merged: run the chain with a real key and store the redacted log in `docs/assignment3/evidence/AT-04/`. |
| Tokens are not provider streaming | The answer is produced first, then split into chunks. Latency to the first token equals the full generation time. | Accepted for PA3. |
| Single `Server` object for SSE | Several simultaneous MCP SSE clients are not supported. The gateway does not use SSE. | Not planned. |
| MCP process does not return 401 | The gateway authenticates. Without identity headers the agent runs as `GUEST`. | By design (API Contract §4); the MCP port must stay unreachable from outside. |
| Cache is in-memory in the MCP process | Until PR #31 is merged. | Check `REDIS_URL` handling in Compose after the merge. |
| Gemini availability | Free-tier models can answer `503` or disappear. Retry covers short spikes only. | Keep a second model name ready; see section 5 for `GEMINI_MODEL`. |
| SSE reconnect | No automatic reconnect; the user presses "Tekrar dene" (API Contract §3.3). | Decided 20 Nov 2026. |
| Gemini key | Murat's own free-tier key, only in `.env`. | Decided (API Contract §8 Q2). |

---

## 8. Dependencies on other members

| Item | Owner | Needed for | Status |
| :--- | :--- | :--- | :--- |
| Merge of PR #34 (M-08) and PR #35 (Gemini fix) | Reviewer (Sefa) | AT-04 end to end | Open |
| Merge of the SSE session fix | Reviewer | Inspector over SSE | Open |
| Redis runtime, `CONNECTOR_FIXED_NOW` (PR #31) | Arda | Cache metadata in the demo, reproducible AT-02 | Open; a Windows CRLF issue in `contractFixtures.test.ts` was reported on the PR |
| `GEMINI_MODEL` and `AGENT_OUTBOUND_LOG_FILE` in `compose.yaml` | Sefa | Model switch and AC-04.7 file in containers | Requested, optional |
| Four-service Compose run with the agent endpoint and a real key | Sefa | Deployment Plan, AT-04 | After the merges |
| Chat screen shows the gateway's `503 UPSTREAM_UNAVAILABLE` JSON as an error with retry | Yunus | AC-04.12 | Not checked by Murat |
| AT-04 evidence folder `docs/assignment3/evidence/AT-04/` | Sefa, Murat | Test Results Report | Murat supplies the redacted outbound log after the live run |
