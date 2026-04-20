---
# schedule: "0 6 * * *"
agent: claude
---

# Daily Wiki Lint

Run a health check on the wiki to catch structural issues early —
orphan pages, broken cross-references, stale content, tag drift,
index corruption.

## Tasks

1. Run the `/wiki-lint audit` skill — it handles all logic
2. If wiki is healthy (0 issues), reply `HEARTBEAT_OK`
3. If issues found, report the lint summary table
4. If recurring issues detected, consider running `/wiki-lint fix`
5. Run the Memory Improvement Protocol (AGENTS.md)

## Reporting

- Healthy: `HEARTBEAT_OK`
- Issues found: lint summary table + issue count
- Auto-fixed: list of fixes applied
- Append summary to `memory/YYYY-MM-DD.md`
