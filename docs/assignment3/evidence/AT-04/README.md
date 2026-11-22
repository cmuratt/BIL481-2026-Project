# AT-04 — UC-04 Combined Course, Shuttle and Menu Question Execution Record (Run 2 — AT v0.7)

```text
AT_ID:            AT-04 (Run 2)
USE_CASE:         UC-04
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T16:39:46.747Z
GIT_SHA:          61af2b038e53738adb089df254c7bc895df6eea3
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     real Gemini (provider="gemini", isFake=false, model=gemini-3.5-flash-lite)
TEST_CLOCK:       CONNECTOR_FIXED_NOW=2026-11-24T12:10:00+03:00 (MCP started 2026-11-22T16:39:17.362Z)
CACHE_RESET:      2026-11-22T16:39:20.200Z
STEPS_EXECUTED:   Steps 1, 2, 3, 4, 5, 6, 7, 8, 9 PASSED; Step 10 conditional OBSERVED (13526 ms >= 5000 ms; slow notice rendered=true)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.7 §3.4 (AC-04.1..AC-04.12) & §4.4
ACTUAL:           Step 1 guest get_course_schedule HTTP 401 & /asistan disabled; Step 2 demo-student-01 login -> /asistan enabled; Step 3 COMPOUND_QUERY routing on / ("Asistana yönlendirilecek") -> /asistan prefill; Step 4 clicked Gönder -> POST /api/v1/chat/stream HTTP 200 (3 tool frames, 21 token frames, 1 done frame in 13526ms, 3 UI badges, light Markdown strongElements=2, renderedMarkdownRawAsterisks=false); Step 5 3 [agent-tool] lines with 0 identity args & 0 PII placeholders; Step 6 done.answer references BIL 452 end 12:20, post-12:20 shuttle (12:30/12:45, without claiming 12:15 is catchable), 2026-11-24 menu + synthetic disclosure; Step 7 all [agent-outbound] provider="gemini" isFake=false with 0 raw JWT/key/PII leaks; Step 8 forged X-Authenticated-Student-Id stripped on query (TUESDAY) & chat and host :3001 ECONNREFUSED; Step 9 expired & tampered JWT -> HTTP 401 with 0 MCP calls.
STATUS:           PASS
FAILED_CRITERIA:  None
EVIDENCE:         docs/assignment3/evidence/AT-04/{README.md,at04-live-browser-trace.txt,sefa-security-checks.txt,step1-guest-guard.png,step2-logged-in-assistant.png,step3-router-decision.png,step3-router-prefill.png,step4-streamed-answer.png}
ISSUE:            PR #48 & PR #49 resolved Run 1 AC-04.6 test-data mismatch and raw Markdown ** rendering
```

## Prior Run (Run 1 — FAIL on AC-04.6, AT v0.6)

- **Run 1 (`2026-11-22T16:02:30.584Z`, SHA `18d2e309ba154d4b61648c0f6252a66c72ea992e`, `Acceptance_Tests_and_Criteria.md` v0.6):** Executed with Monday `CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00` (`demo-student-01` has only Monday `13:30–15:20` BIL 441 and no `10:30` class; shuttles returned `09:15`, `09:30`, `09:45`).
- **Result: `FAIL` (`AC-04.6`).** Although security, SSE streaming, tool execution (`0` identity args), and Gemini PII redaction succeeded, the Monday `09:00` clock could not satisfy `AC-04.6` ("after my 10:30 class, can I catch the shuttle?") and raw `**` Markdown markers appeared in the chat UI. Both issues were resolved by Yunus Emre Biçer in `PR #48` (`fix/pa3-web-chat-markdown`) and `PR #49` (`Acceptance_Tests_and_Criteria.md` v0.7 fixing Tuesday `2026-11-24T12:10:00+03:00`), followed by Run 2 (`PASS`) above.
