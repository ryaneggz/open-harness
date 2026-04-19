# SDR Sales Methodology Spec

> Spec 01 of 5 — Sales methodology, qualification, stage definitions.
> Downstream contracts: stage names and field list become `workspace/crm/stages.json` + `workspace/crm/leads.csv` columns (see spec 05 — Agent Architecture).

---

## 1. Context

The SDR agent sources, qualifies, and hands off pallet-buying prospects for a North Carolina-headquartered pallet manufacturer/distributor. Territory: Southeast US (NC, SC, VA, GA, TN). ICP verticals: 3PLs, distribution centers, manufacturers, breweries, agriculture, furniture, textiles.

Commercial reality of the business:

- **Ticket size**: recurring spend typically $500 – $50,000/month per account. Single order can be $5k – $200k on new-build large runs.
- **Cycle length**: 2 – 8 weeks from first touch to PO for transactional accounts. 3 – 6 months for national 3PLs with procurement processes.
- **Decision makers**: ops manager / warehouse manager / procurement specialist / plant manager. *Rarely* C-suite. *Rarely* multi-stakeholder. Economic buyer and user buyer are often the same person.
- **Switching cost**: low-to-medium. Pallets are commodified — switching is a function of price, reliability, truck-fill, and ISPM-15 compliance, not emotional loyalty.
- **Competitive landscape**: incumbent supplier always exists. Prospects rarely have "no pallet supplier" — they have "a pallet supplier they tolerate".

These facts determine what methodology fits. A framework built for 9-month enterprise SaaS cycles will generate qualification theater. A framework built for single-call close will under-qualify the national 3PL accounts. We need something in between.

---

## 2. Methodology Decision

**Chosen**: **BANT-Hybrid** — BANT as the qualification skeleton, SPIN as the discovery questioning technique, one Challenger teaching insight per outbound sequence.

### 2.1 Rationale

BANT (Budget, Authority, Need, Timing) is the right skeleton because:

1. **Fits the decision structure.** Pallet buying is usually one decision maker with a recurring line-item budget. Budget/Authority collapse to a single person. BANT models this cleanly.
2. **Maps to CSV enums.** Each BANT dimension becomes a finite-enum column. `authority_level ∈ {user, influencer, decision_maker, unknown}` is tabular. MEDDIC's "Economic Buyer" vs. "Champion" distinction requires a person record and relationship graph — overkill here.
3. **SDR mandate is top-of-funnel.** The agent's job is to produce a qualified handoff, not to run a forecast. BANT is the minimum viable qualification; tighter frameworks belong to the closer, not the SDR.
4. **Enumerable in ≤ 4 discovery questions.** A single 15-minute call clears all four dimensions. MEDDIC's six-letter audit cannot.

SPIN (Situation, Problem, Implication, Need-payoff) is overlaid as the *questioning technique* inside the `discovery-call/` skill. SPIN's value is the Implication step — getting the prospect to articulate the cost of their current pallet pain before we quote. That step lifts close rates on transactional commodity sales materially. See §8 for the SPIN question bank.

Challenger is grafted onto **outbound only** (spec 04 owns execution). Each cold sequence carries one teaching insight: ISPM-15 fine exposure, block-pallet truck-fill math, heat-treated vs. kiln-dried misconception, recycled-pallet MRF sourcing risk. This earns the reply — BANT and SPIN do the qualification once the reply lands.

### 2.2 Alternatives Considered & Rejected

