---
name: lead-import
description: |
  Deterministic CSV ingest from workspace/crm/imports/ into leads.csv.
  Maps owner columns to schema.json, validates, dedupes, calls crm-write create.
  NO LLM. Reports rejections; never silently drops rows.
  TRIGGER when: owner drops a CSV in crm/imports/ or says "import my list".
argument-hint: "file=<path> mapping=<path_to_column_map.json?>"
---

# lead-import — CSV Ingest

## Contract

- **Type**: Deterministic. NO LLM.
- **Input**: `file=<path>` (default: newest file in `crm/imports/`). Optional `mapping=<path>` (column map JSON; default infers by header names).
- **Output**: Ingest report to stdout + appended rows to `leads.csv` via `crm-write create`.
- **Side effects**: One `crm-write create` call per valid row. Writes an ingest summary to `crm/imports/<filename>.report.md`.
- **Determinism**: Pure parse + validate. Same input → same set of created rows (though `id`s increment based on current `leads.csv` state).

## Column Mapping

If no `mapping=` provided, infer from import CSV header. Matches supported for common shapes:

| Source header variants | Target column |
|------------------------|---------------|
| `company`, `Company`, `Company Name`, `account` | `company` |
| `domain`, `website`, `url`, `company website` | `website` |
| `city`, `City`, `Office City` | `city` |
| `state`, `State`, `st` | `state` |
| `contact name`, `name`, `first_name + last_name` concat | `contact_name` |
| `title`, `job title`, `role` | `contact_title` |
| `email`, `work email` | `contact_email` |
| `phone`, `phone_number` | `contact_phone` |
| `linkedin`, `linkedin_url` | `contact_linkedin` |
| `industry`, `vertical`, `sector` | `vertical` (see mapping below) |

## Vertical Inference

Freeform industry text → `vertical_*` enum via keyword map:

| Keyword hit | → enum |
|-------------|--------|
| `3pl`, `third-party logistics`, `distribution`, `warehouse`, `fulfillment` | `vertical_3pl` |
| `brewery`, `cider`, `distillery`, `craft beer` | `vertical_brewery` |
| `food`, `beverage`, `bottling`, `beverage`, `co-packer`, `poultry`, `pork`, `dairy` | `vertical_food_bev` |
| `furniture`, `case goods`, `upholster` | `vertical_furniture` |
| `pharma`, `biotech`, `medical device`, `life sciences`, `cGMP` | `vertical_biotech_pharma` |
| `aerospace`, `automotive`, `industrial`, `heavy mfg`, `OEM` | `vertical_industrial_mfg` |
| `agriculture`, `produce`, `nursery`, `sweet potato`, `tobacco`, `Christmas tree` | `vertical_agriculture` |
| `textile`, `apparel`, `carpet`, `nonwoven` | `vertical_textile` |
| (no hit) | `vertical_other` |

## Validation

For each row:
1. Normalize into target schema columns.
2. Dedupe against existing `leads.csv` — match on `company + state` (case-insensitive) OR `contact_email` (case-insensitive). Dupes → skip with reason.
3. Validate against `schema.json`. Enum violations (e.g., state not in `{NC,SC,VA,GA,TN,other}`) → reject the row.
4. If valid → call `/crm-write create <fields>` with `source=list_import`.

## Output Report

Written to `crm/imports/<filename>.report.md`:

```markdown
# Import Report — <filename> — YYYY-MM-DD HH:MM UTC

- **Total rows**: N
- **Created**: N (L-XXXXXX..L-YYYYYY)
- **Skipped (duplicates)**: N
- **Rejected (validation)**: N

## Rejections
| row | reason |
| 42  | state=CA not in allowed enum |
| 87  | contact_email malformed |

## Duplicates (existing lead_id)
| row | matched_lead | match_field |
| 12  | L-000025 | company+state |
```

## Guardrails

- Never silently drops. Every row is either created, skipped-dup, or rejected-with-reason.
- Never overwrites existing leads. Dupes → skip, don't update.
- Never trusts input `id` values. `id` is always auto-generated.
- Respect territory: `state=other` requires owner confirmation flag to create (default: reject).
