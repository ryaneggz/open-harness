---
name: template-write
description: |
  LLM-gated proposal of new starter-email templates. Invoked when template-library reports a gap
  for a vertical × touch combo the pipeline needs, or when a winning objection handle emerges from MEMORY.md.
  Proposes a draft at crm/drafts/templates/<id>.md; owner promotes to crm/templates/<vertical>/<filename>.md.
  TRIGGER when: template coverage gap + pending leads; memory-distill surfaces a durable winning angle.
argument-hint: "vertical=<enum> touch=<1..8> scenario=<name> [based_on=<winning-draft-path>]"
---

# template-write — Template Proposal

## Contract

- **Type**: LLM-gated.
- **Input**: `vertical=<enum>`, `touch=<int>`, `scenario=<name>`, optional `based_on=<path>` (a winning lead-specific draft to generalize).
- **Output**: Markdown proposal at `crm/drafts/templates/<id>.md` awaiting owner promotion.
- **Side effects**:
  - Writes draft.
  - Calls `/crm-write note` with a synthetic `lead_id=system` row skipped (template writes don't touch leads.csv). Instead, appends a line to `memory/YYYY-MM-DD.md` noting the proposal.
- **Determinism**: None.

## Flow

1. Read spec 04 email-anatomy rules + the vertical's section from `wiki/sources/nc-logistics-context.md` + spec 02 product taxonomy (for `pallet_focus` hypotheses).
2. If `based_on=<path>` provided, read that lead-specific draft and generalize:
   - Strip prospect-specific facts → placeholders
   - Preserve the structural insight that made the draft work
3. Compose the template with full frontmatter:
   ```yaml
   ---
   id: tmpl_<vertical>_t<N>_<scenario>
   vertical: <enum>
   touch: <int>
   scenario: <name>
   pallet_focus: [<enum-values>]
   tone: consultative
   subject_pattern: "<one generic pattern with {placeholders}>"
   body_words_target: <int per spec 04 touch cap>
   required_vars: [company, city, contact_title]
   optional_vars: [est_volume_weekly, current_supplier, recent_trigger]
   teaching_insight: "<one-line Challenger-style insight specific to this vertical>"
   ---
   Subject: <pattern with placeholders>

   <body using {{handlebars}} placeholders>

   — {{sender_signature}}
   ```
4. Validate frontmatter against the template schema (see below).
5. Write to `crm/drafts/templates/<id>.md` with owner-promote instructions.

## Template Frontmatter Schema (validated at draft time)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | string | yes | `tmpl_<vertical>_t<N>_<scenario>` |
| `vertical` | enum | yes | Must match `schema.json.columns.vertical.values` |
| `touch` | integer | yes | 1-8 |
| `scenario` | string | yes | snake_case |
| `pallet_focus` | list<enum> | yes | Each value from `schema.json.columns.pallet_interest.values` |
| `tone` | enum | yes | `consultative` \| `direct` \| `teaching` |
| `subject_pattern` | string | yes | ≤60 chars target, uses `{placeholders}` |
| `body_words_target` | integer | yes | ≤ spec 04 cap for the touch |
| `required_vars` | list<string> | yes | Placeholders that MUST resolve or cold-email fails `missing_fact` |
| `optional_vars` | list<string> | no | Enhance personalization when present |
| `teaching_insight` | string | no | One-line Challenger angle |

## Owner Promotion

Draft sits at `crm/drafts/templates/<id>.md` until owner explicitly promotes:

```bash
# Option A: git mv
git mv workspace/crm/drafts/templates/<id>.md workspace/crm/templates/<vertical>/t<N>-<scenario>.md

# Option B: review + run template-library --index to regenerate index.md
```

Once promoted, `template-library` picks it up on next match call.

## Guardrails

- Do NOT write directly to `crm/templates/`. Owner approves first.
- Frontmatter validation is hard — invalid drafts fail loud.
- If `based_on` draft had `gate_status != PASS`, refuse — don't generalize a failing draft.
- Teaching insight must be grounded in the spec (NWPCA, ISPM-15, truck-fill math, etc.). No vibes.
