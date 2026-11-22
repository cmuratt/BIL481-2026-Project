# AT-02 — UC-02 View Shuttle Schedule Execution Record

```text
AT_ID:            AT-02
USE_CASE:         UC-02
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T15:39:39.382Z
GIT_SHA:          13f71d738a895c62d8e28293e0bf47d60b01e1d5
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     not used
TEST_CLOCK:       2026-11-23T09:00:00+03:00 (Steps 1-7); 2026-11-23T22:30:00+03:00 (Step 8, MCP started 2026-11-22T15:39:28.266Z)
CACHE_RESET:      2026-11-22T15:39:17.087Z
STEPS_EXECUTED:   1, 2, 3, 4, 5, 6, 7, 8 (all mandatory)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.6 §3.2 (AC-02.1..AC-02.7) & §4.2
ACTUAL:           Step 1 direct route "Doğrudan kart: Ring seferleri" (0 chat requests); Steps 2-4 MAIN_RING future/ascending=["09:15","09:30","09:45"] > 09:00, isSimulated=true; Step 5 Yenile CACHE_HIT (1 upstreamCalled:true); Step 6 METRO_LINE=["09:20","09:40","10:00"] & DORMITORY_LINE=["09:15","09:45","10:15"] future/ascending; Step 7 NOWHERE -> HTTP 400 INVALID_PARAMS; Step 8 22:30 Yurtlar -> nextDepartures=[], "Bugün bu hatta başka sefer yok." rendered.
STATUS:           PASS
FAILED_CRITERIA:  None
EVIDENCE:         docs/assignment3/evidence/AT-02/{README.md,network-and-logs.txt,step1-router.png,step3-main-ring.png,step6-routes.png,step8-end-of-service.png}
ISSUE:            None
```
