# AT-04 — UC-04 Combined Course, Shuttle and Menu Question Execution Record

```text
AT_ID:            AT-04
USE_CASE:         UC-04
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T16:02:30.584Z
GIT_SHA:          18d2e309ba154d4b61648c0f6252a66c72ea992e
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     real Gemini (provider="gemini", isFake=false, model=gemini-3.5-flash-lite)
TEST_CLOCK:       CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 (MCP started 2026-11-22T16:02:08.654Z)
CACHE_RESET:      2026-11-22T16:02:10.530Z
STEPS_EXECUTED:   Steps 1, 2, 3, 4, 5, 6, 7, 8, 9 PASSED; Step 10 conditional OBSERVED (7664 ms >= 5000 ms; slow notice rendered=true)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.6 §3.4 (AC-04.1..AC-04.12) & §4.4
ACTUAL:           Step 1 guest get_course_schedule HTTP 401 & /asistan disabled; Step 2 demo-student-01 login -> /asistan enabled; Step 3 COMPOUND_QUERY routing -> /asistan prefill; Step 4 clicked Gönder -> POST /api/v1/chat/stream HTTP 200 (3 tool frames, 23 token frames, 1 done frame in 7664ms, 3 UI badges); Step 5 3 [agent-tool] lines with 0 identity args; Step 6 done.answer grounded in schedule/shuttle/menu + synthetic disclosure; Step 7 all [agent-outbound] provider="gemini" isFake=false with 0 raw JWT/key/PII leaks; Step 8 forged X-Authenticated-Student-Id stripped on query & chat and host :3001 ECONNREFUSED; Step 9 expired & tampered JWT -> HTTP 401 with 0 MCP calls.
STATUS:           PASS
FAILED_CRITERIA:  None
EVIDENCE:         docs/assignment3/evidence/AT-04/{README.md,at04-live-browser-trace.txt,sefa-security-checks.txt,step1-guest-guard.png,step2-logged-in-assistant.png,step3-router-prefill.png,step4-streamed-answer.png}
ISSUE:            None
```
