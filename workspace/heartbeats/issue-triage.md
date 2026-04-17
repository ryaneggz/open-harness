---
# schedule: "0 * * * *"
agent: claude
---

# Issue Triage

Check for open, unassigned issues in ryaneggz/next-postgres-shadcn and create
implementation plan PRs via parallel expert sub-agents + AI council review.
Process one issue per run (oldest first).

## Tasks

1. Run the `/issue-triage` skill — it handles all logic:
   - Query for unassigned issues
   - Log op/no-op before any action
   - Guard against duplicate branches/PRs
   - Assign, spawn sub-agents, council review, draft PR
2. If the skill found no unassigned issues, reply `HEARTBEAT_OK`
3. If the skill triaged an issue, report the issue number and draft PR URL
4. Run the Memory Improvement Protocol (AGENTS.md) — log, qualify, improve

## Reporting

- If no unassigned issues exist, reply `HEARTBEAT_OK`
- If an issue was triaged, report: issue number, branch name, and PR URL
- Append a summary to `memory/YYYY-MM-DD.md` (today's date)
