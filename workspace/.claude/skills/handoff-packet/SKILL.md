---
name: handoff-packet
description: |
  LLM-gated quality-gated output. Triggered when a lead reaches `qualified`.
  Compiles full lead record + research + discovery answers + BANT-cleared proof + recommended next step
  + price anchor RANGES (from Spec 02 — never a quote). Runs completeness gate: if FAIL, surfaces missing
  items; if PASS, notifies owner via Slack (if configured) and enables qualified → quoted transition.
  Agent does NOT generate pricing quotes. Owner handles quote + close.
  TRIGGER when: lead transitions to qualified; owner requests a handoff packet manually.
argument-hint: "lead_id=L-NNNNNN"
---

# handoff-packet — Closing the Loop on the SDR's Work

The SDR's final deliverable per lead. Quality here = close rate downstream.

## Contract

- **Type**: LLM-gated composition + deterministic completeness gate.
- **Input**: `lead_id=L-NNNNNN`.
- **Output**: Markdown file at `crm/drafts/<lead-id>/handoff.md`.
- **Side effects**:
  - Writes handoff file.
  - Runs completeness gate; sets frontmatter `packet_status: PASS | FAIL`.
  - On PASS: notifies owner via Slack (if configured); sets `next_action=handoff` on the lead.
  - On FAIL: surfaces the missing items; owner or agent fills gaps before retry.
  - Calls `/crm-write note <id> "handoff-packet <status>" ref=<path>`.
- **Determinism**: Composition is LLM; gate is deterministic.

## Packet Sections

### 1. Header
- Lead ID, company, contact, date qualified, handoff date, SDR (agent)

### 2. BANT Cleared Proof
All four dimensions with specific evidence. Pass/fail per spec 01 § 6.2.

| Dim | Value | Evidence (from history/discovery) |
|-----|-------|------------------------------------|
| Budget | `monthly_spend_band = 5k_25k`, `budget_signal = confirmed` | Discovery 4/17: "We run $10-15k monthly on pallets." |
| Authority | `decision_maker` | Dana Reyes, Ops Mgr — "I sign off up to $50k." |
| Need | `replace_incumbent` + `pain_primary = inconsistent_delivery` | "Current supplier short 3 of last 6 Mondays." |
| Timing | `within_30d` | "Need new arrangement before Memorial Day spike." |

### 3. Account Snapshot
Pulled from `research.md`:
- Company, locations, size, recent triggers
- Named competitors / incumbents

### 4. Product Fit
- `pallet_interest` (locked per spec 02 enum)
- `est_volume_weekly` (confirmed number, not hypothesis)
- `export_exposure`
- `primary_lane`

### 5. Price Anchor (RANGES ONLY — no quotes)
Per spec 02 price bands. Example:
- GMA 48×40 recycled #1: $10-$12/pallet (lumber-index-sensitive)
- Heat-treated ISPM-15 surcharge: +$1-$3
- **NOTE**: Final pricing is owner's call. Ranges are context, not offers.

### 6. Recommended Next Step
- Who the owner should call/email first
- Which offer to lead with (surge capacity, exchange-pool alt, custom spec, etc.)
- Which competitive angle to use
- Suggested cadence for follow-up after quote

### 7. Risks / Watch-Outs
- Anything that surfaced in discovery that could kill the deal
- Contract-lock end date (if any)
- Multi-stakeholder involvement
- Known competitive quotes in play

### 8. Full History
Link to `history.csv` rows for this lead (agent adds a bash one-liner to grep them).

## Completeness Gate (deterministic)

Packet `packet_status: PASS` requires ALL of:

| Check | Rule |
|-------|------|
| `GP_STAGE_IS_QUALIFIED` | Lead's current `stage = qualified` |
| `GP_BANT_CLEARED` | All 4 BANT fields non-`unknown`; `monthly_spend_band ≠ unknown`; authority ∈ {influencer, decision_maker}; timing ∈ {now, within_30d, 30_90d}; pain_primary ∉ {unknown, no_stated_pain} |
| `GP_FIT_SCORE` | `fit_score ≥ 60` |
| `GP_HAS_RESEARCH` | `crm/drafts/<id>/research.md` exists |
| `GP_HAS_DISCOVERY_NOTES` | At least one `event=call_script` entry in history.csv for this lead |
| `GP_PALLET_INTEREST_LOCKED` | `pallet_interest` non-empty, values from enum |
| `GP_VOLUME_LOCKED` | `est_volume_weekly` is integer ≥ 50 (or `one_time` + `need_type=one_time`) |
| `GP_CONTACT_COMPLETE` | `contact_name`, `contact_title`, `contact_email` present; `contact_email_status ∈ {valid, risky}` |
| `GP_NEXT_STEP_CONCRETE` | Recommended Next Step section names a specific action, not "follow up" |
| `GP_NO_UNVERIFIED` | No `[unverified]` markers in the packet |

If any check fails, packet FAIL. Emit list of failed checks.

## Slack Notification (if configured)

On PASS:
```
🎯 Handoff ready — L-000042 Acme Brewing (vertical_brewery, Asheville NC)
BANT cleared. fit_score 72. pallet_interest: gma_48x40_new|heat_treated_ispm15
est_volume_weekly: 150. timing: within_30d.
Recommended: call Dana Reyes this week; lead with Murphy expansion angle.
Packet: crm/drafts/L-000042/handoff.md
```

## Guardrails

- **Never include a pricing quote.** Only price RANGES from spec 02.
- **Never transition `qualified → quoted`.** That's owner's call.
- **Never auto-email the owner** — Slack only. Email is reserved for prospects, not for internal handoff, to keep the channel clean.
- **FAIL does not reset the lead's stage.** Lead stays `qualified`; packet revision happens in-place.
