---
name: stuck-lead-sweep
schedule: "0 15 * * 3,5"
agent: claude
active: true
description: Wed + Fri 10:00 ET — mid-week nudge on stuck leads
---

# Stuck Lead Sweep

Wed + Fri 10:00 ET (15:00 UTC during EST; 14:00 UTC during EDT).

## Tasks

1. `/crm-read stage!=closed_won,closed_lost days_stuck>threshold` — list leads past `stuck_thresholds_days[stage]`.
2. For each stuck lead, propose ONE of:
   - (a) Follow-up email draft via `/cold-email lead_id=<id>` — uses template-library if a match exists
   - (b) Disqualify via `/crm-write transition <id> closed_lost dq_reason=<reason>`
   - (c) Note + bump `next_action_date` via `/crm-write update <id> next_action_date=YYYY-MM-DD`
3. Execute (a) by drafting only — gate + send stay manual (owner approves).
4. Reply `HEARTBEAT_OK` if no stuck leads.

## Output format

```
## Stuck Lead Sweep — YYYY-MM-DD

| id | company | stage | days_stuck | proposed action |
| L-000042 | Acme Brewing | contacted | 9 | (a) draft Touch 2 (template: vertical_brewery/t2-value-prop.md) |
| L-000055 | Megacorp | engaged | 8 | (c) note: "replied 'not now, Q3'" bump next_action_date 2026-07-15 |
```