| Framework | Why rejected |
|-----------|--------------|
| **Pure MEDDIC** | Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion. Designed for $100k+ deals with 4+ stakeholders. Pallet deals have one buyer and no champion. MEDDIC's Decision Process mapping creates stages we will never use and CRM fields (`economic_buyer_name`, `champion_name`) that stay null on 85%+ of rows — dead schema. |
| **Pure BANT** | Too thin on the "why now" dimension for prospects with an incumbent. BANT passes a prospect who *could* buy; it does not distinguish the prospect who *will switch*. The SPIN Implication layer closes that gap. |
| **Pure SPIN** | A questioning technique, not a qualification framework. Produces great conversations but no closeable scoring. No stage semantics. |
| **Pure Challenger** | A sales-interaction style ("teach, tailor, take control"). Assumes the rep has a differentiated insight worth teaching on every deal. True for outbound hook, not true at qualification time — the ops manager on the call does not want to be taught, they want a quote. |
| **MEDDPICC / MEDDICC** | Same rejection as MEDDIC, one letter worse. Paper Process tracking is irrelevant at SDR stage. |
| **GPCT / GPCTBA/C&I** (HubSpot) | Goals-Plans-Challenges-Timeline plus Budget/Authority/Consequences/Implications. Fundamentally BANT-plus-SPIN with different packaging. We get the same coverage from BANT + SPIN Implication without the vocabulary overhead. |
| **Custom ("just ask about volume and pain")** | Produces field sprawl across reps/agents. We need a stable schema and consistent scoring, not vibes. |

### 2.3 What Each Layer Owns

| Layer | Scope | Where it lives |
|-------|-------|----------------|
| **BANT** | Qualification fields + disqualification triggers + fit score | `leads.csv` columns, `schema.json`, this spec |
| **SPIN** | Discovery question bank + sequencing on live calls | `discovery-call/SKILL.md` (spec 05) |
| **Challenger insight** | One teaching angle per outbound sequence | `cold-email/SKILL.md` (spec 04) |

Clean separation. Each layer has one owner.

---

## 3. Qualification Fields

All fields are enum, int, string, or ISO date. No free-form prose in `leads.csv` — narrative goes in `crm/drafts/<lead-id>/*.md` referenced via `notes_ref`.

Enum shorthand: `{a|b|c}` means fixed set, lowercase snake_case values. `unknown` is a valid value on every enum until discovery completes.

### 3.1 Identity Fields

| Name | Type | Source | Why it matters | Example |
|------|------|--------|----------------|---------|
| `id` | string | Auto (ULID or `co_<slug>_<N>`) | Primary key, referenced by `history.csv` and drafts | `co_acme_brewing_0001` |
| `company` | string | Public data / list import | Display + de-dup | `Acme Brewing Co` |
| `website` | string | Research | Required for lead-research skill | `acmebrewing.com` |
| `city` | string | Public data | Proximity scoring, logistics fit | `Asheville` |
| `state` | enum `{NC|SC|VA|GA|TN|other}` | Public data | Territory gate — `other` triggers review | `NC` |
| `vertical` | enum (see §3.2) | Research | ICP scoring, playbook selection | `brewery` |
| `employee_count_band` | enum `{1-10|11-50|51-200|201-1000|1000+|unknown}` | Public data | Size-to-volume proxy | `51-200` |
| `source` | enum `{inbound|referral|list_import|event|manual|reactivation}` | Agent/owner | Attribution + cadence rules | `list_import` |

### 3.2 `vertical` Enum

Locked values — ICP-aligned, one-to-one with playbook selection:

```
brewery | ag | furniture | textile | threepl | distribution_center |
manufacturer | food_bev | building_materials | other
```

`other` is the holding pen. If population of `other` exceeds 10% of the pipeline, the enum gets revisited. Vertical detail beyond this list belongs in `notes_ref`, not new columns.

### 3.3 Contact Fields

| Name | Type | Source | Why it matters | Example |
|------|------|--------|----------------|---------|
| `contact_name` | string | Research | Personalization + dedupe | `Dana Reyes` |
| `contact_title` | string | Research | Feeds `authority_level` inference | `Operations Manager` |
| `contact_email` | string | Research / verified | Primary channel | `dreyes@acmebrewing.com` |
| `contact_email_status` | enum `{unverified|valid|risky|invalid|bounced}` | Verifier tool (spec 04) | Deliverability gate | `valid` |
| `contact_phone` | string | Research | Fallback channel | `+1-828-555-0142` |
| `contact_linkedin` | string | Research | Multichannel sequencing (spec 04) | `linkedin.com/in/danareyes` |

### 3.4 BANT Qualification Fields

