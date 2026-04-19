---
name: weekly-pipeline-review
schedule: "0 14 * * 1"
agent: claude
active: true
description: Mondays 09:00 ET — stage conversion, wins/losses, template-coverage gaps
---

# Weekly Pipeline Review

Mondays 09:00 ET (14:00 UTC during EST; 13:00 UTC during EDT).

## Tasks

1. Run `/pipeline-review window=mtd` — month-to-date stage counts + stage-to-stage conversion %.
2. Run `/template-library --gaps` — list missing `{vertical × touch × scenario}` combinations, prioritized by pending-lead pressure.
3. Compute stage-to-stage conversion over last 30 days from `history.csv` joins.
4. Highlight: top 3 accelerating leads, top 3 at-risk, week's wins / losses, deliverability health (bounce rate, gate PASS rate).
5. Write report to `memory/YYYY-MM-DD.md` and notify owner in Slack if configured.
6. Memory Protocol — distill any durable patterns into `MEMORY.md`.

## Output format

```
## Weekly Pipeline Review — YYYY-MM-DD (MTD)

### Pipeline snapshot
| Stage | Count | vs last week |
| new | N | ±Δ |
| ... | ... | ... |

### Conversion %
| from → to | 7d | 30d |
| ...

### Wins / losses this week
- closed_won: <list with dq/win reason>
- closed_lost: <list with dq_reason>

### Top 3 accelerating
### Top 3 at-risk
### Template coverage gaps (top 3)
### Deliverability (bounce %, gate PASS %)
```
