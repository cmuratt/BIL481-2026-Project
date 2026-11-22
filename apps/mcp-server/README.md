# MCP Server (`@campus-orchestrator/mcp-server`)

Internal service that exposes the four campus tools over MCP / JSON-RPC and runs the UC-04 agent
(`POST /internal/agent/stream`). Tools are backed by `@campus-orchestrator/connectors` (TTL cache,
stale-if-error, circuit breaker, mock/live modes). Wire format and error codes:
`docs/assignment3/contracts/API_CONTRACT.md` §3.2, §3.3, §4.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Heartbeat; reports tool count, connector runtime (modes, cache backend) and `agent.provider` (`gemini` or `not-configured`) |
| `POST` | `/mcp` | JSON-RPC 2.0 `tools/list` and `tools/call` (used by the API gateway) |
| `POST` | `/internal/agent/stream` | UC-04 agent. Body `{"message": "…"}`; answer is a `text/event-stream` of `tool`, `token`, `done` or `error` frames (contract §3.3). `400` JSON for a bad body, `503` JSON when no `GEMINI_API_KEY` is set (it never falls back to a fake provider) |
| `GET` | `/mcp`, `/sse` | MCP SSE transport (MCP Inspector) |
| `POST` | `/mcp/messages` | SSE message channel |

Known gap: a tool result uses the content type `json`, which standard MCP clients (for example the MCP
Inspector) reject for `tools/call`; `tools/list` works. The gateway uses `POST /mcp` and the contract §4
documents `json`.

## Security

`/mcp` and `/internal/agent/stream` trust the `X-Authenticated-Student-Id` / `X-Authenticated-User-Role`
headers, which only the API gateway may set after JWT verification. **Never publish this port to the host
or the internet.** In Compose it is `expose`d on the internal network only. There are no CORS headers by
design.

The agent sends the question and tool results to Gemini only after PII scrubbing (fail closed) and writes
a redacted record of every provider request and one `tool_call` line per executed tool (see
`AGENT_OUTBOUND_LOG_FILE`). Credentials are never part of a logged request.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `MCP_SERVER_PORT` (or `PORT`) | `3001` | Listen port |
| `REDIS_URL` | unset | Shared cache (FR-09). Set: the connector runtime uses Redis and connects in the background (`connector.cache` log lines report errors). Unset: in-memory cache, with a warning. With `NODE_ENV=production` the server refuses to start without it. `/health` shows the configured backend |
| `CONNECTOR_FIXED_NOW` | unset | Start instant of the connector clock for acceptance runs, ISO-8601 with an offset, e.g. `2026-11-23T09:00:00+03:00`; the clock then advances in real time |
| `CAFETERIA_CONNECTOR_MODE`, `SHUTTLE_CONNECTOR_MODE`, `LIBRARY_CONNECTOR_MODE`, `SCHEDULE_CONNECTOR_MODE` | `mock` | `mock` or `live`; `live` has no confirmed upstream and returns `UPSTREAM_UNAVAILABLE` |
| `UPSTREAM_TIMEOUT_MS` | `800` | Upstream cutoff (NFR-01) |
| `CACHE_TTL_CAFETERIA` / `_SHUTTLE` / `_LIBRARY` / `_COURSE_SCHEDULE` | `3600` / `120` / `60` / `300` | TTL in seconds (FR-09) |
| `CONNECTOR_MOCK_SEED` | `481-FALL-2026` | Seed of the deterministic mock data |
| `GEMINI_API_KEY` | unset | Real LLM provider of the agent. Provide via `.env` only, never commit. Unset or placeholder: the agent endpoint answers `503` |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | Model name. Availability depends on the account (on 21 Nov 2026 `gemini-2.0-flash`, `gemini-2.5-flash` and `gemini-2.5-flash-lite` answered 404 for the team key); check it before a demo |
| `GEMINI_BASE_URL`, `GEMINI_TIMEOUT_MS` | Google v1beta, `15000` | Optional; the timeout covers one provider call including its retries |
| `AGENT_OUTBOUND_LOG_FILE` | unset | Append the redacted provider requests and the `tool_call` lines to this file (console always) |

Mock results are labelled `isSimulated: true`.

## Network

The agent calls the Gemini API over HTTPS, so the container needs outbound internet access. A container
that is only on an `internal: true` Compose network cannot reach it: the agent then ends the stream with
an `error` event and the log shows `Gemini request failed: TypeError`. Give `mcp-server` an additional
plain bridge network used by no other service (it must stay unreachable from `web`).

## Run

```bash
# local
npm run build && npm run start -w @campus-orchestrator/mcp-server
curl http://127.0.0.1:3001/health

# Docker (build from the repository root)
docker build -f apps/mcp-server/Dockerfile -t campus-mcp-server .
docker run --rm -p 127.0.0.1:3001:3001 campus-mcp-server

# Compose (web, api-gateway, mcp-server, redis); for a Monday acceptance run:
CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 docker compose up --build -d
```