| Name | Type | Source | Why it matters | Example |
|------|------|--------|----------------|---------|
| `budget_signal` | enum `{none\|implied\|confirmed\|unknown}` | Discovery call | B in BANT — gates quote skill | `implied` |
| `monthly_spend_band` | enum `{under_1k\|1k_5k\|5k_25k\|25k_100k\|over_100k\|unknown}` | Discovery | Quantifies budget; maps to deal tier | `5k_25k` |
| `authority_level` | enum `{user\|influencer\|decision_maker\|gatekeeper\|unknown}` | Inferred from title + discovery | A in BANT — low authority requires multi-thread | `decision_maker` |
| `need_type` | enum `{replace_incumbent\|add_capacity\|new_site\|one_time\|compliance\|unknown}` | Discovery | N in BANT — shapes offer | `replace_incumbent` |
| `pain_primary` | enum (see §3.6) | Discovery (SPIN Problem) | Drives messaging angle | `inconsistent_delivery` |
| `pain_implication` | enum `{stockout\|overtime_labor\|damaged_goods\|customs_fine\|margin_squeeze\|none_stated\|unknown}` | Discovery (SPIN Implication) | Unlocks urgency scoring | `overtime_labor` |
| `timing` | enum `{now\|within_30d\|30_90d\|90_180d\|no_timeline\|unknown}` | Discovery | T in BANT — gates stage transition to `quoted` | `within_30d` |
| `contract_status` | enum `{no_contract\|rolling\|annual\|multi_year\|unknown}` | Discovery | Blocks `closed_won` if locked with incumbent | `rolling` |

### 3.5 Product / Fit Fields

> `pallet_interest` and `current_supplier` values are supplied by **spec 02 (Pallet Domain)** — see Open Questions §10.

| Name | Type | Source | Why it matters | Example |
|------|------|--------|----------------|---------|
| `pallet_interest` | pipe-delimited enum list | Discovery / research | SKU match; see spec 02 for locked values | `gma_48x40\|heat_treated` |
| `est_volume_weekly` | int (pallets/week) | Discovery | Capacity planning + deal tier | `450` |
| `current_supplier` | enum (see spec 02) | Research / discovery | Competitive positioning | `48forty` |
| `supplier_satisfaction` | enum `{happy\|neutral\|unhappy\|actively_shopping\|unknown}` | Discovery | Switching probability | `unhappy` |
| `primary_lane` | string `<origin>-<destination>` or `intraplant` | Discovery | Handoff to logistics; see spec 03 | `greensboro-atlanta` |
| `export_exposure` | enum `{none\|occasional\|regular\|primary\|unknown}` | Discovery | ISPM-15 / heat-treat upsell signal | `regular` |

### 3.6 `pain_primary` Enum

```
inconsistent_delivery | price_increase | quality_defects | pallet_shortage |
damaged_product | ispm15_compliance | sustainability_mandate |
supplier_consolidation | no_stated_pain | unknown
```

Closed set. New pain categories require a spec amendment — prevents drift.

### 3.7 Pipeline Fields

| Name | Type | Source | Why it matters | Example |
|------|------|--------|----------------|---------|
| `stage` | enum (see §4) | Agent | Pipeline position | `qualified` |
| `fit_score` | int 0–100 | Computed (§6) | Prioritization | `72` |
| `owner` | string | Config | Assignment | `sdr-pallet` |
| `next_action` | enum `{research\|email_1\|email_2\|email_3\|call\|linkedin\|wait_reply\|quote\|handoff\|reactivate\|none}` | Agent | Heartbeat work queue | `email_2` |
| `next_action_date` | ISO date | Agent | Heartbeat scheduling | `2026-04-22` |
| `last_touch_date` | ISO date | Agent | Stuck-lead detection | `2026-04-18` |
| `touches_count` | int | Agent (auto-incremented) | Cadence cap | `3` |
| `dq_reason` | enum (see §5.2) | Agent | Post-mortem analysis | `territory_out_of_bounds` |
| `notes_ref` | string (path) | Agent | Pointer to narrative drafts | `drafts/co_acme_brewing_0001/` |

---

## 4. Stage Definitions

Eight stages. Six working + two terminal. Names are final — they ARE the CRM schema.

