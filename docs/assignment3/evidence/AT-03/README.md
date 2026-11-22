# AT-03 — UC-03 View Library Occupancy Execution Record

```text
AT_ID:            AT-03
USE_CASE:         UC-03
CONTRACT_VERSION: API Contract v1.1
EXECUTED_AT:      2026-11-22T15:41:15.826Z
GIT_SHA:          13f71d738a895c62d8e28293e0bf47d60b01e1d5
EXECUTOR:         Ahmet Sefa Efendioğlu (@Sefa-Efendioglu)
ENV:              Windows_NT 10.0.26200 (x64), Node v26.4.0 / Docker version 29.9.3, build 5457199 / Docker Compose version v5.7.0 / Chrome/157.0.8103.79
DATA_MODE:        MOCK (Step 7 restarted mcp-server with LIBRARY_CONNECTOR_MODE=live fault mode, then restored mock)
WEB_DATA_SOURCE:  gateway
LLM_PROVIDER:     not used
TEST_CLOCK:       CONNECTOR_FIXED_NOW=2026-11-23T09:00:00+03:00 (Step 7 MCP restarted 2026-11-22T15:39:51.575Z, refreshed at +83.4s)
CACHE_RESET:      2026-11-22T15:39:40.985Z
STEPS_EXECUTED:   1, 2, 3, 4, 5, 6, 7 (all mandatory)
EXPECTED:         Acceptance_Tests_and_Criteria.md v0.6 §3.3 (AC-03.1..AC-03.7) & §4.3
ACTUAL:           Step 1 direct route "Doğrudan kart: Kütüphane doluluğu" (0 chat requests); Steps 2-4 ALL HTTP 200 LIVE (101/300 = %34, 3 floors sum match, isSimulated=true, Sentetik veri); Step 5 FLOOR_3 isolated match (31/80); Step 6 ALL CACHE_HIT (1 upstreamCalled:true); Step 7 LIBRARY_CONNECTOR_MODE=live at +83.4s wall time (note: restarting mcp-server with CONNECTOR_FIXED_NOW re-anchors the connector clock to 09:00:00, so wait elapsed past restarted freshUntil while Redis 3xTTL kept key) -> HTTP 200 source=STALE, isStale=true, isSimulated=true, original timestamp=2026-11-23T06:00:06.922Z, "Bu bilgi güncel olmayabilir" rendered, outcome=STALE logged.
STATUS:           PASS
FAILED_CRITERIA:  None
EVIDENCE:         docs/assignment3/evidence/AT-03/{README.md,network-and-logs.txt,step3-all-floors.png,step5-floor3.png,step7-stale-fallback.png}
ISSUE:            None
```
