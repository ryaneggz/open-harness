---
name: template-library
description: |
  Deterministic read/index of crm/templates/. Returns best-match template for a (vertical, touch, scenario) query.
  Also reports coverage gaps across the {verticals × touches} matrix.
  Called by cold-email; runnable standalone for gap analysis.
  NO LLM.
  TRIGGER when: cold-email needs a scaffold; owner asks for coverage gaps; weekly-pipeline-review.
argument-hint: "vertical=<enum> touch=<1..8> [scenario=<name>] | --gaps | --index"
---

# template-library — Read + Gap Report

## Contract

- **Type**: Deterministic. NO LLM. Pure file-listing + frontmatter-parse + match.
- **Input modes**:
  - **Match mode**: `vertical=<enum> touch=<1..8> [scenario=<name>]` → returns best-match template path.
  - **Gaps mode**: `--gaps` → prints the coverage matrix with empty cells highlighted.
  - **Index mode**: `--index` → prints the full TOC with frontmatter (same as `templates/index.md`).
- **Output**:
  - Match mode: `{path, frontmatter, match_score}` as JSON OR `GAP` marker if nothing matches.
  - Gaps mode: coverage matrix.
  - Index mode: TOC table.
- **Side effects**: None.
- **Determinism**: Full.

## Match Algorithm

Score every template under `crm/templates/<vertical>/` by:
- `touch` exact match: +100 (mandatory — if no touch match, score = 0)
- `scenario` exact match: +50
- `pallet_focus` overlap with lead's `pallet_interest`: +10 per shared value
- Tie-break: most-recently-modified template wins

Return the highest-scoring template, OR the `GAP` marker if no template matches at the minimum (touch exact match).

## Gap Report

Matrix: rows = `vertical_*` enum values (9), cols = core touches `{1, 2, 4, 6, 8}` + `scenarios` bucket.

```
VERTICAL           T1  T2  T4  T6  T8  SCENARIOS
vertical_3pl        ✓   ✓   ✓   ✓   ✓   peak-season-capacity, gma-cost-squeeze
vertical_food_bev   ✓   ✓   ✓   ✓   ✓   ispm15-export-push
vertical_furniture  —   —   —   —   —   —
vertical_brewery    —   —   —   —   —   —
vertical_biotech    —   —   —   —   —   —
...
```

Prioritize gaps by intersecting with current `leads.csv` stage distribution — "gap for vertical_furniture T2 and we have 4 leads in `contacted` stage" is higher priority than "gap for vertical_other T8".

## Index File

`crm/templates/index.md` is the human-readable TOC, generated/updated by this skill when `--index` runs. Format:

```markdown
# Template Library Index — YYYY-MM-DD

| Path | Vertical | Touch | Scenario | Pallet Focus | Last Modified |
| vertical_3pl/t1-cold-intro.md | vertical_3pl | 1 | cold_intro | gma_48x40_recycled, gma_48x40_new | 2026-04-19 |
...
```

## Guardrails

- Gate on `cold-email` correctness: if template-library returns a path, cold-email must use it (unless owner forces freehand with explicit flag).
- Templates are **never sent** — they're scaffolds. Lead-specific drafts live in `crm/drafts/<lead-id>/`, not `crm/templates/`.
- Modifying a template in-place is allowed but should preserve the frontmatter schema. `template-write` is the preferred path for adds/edits.
