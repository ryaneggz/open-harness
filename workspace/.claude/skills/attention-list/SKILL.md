---
name: attention-list
description: |
  Deterministic daily ranked queue. Top-N leads ordered by composite score
  (fit_score + days_since_last_touch × 2 + stage_urgency − anti_recency_penalty).
  Writes snapshot to crm/attention/YYYY-MM-DD.md for audit.
  NO LLM.
  TRIGGER when: morning-pipeline heartbeat; owner asks "what should I work on today".
argument-hint: "[limit=<N>] [as_of=YYYY-MM-DD] [owner=<string>]"
---

# attention-list — Ranked Daily Queue

## Contract

- **Type**: Deterministic. NO LLM. Pure computation.
- **Input**: `limit=<int>` (default 20), `as_of=YYYY-MM-DD` (default today), `owner=<string>` (default all).
- **Output**:
  - Stdout: ranked table.
  - File: `crm/attention/YYYY-MM-DD.md` (audit snapshot).
- **Side effects**: Writes snapshot file. No CRM mutations.
- **Determinism**: Same inputs + same files + same `as_of` → byte-identical ordering.

## Composite Score Formula

For each non-terminal lead:

```
score = fit_score
      + (days_since_last_touch × 2)
      + stage_urgency
      − anti_recency_penalty
```

### Components

| Component | Calculation | Range |
|-----------|-------------|-------|
| `fit_score` | Lead's current `fit_score` column | 0-100 |
| `days_since_last_touch × 2` | `(as_of − last_touch_date).days × 2`; capped at 30 | 0-60 |
| `stage_urgency` | Stage proximity to handoff: `{new:5, researched:10, contacted:15, engaged:25, qualified:40, quoted:30}` | 0-40 |
| `anti_recency_penalty` | If touched within 2 days AND stage=contacted: 30 (don't spam) | 0-30 |

## Filtering

Exclude from the queue:
- Terminal stages: `closed_won`, `closed_lost`
- Leads where `contact_email_status = bounced` with no alternate contact
- Leads with `stage=contacted` AND `touches_count >= 8` (cadence-exhausted; separate cleanup)
- Leads with `next_action_date > as_of + 7d` (explicitly scheduled further out)

## Output Format

### Stdout (table)

```
ATTENTION LIST — as of 2026-04-19 — top 20 of 47 eligible

RANK  ID        SCORE  STAGE      FIT  LAST    VERTICAL           COMPANY           NEXT ACTION
  1   L-000042    95   qualified   72  2026-04-12  vertical_brewery   Acme Brewing      handoff
  2   L-000055    84   engaged     68  2026-04-14  vertical_food_bev  Megacorp          discovery
  3   L-000018    78   contacted   55  2026-04-08  vertical_3pl       LogiCo NC         email_2
  ...
```

### File (`crm/attention/2026-04-19.md`)

```markdown
---
skill: attention-list
as_of: 2026-04-19
eligible: 47
shown: 20
---

# Attention List — 2026-04-19

## Top 20

| rank | id | score | stage | fit_score | last_touch | vertical | company | next_action | rationale |
| 1 | L-000042 | 95 | qualified | 72 | 2026-04-12 | vertical_brewery | Acme Brewing | handoff | BANT cleared 7d ago; quote overdue |
...

## Excluded (summary)
- Terminal: 12
- Cadence-exhausted: 3
- Scheduled future: 8
- Bounced no-alt: 1
```

## Guardrails

- Rank is deterministic. Pin `as_of` for tests.
- Score components are additive and named; never hidden.
- Score is not stored in `leads.csv` — it's a view, recomputed daily.
- "Rationale" column is string-generated from the score components (e.g., "stage urgency 40 + 3d since touch + fit 72"), NOT LLM-written.
