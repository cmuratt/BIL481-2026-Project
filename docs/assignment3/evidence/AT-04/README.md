# AT-04 — UC-04 Combined Course, Shuttle and Menu Question Execution Record

```text
AT_ID:            AT-04
USE_CASE:         UC-04
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T15:41:20.037Z
GIT_SHA:          13f71d738a895c62d8e28293e0bf47d60b01e1d5
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     BLOCKED (no GEMINI_API_KEY configured in local .env on QA workstation)
TEST_CLOCK:       CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 (MCP started 2026-11-22T15:41:15.825Z)
CACHE_RESET:      2026-11-22T15:41:17.955Z
STEPS_EXECUTED:   Steps 1, 2, 3 (routing & prefill), 8, 9 PASSED; Steps 4, 5, 6, 7, 10 NOT RUN (BLOCKED — awaiting local GEMINI_API_KEY)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.6 §3.4 (AC-04.1..AC-04.12) & §4.4
ACTUAL:           Step 1 guest get_course_schedule HTTP 401 & /asistan input disabled; Step 2 demo-student-01 login -> /asistan enabled; Step 3 COMPOUND_QUERY routing + /asistan textarea prefill; Step 8 forged X-Authenticated-Student-Id stripped & mcp-server host port 3001 unreachable (ECONNREFUSED); Step 9 expired & tampered JWT -> HTTP 401 with 0 MCP calls. Supporting (non-AT) real Gemini curl trace on dev (PR #45): docs/assignment3/evidence/AT-04/gateway-agent-gemini-compose-smoke.txt.
STATUS:           BLOCKED
FAILED_CRITERIA:  None failed; AC-04.4..04.7, AC-04.10, AC-04.11 pending browser run with GEMINI_API_KEY (AC-04.12 conditional)
EVIDENCE:         docs/assignment3/evidence/AT-04/{README.md,sefa-security-checks.txt,step1-guest-guard.png,step2-logged-in-assistant.png,step3-router-prefill.png}; supporting PR #45 curl log: gateway-agent-gemini-compose-smoke.txt
ISSUE:            Local .env lacks GEMINI_API_KEY on QA workstation (Contract §8 Q2 — Murat's key)
```
