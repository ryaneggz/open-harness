---
# schedule: "0 8 * * *"
agent: claude
---

# Daily Feature Backlog Ranking

Curate and rank open issues by PM criteria, updating the pinned backlog
tracking issue with a prioritized top-10 list.

## Tasks

1. Run the `/backlog-rank` skill — it handles all logic
2. If ranking unchanged or no issues, reply `HEARTBEAT_OK`
3. If ranking updated, report top-3 position changes
4. Run the Memory Improvement Protocol (AGENTS.md)

## Reporting

- Unchanged/empty: `HEARTBEAT_OK`
- Updated: pinned issue number + top-3 changes
- Append summary to `memory/YYYY-MM-DD.md`