```
new → researched → contacted → engaged → qualified → quoted → closed_won
                                                           ↘ closed_lost
```

### 4.1 Stage Table

| Stage | Entry Criteria | Exit Criteria | Typical Duration | Owner Action |
|-------|---------------|---------------|------------------|--------------|
| `new` | Row created via import, referral, inbound form, or manual | `company`, `state`, `source` populated; de-duped against existing rows | 0 – 1 day | `lead-research` queued |
| `researched` | One-pager exists at `drafts/<id>/research.md`; `vertical`, `employee_count_band`, `contact_name`, `contact_title`, `contact_email`, `contact_email_status ≠ bounced` populated | `fit_score ≥ 40` AND `state ∈ {NC,SC,VA,GA,TN}` AND `contact_email_status ∈ {valid,risky}` | 1 – 3 days | `cold-email` queued |
| `contacted` | First outbound touch sent (email, call, or LinkedIn); `last_touch_date` stamped; `touches_count ≥ 1` | Any non-autoresponder reply OR `touches_count ≥ 6` with no reply (→ `closed_lost`) | 3 – 21 days | Cadence execution |
| `engaged` | Reply received that is not an opt-out or bounce; `discovery-call` scheduled OR prospect asking substantive questions | ≥ 3 of 4 BANT dimensions populated to a non-`unknown` value AND `pain_primary ≠ unknown` | 2 – 14 days | `discovery-call` |
| `qualified` | BANT cleared (§6.2); `fit_score ≥ 60`; `need_type`, `timing`, `authority_level`, `monthly_spend_band` all non-`unknown` | Quote scoped OR prospect confirms intent to evaluate formally | 1 – 7 days | Handoff packet compiled (§7) |
| `quoted` | Written quote delivered and acknowledged; `pallet_interest` and `est_volume_weekly` locked | PO received (→ `closed_won`) OR explicit loss signal (→ `closed_lost`) OR 30 days of silence post-quote (→ `closed_lost`, `dq_reason=ghosted_post_quote`) | 5 – 30 days | Quote follow-up |
| `closed_won` | PO or signed agreement received | None — terminal | Terminal | Post-sale handoff |
| `closed_lost` | `dq_reason` populated from §5.2 enum | None — terminal unless `dq_reason ∈ reactivatable set` (§5.3), then row becomes eligible for reactivation to `new` | Terminal | Reason logged |

### 4.2 Stage Graph — Allowed Transitions

```
new          → researched, closed_lost
researched   → contacted, closed_lost
contacted    → engaged, closed_lost
engaged      → qualified, contacted, closed_lost
qualified    → quoted, closed_lost
quoted       → closed_won, closed_lost, qualified
closed_won   → (none)
closed_lost  → new   (reactivation only; see §5.3)
```

Notes:

- `engaged → contacted` allowed: prospect replied but asked to be followed up next quarter. Stage rewinds one step; `next_action_date` pushed out.
- `quoted → qualified` allowed: prospect requests re-scope (different pallet type, different volume). Quote invalidated; re-qualify the new ask.
- `closed_lost → new` is the **only** path out of a terminal, and **only** via the reactivation skill, which must change `source` to `reactivation` and clear `dq_reason` on the transition.

### 4.3 Forbidden Transitions (explicit)

| From → To | Why forbidden |
|-----------|---------------|
| `new → contacted` | Skips research — prevents spray-and-pray cold outreach |
| `new → engaged` | Skips touch logging — breaks attribution |
| `new → qualified` | Skips discovery entirely |
| `new → quoted` | Would quote an unresearched unqualified lead |
| `researched → engaged` | A "reply" without a logged touch is data corruption — fix upstream, do not bypass |
| `researched → qualified` | Same — no discovery means no qualification |
| `contacted → qualified` | Reply must be processed (→ `engaged`) before BANT can be asserted |
| `contacted → quoted` | Same |
| `engaged → quoted` | BANT must clear first |
| `qualified → closed_won` | Quote is a mandatory audit trail — every won deal has a `quoted` timestamp in `history.csv` |
| `quoted → contacted`, `quoted → engaged` | Re-scope routes to `qualified`, not earlier |
| `closed_won → *` | Terminal. New business against this company creates a new row with `source=inbound` or `referral` and a fresh `id`. |
| `closed_lost → any stage except new` | Reactivation is the only path, and it re-enters at `new` to force fresh research. |

