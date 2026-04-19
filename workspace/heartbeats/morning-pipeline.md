---
name: morning-pipeline
schedule: "0 13 * * 1-5"
agent: claude
active: true
description: Daily 08:00 ET — ranked attention list, today's follow-ups, stuck leads
---

# Morning Pipeline

Daily 08:00 ET (13:00 UTC during EST; 12:00 UTC during EDT — accept ~1h drift).

## Tasks

1. Run `/attention-list limit=20` — surface top-ranked leads to work today (composite score: fit_score + days_since_last_touch × 2 + stage_urgency − anti_recency_penalty). Writes snapshot to `crm/attention/YYYY-MM-DD.md`.
2. Run `/pipeline-review window=7d` — aggregate stage counts, stuck-lead list.
3. Surface leads with `next_action_date <= today` — schedule them on the attention list.
4. Surface leads exceeding `stuck_thresholds_days[stage]` in `stages.json` — propose one next action each.
5. Append summary to `memory/YYYY-MM-DD.md` per Memory Protocol.
6. Reply `HEARTBEAT_OK` if pipeline empty.

## Output format

```
## Morning Pipeline — YYYY-MM-DD

### Attention list (top 20)
<ranked table: id, company, stage, fit_score, next_action, days_since_touch>

### Today's follow-ups
<leads where next_action_date <= today>

### Stuck leads
<leads past stuck_thresholds_days>

### Suggested next moves
<one action per stuck lead>
```
