---
name: crm-read
description: |
  Deterministic read of workspace/crm/leads.csv and history.csv. Filters, selects, counts.
  Pure parse — no LLM. Same inputs + same files → byte-identical output.
  TRIGGER when: need to list leads, filter by stage/vertical/owner, check stuck, count pipeline.
argument-hint: "stage=<stage> owner=<owner> vertical=<enum> state=<state> days_stuck><N> fit_score>=<N> limit=<N> format=table|json"
---

# crm-read — Deterministic Query

Reads `workspace/crm/leads.csv` and optionally joins `history.csv` / `stages.json` for stuck-days filters.

## Contract

- **Type**: Deterministic. NO LLM reasoning. Pure parse + filter + select.
- **Input**: CLI-style natural-language args parsed by the skill.
  - `stage=<enum>` or `stage!=<enum>[,<enum>,...]` (single or list with `!=`)
  - `owner=<string>`
  - `vertical=<enum>` or `vertical in [...]`
  - `state=<enum>`
  - `tier=<A|B|C>`
  - `fit_score>=<int>` / `fit_score<<int>>`
  - `days_stuck><int>` — days in current stage exceeds threshold; joins `history.csv` for last-stage-change, compares to today
  - `contacted_in=<Nd>` — last_touch_date within N days
  - `has_email=<bool>` — contact_email non-empty and status in {valid,risky}
  - `limit=<int>` (default 100)
  - `format=table|json` (default table)
- **Output**:
  - `table` — fixed-width columns: `id, company, state, vertical, stage, fit_score, next_action_date, days_in_stage`
  - `json` — array of rows with all columns from `schema.json`
- **Side effects**: None. Read-only.
- **Determinism**: Same inputs + same files → byte-identical output. Sort stable on `id`.
- **Dependencies**: `schema.json` (validate column names in filters), `stages.json` (stuck_thresholds_days).

## Steps

1. Parse args into a filter spec.
2. Validate every column name against `schema.json`. Unknown column → error with list of allowed names + exit 1.
3. Load `leads.csv`. Stream-parse (the CSV may grow).
4. Apply filters row-by-row.
5. If `days_stuck` filter used, load `history.csv` and compute days-in-stage for each candidate row (last `stage_change` event to `stage` → today).
6. Sort stable on `id` ascending.
7. Print head `limit` rows in requested format.

## Errors

- Malformed CSV → error with line number, exit 1.
- Invalid filter → error with expected syntax, exit 2.
- Empty result → exit 0, print empty table header only.

## Example

```
/crm-read stage=contacted vertical=vertical_brewery days_stuck>5 limit=10
```