Enforcement lives in the `crm-write/` skill (spec 05). Every stage mutation goes through a validator that reads `stages.json` and rejects any edge not listed in §4.2.

### 4.4 `stages.json` Contract Shape

The Agent Architecture spec will serialize §4.1 + §4.2 into `workspace/crm/stages.json`. Illustrative shape (final format owned by spec 05):

```json
{
  "stages": ["new", "researched", "contacted", "engaged",
             "qualified", "quoted", "closed_won", "closed_lost"],
  "terminal": ["closed_won", "closed_lost"],
  "transitions": {
    "new":         ["researched", "closed_lost"],
    "researched":  ["contacted", "closed_lost"],
    "contacted":   ["engaged", "closed_lost"],
    "engaged":     ["qualified", "contacted", "closed_lost"],
    "qualified":   ["quoted", "closed_lost"],
    "quoted":      ["closed_won", "closed_lost", "qualified"],
    "closed_won":  [],
    "closed_lost": ["new"]
  },
  "entry_requirements": {
    "researched":  ["contact_email", "vertical", "fit_score_computed"],
    "contacted":   ["last_touch_date", "touches_count>=1"],
    "engaged":     ["non_autoresponder_reply"],
    "qualified":   ["bant_fields_populated", "fit_score>=60"],
    "quoted":      ["pallet_interest", "est_volume_weekly", "quote_draft_ref"]
  }
}
```

---

## 5. Disqualification Rules

Fast close-lost matters more than graceful nurture at SDR stage. Time spent on wrong-fit prospects compounds against pipeline velocity.

### 5.1 Hard Disqualifiers — immediate `closed_lost`

Any one of these on a single row forces immediate transition to `closed_lost` regardless of current stage:

| Trigger | Detection | `dq_reason` |
|---------|-----------|-------------|
| Out of territory | `state ∉ {NC, SC, VA, GA, TN}` AND no explicit owner override | `territory_out_of_bounds` |
| Volume too small | `est_volume_weekly < 50` AND `need_type ≠ one_time` AND `monthly_spend_band ∈ {under_1k}` | `volume_below_floor` |
| Competitor / reseller | Company is itself a pallet manufacturer, recycler, or national pooler | `competitor` |
| Wood-hostile facility | Pharma clean-room, FDA Class II+, or policy-banned wood packaging with no plastic-pallet fit | `wood_incompatible` |
| Opt-out | Any CAN-SPAM unsubscribe, "remove me", LinkedIn block, cease-and-desist | `opt_out` |
| Hard bounce with no alt | `contact_email_status = bounced` AND no alternate contact findable after one research pass | `undeliverable` |
| Explicit hostile reply | Profanity, legal threat, or documented bad-faith reply | `hostile` |
| Contract-locked long-term | `contract_status = multi_year` AND end date > 12 months out AND no multi-location opportunity | `contract_locked` |

### 5.2 `dq_reason` Enum (closed_lost taxonomy)

Every `closed_lost` row MUST populate `dq_reason` from this closed set. Populate via automation when possible; otherwise the skill that moves the row to `closed_lost` prompts the agent for a value.

```
territory_out_of_bounds | volume_below_floor | competitor | wood_incompatible |
opt_out | undeliverable | hostile | contract_locked |
timing_not_now | lost_to_competitor | price | ghosted_post_quote |
no_reply_exhausted | bant_failed | other
```

Notes:

- `no_reply_exhausted` is the default for `touches_count >= 6` and zero reply across the full cadence.
- `bant_failed` means engaged and discovered but failed fit — distinct from `timing_not_now` which is fit-but-later.
- `other` requires a non-empty `notes_ref` justification. If `other` exceeds 10% of closed_lost rows, the enum gets revisited.

### 5.3 Reactivatable Set

Only these `dq_reason` values permit `closed_lost → new` reactivation:

