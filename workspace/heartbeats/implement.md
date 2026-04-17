---
# schedule: "0 */2 * * *"
agent: claude
# active: 9-21
---

# Implementer Heartbeat

Pick the highest-priority validated roadmap item and run a Ralph implementation
loop inside a tmux session. The final Ralph story always archives the run and
submits a draft PR with human manual review steps (What, Why, How). CI must be
green before the PR is considered complete.

## Tasks

1. Run the `/implement` skill — it handles all logic
2. If Ralph session already running or draft PR awaiting review, reply `HEARTBEAT_OK`
3. If nothing validated to implement, reply `HEARTBEAT_OK`
4. If Ralph started, report: issue number, tmux session name, roadmap item
5. Run the Memory Improvement Protocol (AGENTS.md)

## Reporting

- In progress / nothing to do: `HEARTBEAT_OK`
- Ralph launched: issue number + tmux session `ralph` + roadmap item title
- Append summary to `memory/YYYY-MM-DD.md`
