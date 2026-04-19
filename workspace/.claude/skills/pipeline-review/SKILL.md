---
name: pipeline-review
description: |
  Deterministic roll-up of workspace/crm/leads.csv and history.csv.
  Stage counts, stuck leads, next-7d actions, stage-to-stage conversion %.
  NO LLM. Byte-identical across runs with pinned as_of.
  TRIGGER when: daily morning brief, weekly review, any "what's the pipeline" question.
argument-hint: "window=7d|30d|mtd|qtd as_of=YYYY-MM-DD owner=<owner>"
---

# pipeline-review — Deterministic Roll-Up

## Contract

- **Type**: Deterministic. NO LLM. Pure aggregation.
- **Input**: `window=7d|30d|mtd|qtd` (default 7d), `as_of=YYYY-MM-DD` (default today), `owner=<string>` (default all).
- **Output**: Markdown report to stdout (heartbeat-friendly).
- **Side effects**: None.
- **Determinism**: Same inputs + same files + same `as_of` → byte-identical output.
- **Dependencies**: `leads.csv`, `history.csv`, `stages.json`.

## Sections

### 1. Count by stage
Table of current counts in every non-terminal stage + closed_won/lost in window.

### 2. Stuck leads
Rows where `days_in_stage > stages.json.stuck_thresholds_days[stage]`. Sorted descending by days.

### 3. Next-7-day actions
Rows where `next_action_date` within `[as_of, as_of + 7d]`. Sorted ascending.

### 4. Stage transitions in window
Count of each `from_stage → to_stage` edge in `history.csv` where `ts` falls in window.

### 5. Conversion %
For each adjacent stage pair `A → B` in the happy path (`new→researched→contacted→engaged→qualified→quoted→closed_won`):
- Numerator: count of `B` entries in window
- Denominator: count of `A` entries in window
- Percent = num / den × 100, rounded to 1 decimal

### 6. Wins / Losses
- Wins: transitions to `closed_won` in window
- Losses: transitions to `closed_lost` in window, grouped by `dq_reason`

## Output format (example)

```
## Pipeline Review — 2026-04-18 (7d window)

### Stage counts
| stage       | count |
| new         |   12  |
| researched  |    8  |
| contacted   |   19  |
| engaged     |    5  |
| qualified   |    2  |
| quoted      |    1  |

### Stuck leads (top 10)
| id | company | stage | days_stuck | threshold |
| L-000042 | Acme Brewing | contacted | 12 | 7 |

### Next-7-day actions
| id | company | next_action | date |
| L-000050 | ... | email_4 | 2026-04-19 |

### Stage transitions (7d)
| from → to | count |
| new → researched | 6 |
| researched → contacted | 5 |

### Conversion % (7d)
| pair | % |
| new → researched | 50.0 |
| contacted → engaged | 21.1 |

### Wins / Losses (7d)
- Wins: 0
- Losses: 3 (no_reply_exhausted: 2, volume_below_floor: 1)
```