```
timing_not_now        # by their stated timing + 30 days
contract_locked       # by contract end date - 90 days
no_reply_exhausted    # after 180 days minimum cool-down
ghosted_post_quote    # after 90 days minimum cool-down
```

All others (`territory_out_of_bounds`, `competitor`, `wood_incompatible`, `opt_out`, `hostile`, etc.) are **permanent**. Attempting to reactivate a permanent row must be rejected by the reactivation skill.

### 5.4 Soft Signals — not auto-DQ, but fit_score penalty

These reduce `fit_score` but do not force `closed_lost`:

- No website / no LinkedIn presence (–10)
- `contact_email_status = risky` (–5)
- `employee_count_band = 1-10` in a vertical where small shops rarely buy in volume (e.g. manufacturer, 3PL) (–15)
- Vertical = `other` (–10)

Soft signals accumulate; a prospect can wash out of `researched → contacted` purely on low fit score (<40 threshold per §4.1).

---

## 6. Scoring Model

`fit_score` is an integer 0–100 on every row. Computed deterministically by `crm-write/` on every mutation — not LLM-generated, not stored as a drifting estimate.

### 6.1 Component Weights

| Component | Weight | Notes |
|-----------|--------|-------|
| Vertical fit | 25 | ICP match from §3.2 |
| Territory proximity | 15 | NC = full, adjacent = high, outer SE = medium |
| Size/volume proxy | 20 | `employee_count_band` + `est_volume_weekly` when known |
| BANT completeness | 25 | 4 dimensions × 6.25 each, `unknown` = 0 |
| Engagement signal | 15 | touches with replies, meeting accepted, quote requested |
| Soft-signal penalties | –up to 30 | Sum of §5.4 deductions, floored at 0 |

Maximum before penalties: 100.

### 6.2 BANT-Cleared Threshold (gate for `engaged → qualified`)

BANT is "cleared" when:

| Dimension | Cleared means |
|-----------|---------------|
| Budget | `budget_signal ∈ {implied, confirmed}` AND `monthly_spend_band ≠ unknown` |
| Authority | `authority_level ∈ {influencer, decision_maker}` — `user` alone is insufficient, `gatekeeper` never qualifies |
| Need | `need_type ≠ unknown` AND `pain_primary ≠ unknown` AND `pain_primary ≠ no_stated_pain` |
| Timing | `timing ∈ {now, within_30d, 30_90d}` — `90_180d` and `no_timeline` do not clear |

All four must clear. 3-of-4 is not qualified — it is `engaged` with a follow-up to fill the gap.

### 6.3 Score Tiers

| Tier | Score | Action |
|------|-------|--------|
| **A** | 80 – 100 | Priority cadence; owner notified on qualification |
| **B** | 60 – 79 | Standard cadence; default qualification path |
| **C** | 40 – 59 | Low-touch cadence (email-only, no calls); passive nurture |
| **D** | 0 – 39 | Do not contact; auto-close to `closed_lost` with `dq_reason=bant_failed` if stuck > 7 days |

Tier determines cadence selection in spec 04.

### 6.4 Worked Example

Acme Brewing Co, Asheville NC, 140 employees, Operations Manager contact, brewery vertical, replied to email 2 with "we have stock-outs every other week":

- Vertical fit (brewery, ICP): +25
- Territory (NC, home state): +15
- Size (51–200 band, volume est 200/wk): +15
- BANT completeness (Need clear, Timing unknown, Authority inferred decision_maker from title, Budget unknown): 2 × 6.25 = +12.5 ≈ +13
- Engagement (replied to email 2): +10
- No soft-signal penalties: 0

`fit_score = 78` → Tier B. Advance to `engaged`, schedule discovery call to clear Budget + Timing. Do not quote until BANT clears.

---

## 7. Handoff Contract

The SDR's job terminates at `qualified → quoted` (quote drafted) or `qualified → handoff` (routed to an AE / the owner). The handoff packet is a deterministic artifact.

### 7.1 Trigger

Row transitions from `engaged → qualified` (BANT clears and `fit_score ≥ 60`).

