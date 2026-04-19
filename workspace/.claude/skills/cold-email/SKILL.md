---
name: cold-email
description: |
  LLM-generative cold email draft. Reads matching template from crm/templates/, fills placeholders from lead facts (never invent), writes draft under crm/drafts/<lead-id>/<ts>-cold.md, and runs outreach-gate before the draft is considered ready.
  Does NOT send email.
  TRIGGER when: need to write a touch 1-8 outreach for a lead; stuck-lead-sweep proposes a follow-up.
argument-hint: "lead_id=L-NNNNNN [touch=<1..8>] [scenario=<name>]"
---

# cold-email — LLM-Gated Draft

## Contract

- **Type**: LLM-generative. Non-deterministic output.
- **Input**: `lead_id=L-NNNNNN` (required); `touch=<1..8>` (optional, inferred from `touches_count + 1` if absent); `scenario=<name>` (optional, inferred from lead state).
- **Output**: Markdown file at `crm/drafts/<lead-id>/<ISO-ts>-cold.md` with frontmatter:
  ```
  ---
  lead_id: L-000042
  skill: cold-email
  created_at: 2026-04-18T14:02:00Z
  channel: email
  touch: 1
  scenario: cold_intro
  template_ref: crm/templates/vertical_brewery/t1-cold-intro.md
  gate_status: PENDING | PASS | FAIL
  ---
  Subject: <≤60 chars>

  <body ≤ touch-specific word cap>

  — <signature from USER.md>
  ```
- **Side effects**:
  - Writes draft file.
  - Calls `/crm-write note <id> "cold-email drafted" ref=<path>` — appends `event=email_draft` history row.
  - Calls `/outreach-gate <draft-path>` — sets frontmatter `gate_status`.
  - Does NOT send. Does NOT advance stage.
- **Determinism**: None (LLM).

## Flow

1. Read lead record via `/crm-read format=json` filtered on `id=<lead_id>`. Error if not found.
2. Compute next touch number: `touch = args.touch ?? lead.touches_count + 1`. Must be 1-8.
3. Select template:
   - Call `/template-library vertical=<lead.vertical> touch=<N> scenario=<inferred>` — returns best-match template path + frontmatter, OR a `GAP` marker.
   - If a template matches: use it as the starter scaffold.
   - If GAP: proceed freehand BUT record the gap in `memory/YYYY-MM-DD.md` for `/template-write` consideration.
4. Fill placeholders from the lead record. **Never fabricate facts.** Every `{prospect_fact}` placeholder must resolve from:
   - `crm/drafts/<id>/research.md` (if exists)
   - `leads.csv` columns
   - `USER.md` (for sender/principal facts)
   If a required placeholder has no source, fail with a "missing_fact:<placeholder>" error — do not invent.
5. Apply touch-specific body cap per spec 04:
   - T1: 120 words | T2: 80 | T4: 100 | T6: 40 | T8: 60
6. Write the draft file with `gate_status: PENDING`.
7. Call `/outreach-gate <path>` — flips `gate_status` to `PASS` or `FAIL`.
8. Call `/crm-write note <lead_id> "cold-email T<N> drafted, gate: <status>" ref=<path>`.

## Required Inputs from Lead / Research

- `company` (required)
- `city` (required)
- `contact_name` or `contact_first_name` (required; if missing, first word of `contact_name` OR `"there"` fallback — and `outreach-gate` will mark personalization low)
- `vertical` (required)
- `pallet_interest` (optional but improves relevance)
- `current_supplier` (optional)
- `recent_trigger` from `research.md` (optional, Tier-2 personalization)

## Guardrails

- Body word-count checked before writing.
- Ban-list enforced at draft time (soft) + gate time (hard).
- One `?` per body. One CTA.
- No attachments, no URL shorteners, no pixel tracking.
- Signature block includes physical address + opt-out path (CAN-SPAM) — pulled from `USER.md`.

## Example

```
/cold-email lead_id=L-000042
# → crm/drafts/L-000042/2026-04-18T14-02Z-cold.md
# → gate_status: PASS (or FAIL with report)
# → history.csv: +1 row (event=email_draft)
```
