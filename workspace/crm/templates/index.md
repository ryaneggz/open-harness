# Template Library Index

Curated starter emails for `cold-email/`. Templates are scaffolds — `cold-email` reads the matching template, fills placeholders from the lead record, and produces a lead-specific draft. **Templates are never sent.** Final drafts live under `crm/drafts/<lead-id>/` with `gate_status: PASS` enforcement.

Frontmatter schema enforced by `template-write/`. Match algorithm in `template-library/SKILL.md`.

## Coverage (seed — 2 verticals × 5 core touches)

| Vertical | T1 | T2 | T4 | T6 | T8 | Scenarios |
|----------|----|----|----|----|----|-----------|
| `vertical_3pl`        | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `vertical_food_bev`   | — | — | — | — | — | — |
| `vertical_furniture`  | — | — | — | — | — | — |
| `vertical_brewery`    | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| `vertical_biotech_pharma` | — | — | — | — | — | — |
| `vertical_industrial_mfg` | — | — | — | — | — | — |
| `vertical_agriculture` | — | — | — | — | — | — |
| `vertical_textile` | — | — | — | — | — | — |
| `vertical_other` | — | — | — | — | — | — |

**30+ gaps outstanding.** Use `/template-library --gaps` to prioritize by pending-lead pressure. `/template-write` drafts new templates; owner promotes from `crm/drafts/templates/` to `crm/templates/<vertical>/`.

## Touch map (spec 04)

| Touch | Goal | Body cap |
|-------|------|----------|
| T1 (day 0) | Earn the second email. One specific prospect fact + one soft ask. | 120 words |
| T2 (day +3) | New angle, not a bump. | 80 words |
| T4 (day +9) | Proof point. Anonymized NC customer or freight-math insight. | 100 words |
| T6 (day +15) | Pattern interrupt. "Still worth a look?" 2-liner. | 40 words |
| T8 (day +21) | Clean break-up. "Assuming not a fit, closing the loop." | 60 words |

(T3 + T5 + T7 are LinkedIn / phone — no email templates needed.)

## Full template listing

Rebuild this table with `/template-library --index`. It scans every `.md` under `crm/templates/` and emits:

| Path | Vertical | Touch | Scenario | Pallet Focus | Last Modified |