### 7.2 Packet Contents — `drafts/<id>/handoff.md`

```markdown
# Handoff: <company> — <id>

## Snapshot
- Company: <company>
- Vertical: <vertical>
- Location: <city>, <state>
- Size: <employee_count_band>
- Fit Score: <fit_score>/100 (Tier <A|B|C|D>)

## Contact
- <contact_name>, <contact_title>
- <contact_email> (<contact_email_status>)
- <contact_phone>
- <contact_linkedin>

## BANT
- Budget: <budget_signal> / <monthly_spend_band>
- Authority: <authority_level>
- Need: <need_type> — <pain_primary> → <pain_implication>
- Timing: <timing>

## Product Fit
- Interest: <pallet_interest>
- Est. weekly volume: <est_volume_weekly>
- Current supplier: <current_supplier> (<supplier_satisfaction>)
- Lane: <primary_lane>
- Export exposure: <export_exposure>

## Touch History
<reverse-chron list of history.csv rows where lead_id=<id>>

## SDR Recommendation
- Recommended next step: <quote | discovery_followup | nurture>
- Suggested quote scope: <free text, ≤ 80 words>
- Risks / watch-outs: <contract_status, competitive dynamics, etc.>

## Links
- Research one-pager: drafts/<id>/research.md
- Discovery notes: drafts/<id>/discovery-<date>.md
- Cold-email drafts: drafts/<id>/email-*.md
```

### 7.3 Receiver Contract

The receiver (AE, owner, or the closer skill in a later spec) can rely on:

1. Every BANT field populated to a non-`unknown` value.
2. At least one logged discovery call referenced in the packet.
3. `fit_score ≥ 60` (A–B tier).
4. `history.csv` is consistent with the packet (no orphan touches, no missing stage transitions).

If any of these four are false, the handoff is rejected and the row returns to `engaged` with a note. SDR is responsible for a clean handoff — not the receiver for patching holes.

### 7.4 Post-Handoff Ownership

Once `qualified`, the row's `owner` may change from `sdr-pallet` to the assigned closer. The SDR retains read access but does not mutate the row except to log follow-up touches it is explicitly asked to run (e.g., the closer asks the SDR to send a nudge email — the touch logs but the stage is not advanced by the SDR).

---

## 8. SPIN Question Bank

Owned by `discovery-call/SKILL.md` (spec 05); included here because the fields the SPIN flow populates are defined above. Each question maps to fields in §3.

### 8.1 Situation (establish facts — populate §3.1/3.3/3.5)

- How many pallets does the facility move per week on average? → `est_volume_weekly`
- What pallet types are you running today — GMA 48×40, heat-treated, block, custom? → `pallet_interest`
- Who supplies you today, and how long have you been with them? → `current_supplier`, `contract_status`
- What lanes are these pallets running on — in-plant, outbound to customers, export? → `primary_lane`, `export_exposure`

### 8.2 Problem (surface pain — populate `pain_primary`)

- What is the most consistent headache with your current pallet supply?
- When pallets don't show up or show up broken, how often is that happening?
- Anything about the current setup that would make you take a call from a new supplier?

### 8.3 Implication (surface cost — populate `pain_implication`)

- When you have a pallet shortfall, what downstream happens — shipping delay, overtime, customer fine?
- What's the approximate cost of one stockout week?
- If export compliance slips on ISPM-15, what is the exposure?

### 8.4 Need-Payoff (surface value — populate `need_type`, `timing`, `budget_signal`)

- If a supplier could guarantee delivery in X hours at comparable pricing, would that solve the overtime problem? → `need_type`
- What is a realistic timeline for evaluating a new supplier? → `timing`
- For volume at your scale, what's a ballpark of what you are spending monthly today? → `monthly_spend_band`

Each branch populates exactly the fields it names. Discovery notes are written to `drafts/<id>/discovery-<date>.md` and reference the CSV field names explicitly, so the `crm-write/` skill can parse and commit deterministically.

---

## 9. Banned Anti-Patterns

Documented here because they are methodology violations, not cosmetic issues. Execution rules (tone, banned phrases in cold email copy) belong to spec 04.

