# AT-01 — UC-01 View Cafeteria Menu Execution Record

```text
AT_ID:            AT-01
USE_CASE:         UC-01
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T15:39:15.248Z
GIT_SHA:          13f71d738a895c62d8e28293e0bf47d60b01e1d5
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     not used
TEST_CLOCK:       CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 (MCP started 2026-11-22T15:39:11.109Z)
CACHE_RESET:      2026-11-22T15:39:12.533Z
STEPS_EXECUTED:   1, 2, 3, 4, 5, 6, 7, 8, 9 (all mandatory)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.6 §3.1 (AC-01.1..AC-01.8) & §4.1
ACTUAL:           Step 1 guest card loaded at 1440px; Step 2 direct route "Doğrudan kart: Yemekhane menüsü" (0 chat/LLM requests); Step 3-5 2026-11-23 HTTP 200 LIVE, available=true, lunch=1060kcal/dinner=770kcal, isSimulated=true, Sentetik veri badge & all dishes/allergens matched; Step 6 Yenile HTTP 200 CACHE_HIT (1 upstreamCalled:true for cache:dining:2026-11-23); Step 7 2026-11-22 HTTP 200 available=false closed reason; Step 8 impossible date 2026-99-77 HTTP 400 INVALID_PARAMS with 0 connector calls; Step 9 375px scrollWidth=375 <= innerWidth=375.
STATUS:           PASS
FAILED_CRITERIA:  None
EVIDENCE:         docs/assignment3/evidence/AT-01/{README.md,network-and-logs.txt,step2-router.png,step3-weekday-menu.png,step7-weekend-menu.png,step9-mobile-375px.png}
ISSUE:            None
```
