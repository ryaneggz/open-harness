---
name: discovery-call
description: |
  LLM-generative qualifying-question script tailored to a lead. Maps each question to a qual_* column so answers back-fill via crm-write update.
  SPIN structure (Situation → Problem → Implication → Need-Payoff) per spec 01 § 8.
  TRIGGER when: a lead transitions to engaged; owner requests a call prep sheet.
argument-hint: "lead_id=L-NNNNNN [format=script|checklist]"
---

# discovery-call — Qualifying Script Generator

## Contract

- **Type**: LLM-gated.
- **Input**: `lead_id=L-NNNNNN` (required); `format=script|checklist` (default `script`).
- **Output**: Markdown file at `crm/drafts/<lead-id>/<ISO-ts>-discovery.md`.
- **Side effects**:
  - Writes draft.
  - Calls `/crm-write note <id> "discovery-call script drafted" ref=<path>` — `event=call_script`.
- **Determinism**: None (LLM).

## Structure (SPIN + BANT-mapped)

Every question must map to one or more `qual_*` columns in `schema.json` so answers back-fill deterministically.

### 1. Situation (2-3 questions, surface facts)
| Question | Column(s) populated |
|----------|---------------------|
| "Walk me through how pallets flow at your {city} operation — inbound, outbound, internal?" | `primary_lane` |
| "Roughly how many pallets per week at that site?" | `est_volume_weekly` |
| "What sizes dominate — 48×40 standard or custom?" | `pallet_interest` (partial) |
| "Who's servicing the {city} area for you now?" | `current_supplier`, `supplier_satisfaction` |
| "How often are you shipping internationally and to which countries?" | `export_exposure` |

### 2. Problem (1-2 questions, surface pain)
| Question | Column(s) |
|----------|-----------|
| "What breaks most often on pallet day — missed delivery, wrong spec, damaged cores?" | `pain_primary` |
| "When you've rejected a load, what was the reason?" | `pain_primary`, `supplier_satisfaction` |

### 3. Implication (1-2 questions, cost the pain)
| Question | Column(s) |
|----------|-----------|
| "Last time you ran short, what did that cost you in overtime or stockouts?" | `pain_implication` |
| "When a customer rejected for pallet reasons, what's the downstream bill?" | `pain_implication` |

### 4. Need-Payoff (1 question, let prospect sell themselves)
| Question | Column(s) |
|----------|-----------|
| "If I could guarantee surge capacity within 150 miles of {city}, what would that be worth to your team?" | `budget_signal` (soft) |

### 5. BANT closers
| Question | Column(s) |
|----------|-----------|
| "Who besides you is involved when you make a pallet decision?" | `authority_level` |
| "Rough ballpark — what does pallet spend look like monthly?" (listen, don't name numbers first) | `monthly_spend_band` |
| "Is this on a current rolling order, or are you under contract through a specific date?" | `contract_status` |
| "What's pushing this now — a specific trigger or more of a when-the-time-is-right?" | `need_type`, `timing` |

## Output — script format

```markdown
---
lead_id: L-000042
skill: discovery-call
created_at: 2026-04-18T14:05Z
contact: Dana Reyes (Ops Manager, Acme Brewing, Asheville NC)
known_facts:
  - current_supplier: (unknown — ask)
  - est_volume_weekly: hypothesized 150 from research
  - vertical: vertical_brewery
---

# Discovery — Acme Brewing (Asheville)

## Situation (5 min)
1. "Dana, thanks for the time. Before I say anything — walk me through how pallets flow at the Asheville brewery, inbound through outbound."
   → listens, takes notes → update `primary_lane`, `pallet_interest`
2. "Roughly how many a week?"
   → `est_volume_weekly`
3. "Who's servicing you now? Happy with them?"
   → `current_supplier`, `supplier_satisfaction`
4. "Any export shipments — kegs to Canada, cans overseas?"
   → `export_exposure`

## Problem (3 min)
5. "What breaks most often on pallet day?"
   → `pain_primary`
6. "When was the last time a load went sideways because of the pallet?"
   → (narrative for `pain_implication` later)

## Implication (3 min)
7. "Last time that happened, what did it cost you — overtime, stockouts, rejected load?"
   → `pain_implication`
8. "If your primary supplier went out for two weeks, what would you do?"
   → (tests urgency + switching cost)

## Need-Payoff (2 min)
9. "If we guaranteed 48-hour turnaround on recycled GMA within 150 miles of Asheville — plus stenciled for the taproom loads — what's that worth?"
   → listens for value language; `budget_signal`

## BANT closers (2 min)
10. "Who else is involved when you pick a pallet supplier?"
    → `authority_level`
11. "Rough monthly spend — I'm trying to match you to the right rhythm."
    → `monthly_spend_band`
12. "Are you under contract through a specific date?"
    → `contract_status`
13. "What's pushing this conversation now?"
    → `need_type`, `timing`

## After-call: back-fill via crm-write
- `/crm-write update L-000042 primary_lane=<answer> current_supplier=<answer> ...`
- If BANT clears: `/crm-write transition L-000042 qualified` → triggers `/handoff-packet`
```

## Guardrails

- Skill produces the script only; it does not make the call.
- Every question maps to at least one `qual_*` column.
- If a required column is already populated in the lead record, skip the question or phrase as confirmation.
- Total call target: 15-20 minutes. Cut questions if fewer needed.