1. **Qualification by gut feel** — every advancement past `engaged` must produce a field write. "I think this one's good" without populating BANT is rejected.
2. **Stage-skipping for speed** — §4.3 is exhaustive; the `crm-write/` validator enforces it. Attempting to work around it in drafts is considered a data-integrity breach.
3. **`unknown`-washing** — closing a lead to `closed_won` or `quoted` with BANT fields still `unknown`. If the deal closes with unknowns, the field gets back-filled from the quote/PO data before the transition commits.
4. **Creating ad-hoc enum values** — `vertical = craft_brewery`, `pain_primary = supply_chain_issues`. Every enum in this spec is closed. New values require a spec amendment and a `schema.json` update.
5. **Prose in CSV cells** — narrative belongs in `drafts/<id>/*.md`, referenced via `notes_ref`. Multi-paragraph text in `notes` columns breaks parsing and diff review.
6. **Scoring drift** — `fit_score` is a pure function of §6.1. No manual overrides. If the formula is wrong, fix §6.1.

---

## 10. Open Questions — Dependencies on Other Specs

| ID | Question | Depends on | Resolution deadline |
|----|----------|------------|---------------------|
| OQ-1 | Final enum values for `pallet_interest` (SKU taxonomy) | Spec 02 (Pallet Domain) | Before `schema.json` is frozen |
| OQ-2 | Final enum values for `current_supplier` (competitor list) | Spec 02 (Pallet Domain) | Before `schema.json` is frozen |
| OQ-3 | Should `state` enum expand beyond {NC,SC,VA,GA,TN} for edge adjacencies (AL, KY, WV, FL)? | Spec 03 (NC/GTM) | Before territory gating is implemented |
| OQ-4 | Exact monthly spend bands for brewery vs. 3PL vertical (different volume economics) | Spec 02 + Spec 03 | Before `monthly_spend_band` enum is frozen |
| OQ-5 | Is `quoted → closed_won` automated from inbound PO detection, or manual owner confirmation? | Spec 05 (Agent Architecture) | Before `crm-write/` validator ships |
| OQ-6 | Cadence step count per tier (impacts `touches_count >= 6` auto-close rule in §5.1) | Spec 04 (Outbound Execution) | Before auto-close rule is enforced |
| OQ-7 | Does the agent self-advance stages or does a human approve `engaged → qualified` and `quoted → closed_won`? | Spec 05 (Agent Architecture) | Before guardrails ship |
| OQ-8 | Reactivation cadence — is it the same cold sequence or a differentiated "we checked back in" sequence? | Spec 04 (Outbound Execution) | Before reactivation skill ships |
| OQ-9 | Should `fit_score` have an LLM-computed "soft" component (e.g. intent signals from research page) or stay purely deterministic? | Spec 05 (Agent Architecture) | Before `lead-research/` skill ships |
| OQ-10 | Does `handoff` terminate the SDR's ownership, or does it retain a long-tail nurture role post-handoff? | User / owner | Before MEMORY.md is seeded |

All ten are explicit hand-offs. This spec does not block on any of them — it ships the skeleton; each downstream spec fills in the enum bodies and orchestration rules that touch its surface.

---

## 11. Summary

- **Methodology**: BANT-Hybrid — BANT skeleton, SPIN questioning, Challenger insight in outbound only.
- **Stages** (8): `new`, `researched`, `contacted`, `engaged`, `qualified`, `quoted`, `closed_won`, `closed_lost`.
- **Qualification fields**: 30 columns, all enum/int/string/date, mapping to `leads.csv`.
- **Disqualification**: 8 hard triggers → immediate `closed_lost` with closed-set `dq_reason`.
- **Scoring**: deterministic 0–100 `fit_score` from 6 weighted components; BANT-cleared gate governs `engaged → qualified`.
- **Handoff**: generated `drafts/<id>/handoff.md` packet; 4-point receiver contract.
- **10 open questions** are explicit dependencies on specs 02–05.

Contract is frozen pending open-question resolution. Downstream specs may extend enums and add fields, but may not change stage names or remove qualification columns without amending this spec.
