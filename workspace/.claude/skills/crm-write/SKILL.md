---
name: crm-write
description: |
  Deterministic upsert + stage-transition enforcement for workspace/crm/leads.csv and history.csv.
  Validates against schema.json and stages.json. NO LLM. Atomic writes.
  ONLY this skill writes to leads.csv and history.csv — all other skills call through it.
  TRIGGER when: create a lead, update fields, transition stage, append a history note.
argument-hint: "create|update|transition|note <id?> <fields>"
---

# crm-write — Validated Upsert + Transition Enforcement

Only writer to `leads.csv` and `history.csv`. All state mutations flow through here.

## Contract

- **Type**: Deterministic. NO LLM. Pure validation + atomic append.
- **Operations**:
  - `create <field>=<value>...` — new row. `id` auto-generated `L-NNNNNN` if absent.
  - `update <id> <field>=<value>...` — partial patch.
  - `transition <id> <to_stage> [dq_reason=<enum>]` — stage change.
  - `note <id> <text> [ref=<path>]` — append history row without field change.
- **Output**: On success, prints the new/updated row + the history row. Exit 0. On failure, non-zero exit + error message.
- **Side effects**:
  - Appends/rewrites exactly one row in `leads.csv` (atomic: write temp, fsync, rename).
  - Appends exactly one row in `history.csv`.
  - Sets `updated_at = now()` on every write; `created_at` on `create` only.
  - Computes `fit_score` deterministically on every write (spec 01 § 6 formula) — never accepted from input.
- **Determinism**: Pure validation. No LLM.

## Validation Rules

- Every column validated against `schema.json`:
  - Type match (`string`, `integer`, `enum`, `enum_set`, `date`, `datetime`)
  - Pattern match (e.g., `id` matches `^L-[0-9]{6}$`, `contact_email` matches email regex)
  - Enum membership (values listed in `schema.json.columns[].values`)
  - `enum_set` values pipe-delimited, every element in allowed set
- `id` unique on `create`; must exist on `update`/`transition`/`note`.
- Stage transitions validated against `stages.json.transitions` — illegal transitions rejected with list of allowed next states.
- Terminal stages (`closed_won`, `closed_lost`) freeze the row against subsequent `update`; `note` still appends.
- `closed_lost` on transition REQUIRES `dq_reason` populated from `schema.json.columns.dq_reason.values`.
- `closed_lost → new` (reactivation) allowed ONLY if prior `dq_reason ∈ stages.json.reactivatable_dq_reasons`; must set `source=reactivation` and clear `dq_reason`.
- On `create`: required columns present, `owner` defaults to `sdr-pallet`, `stage` defaults to `new`, `touches_count` defaults to 0.

## Auto-Computed Fields

- `id` — auto if absent; next available `L-NNNNNN` (scan max + 1).
- `created_at` / `updated_at` — UTC ISO 8601, `YYYY-MM-DDTHH:MM:SSZ`.
- `fit_score` — deterministic formula per spec 01 § 6.1:
  - Vertical fit (25): ICP weight from `USER.md` ranked list (or static map).
  - Territory proximity (15): NC=15, adjacent=10, outer SE=5.
  - Size / volume (20): `employee_count_band` + `est_volume_weekly` tiered.
  - BANT completeness (25): count of {budget_signal, authority_level, need_type, timing} ≠ unknown × 6.25.
  - Engagement (15): touches_count with replies + meeting_accepted bool.
  - Soft penalties (–30 max): per spec 01 § 5.4.

## History Row Emitted

Every `leads.csv` mutation appends one row to `history.csv`:

```
ts,lead_id,event,from_stage,to_stage,actor,ref,note
2026-04-18T14:02:30Z,L-000042,stage_change,new,researched,crm-write,crm/drafts/L-000042/research.md,
```

- `event` ∈ `{create, update, stage_change, email_draft, call_script, research, note, disqualify}`
- `from_stage` / `to_stage` — populated only when `event=stage_change`
- `actor` — usually `crm-write` or the skill name that called through
- `note` — ≤200 chars, no commas outside quotes

## Forbidden Transitions (hard-rejected)

See `stages.json.forbidden_transitions`. Examples:
- `new → contacted` (skips research)
- `engaged → quoted` (BANT must clear first)
- `qualified → closed_won` (quote audit trail missing)
- `closed_won → *` (terminal)

## Examples

```
/crm-write create company="Acme Brewing" website=acmebrewing.com city=Asheville state=NC vertical=vertical_brewery tier=B source=research
/crm-write update L-000042 pallet_interest="gma_48x40_new|heat_treated_ispm15" est_volume_weekly=150
/crm-write transition L-000042 researched
/crm-write transition L-000099 closed_lost dq_reason=no_reply_exhausted
/crm-write note L-000042 "owner confirmed quote sent 4/22" ref=crm/drafts/L-000042/handoff.md
```
