---
title: SDR Playbook — BANT-Hybrid + SPIN + 8-Touch Cadence
source: condensed from .claude/specs/sdr/01-sales-methodology.md + 04-outbound-execution.md
ingested: 2026-04-18
tags: [sdr, methodology, bant, spin, cadence, outreach]
---

# SDR Playbook

Reference for the sdr-pallet agent. Canonical specs: `01-sales-methodology.md` (513 lines) + `04-outbound-execution.md` (770 lines).

## Methodology: BANT-Hybrid

**BANT** as qualification skeleton (Budget, Authority, Need, Timing) — maps to CSV enums, one-decision-maker deals, enumerable in ≤4 discovery questions. **SPIN** as questioning technique inside `discovery-call/` — Situation, Problem, Implication, Need-Payoff. **Challenger** grafted onto outbound only — one teaching insight per cold sequence.

Rejected: pure MEDDIC (designed for $100k+ / 4+ stakeholders; null columns on 85%+ rows), pure BANT (no switching-intent), pure SPIN (no stage semantics), pure Challenger (wrong for qualification calls), MEDDPICC / GPCT variants (vocab overhead for same coverage), custom ("just ask about volume") (field sprawl).

## The 8 Stages

```
new → researched → contacted → engaged → qualified → quoted → closed_won
                                                           ↘ closed_lost
```

| Stage | Entry | Exit | Duration |
|-------|-------|------|----------|
| `new` | Row created (import / referral / inbound / manual) | `company`, `state`, `source` populated; de-duped | 0-1 day |
| `researched` | `drafts/<id>/research.md` exists; `vertical`, `employee_count_band`, `contact_*` populated | `fit_score ≥ 40` AND `state ∈ {NC,SC,VA,GA,TN}` AND `contact_email_status ∈ {valid, risky}` | 1-3 days |
| `contacted` | First outbound touch sent; `last_touch_date` stamped; `touches_count ≥ 1` | Non-autoresponder reply OR `touches_count ≥ 8` no-reply (→ closed_lost / no_reply_exhausted) | 3-21 days |
| `engaged` | Reply received (non opt-out / non bounce); discovery scheduled or substantive questions asked | ≥3 of 4 BANT dimensions non-`unknown` AND `pain_primary ≠ unknown` | 2-14 days |
| `qualified` | **BANT cleared** (see below); `fit_score ≥ 60`; all 4 BANT dimensions non-`unknown` | Handoff packet complete → owner quotes | 1-7 days |
| `quoted` | Owner-delivered quote acknowledged; `pallet_interest` + `est_volume_weekly` locked | PO (→ closed_won) OR loss signal (→ closed_lost) OR 30d silence (→ closed_lost / ghosted_post_quote) | 5-30 days |
| `closed_won` | PO or signed agreement | TERMINAL | — |
| `closed_lost` | `dq_reason` populated | TERMINAL (except reactivatable: `timing_not_now`, `contract_locked`, `no_reply_exhausted`, `ghosted_post_quote`) | — |

## BANT-Cleared Gate (engaged → qualified)

ALL four must clear. 3-of-4 = not qualified.

| Dimension | Cleared means |
|-----------|---------------|
| **Budget** | `budget_signal ∈ {implied, confirmed}` AND `monthly_spend_band ≠ unknown` |
| **Authority** | `authority_level ∈ {influencer, decision_maker}` — `user` alone insufficient; `gatekeeper` never qualifies |
| **Need** | `need_type ≠ unknown` AND `pain_primary ≠ unknown` AND `pain_primary ≠ no_stated_pain` |
| **Timing** | `timing ∈ {now, within_30d, 30_90d}` — `90_180d` and `no_timeline` do NOT clear |

## Disqualifiers — Hard (immediate closed_lost)

| Trigger | dq_reason |
|---------|-----------|
| `state ∉ {NC,SC,VA,GA,TN}` + no owner override | `territory_out_of_bounds` |
| `est_volume_weekly < 50` AND not `one_time` | `volume_below_floor` |
| Company is a pallet mfr, recycler, or pooler | `competitor` |
| Pharma cleanroom / FDA II+ with no plastic-pallet fit | `wood_incompatible` |
| Unsubscribe / "remove me" / LinkedIn block / C&D | `opt_out` |
| `contact_email_status = bounced` with no alt | `undeliverable` |
| Profanity / legal threat / bad-faith reply | `hostile` |
| `contract_status = multi_year` + end date >12 mo | `contract_locked` |

## Scoring — `fit_score` (int 0-100)

Deterministic, computed by `crm-write` on every mutation.

| Component | Weight | Notes |
|-----------|--------|-------|
| Vertical fit | 25 | ICP match |
| Territory proximity | 15 | NC full, adjacent high, outer SE medium |
| Size/volume proxy | 20 | `employee_count_band` + `est_volume_weekly` when known |
| BANT completeness | 25 | 4 dims × 6.25; `unknown` = 0 |
| Engagement signal | 15 | touches with replies, meeting accepted, quote requested |
| Soft-signal penalties | –30 max | No website (–10), `contact_email_status=risky` (–5), small shop in 3PL/mfr (–15), `vertical=other` (–10) |

Tiers: A (80-100) priority cadence; B (60-79) standard; C (40-59) low-touch email-only; D (0-39) do-not-contact.

## 8-Touch Cadence (Spec 04)

Day offsets from T1 send (T+0). Weekdays only; push weekend/holiday to next business day. No touches before 08:00 or after 17:00 prospect-local (ET).

| Touch | Day | Channel | Goal | Length cap |
|-------|-----|---------|------|------------|
| 1 | T+0 | Email | Intro + one specific prospect fact + one soft ask | 120 words |
| 2 | T+3 | Email | New angle (different value prop or vertical hook); bump thread | 80 words |
| 3 | T+6 | LinkedIn connect | No pitch; mutual geography / vertical only | 300 chars |
| 4 | T+9 | Email | Proof-point / comparable NC customer (anonymized OK) | 100 words |
| 5 | T+13 | Phone | One call, one VM if no pickup; ≤25s VM | 25s VM |
| 6 | T+15 | Email | Pattern interrupt (2-line "still worth a look?") | 40 words |
| 7 | T+19 | LinkedIn message | Only if connection accepted; one-line relevance | 200 chars |
| 8 | T+21 | Email (break-up) | Clean close; "assuming not a fit" + easy revive | 60 words |
| — | T+111 | Re-engage | 90-day cooldown ends; new trigger required | — |

Any non-autoresponder reply stops the cadence; reply-handling playbook takes over.

## Email Anatomy — Gateable Rules (25 named gates in spec 04 § 5)

Subject:
- `G_SUBJ_LEN` — ≤ 60 chars
- `G_SUBJ_WORDS` — ≤ 9 words
- `G_SUBJ_NO_ALLCAPS` — no word >3 chars ALLCAPS (allow-list: GMA, ISPM, NWPCA, NC/SC/VA/GA/TN, 3PL, USDA, FDA)
- `G_SUBJ_NO_EXCLAIM` / `G_SUBJ_NO_EMOJI` / `G_SUBJ_NO_REBRACKET` — no `!`, emoji, or fake `RE:`/`FWD:`
- `G_SUBJ_NO_PRICING_WORD` — banned: `free`, `discount`, `$`, `cheap`, `save`, `urgent`, `act now`
- `G_SUBJ_HAS_SPECIFIC` — must contain company, city, or vertical-specific token

Opener:
- `G_OPENER_NO_COMPLIMENT` — no "hope this finds you well" / "hope you're doing well" / "trust this email finds you"
- `G_OPENER_NO_I_WE_START` — first word ≠ `I` / `We` / `Our`
- `G_OPENER_HAS_FACT` — ≥1 prospect-fact token
- `G_OPENER_MAX_2_SENT` / `G_OPENER_MAX_35_WORDS`

Body:
- `G_BODY_LEN` — touch-specific (120 / 80 / 100 / 40 / 60 words)
- `G_BODY_ONE_ASK` — exactly 1 `?` / CTA sentence
- `G_BODY_NO_BANNED_PHRASE` — ~40 spam triggers + ~70 corpspeak entries (see registry)
- `G_BODY_PERSONALIZATION_TOKENS ≥ 2` — {company}, {city}, {vertical_term}, {trigger_event}, etc.
- `G_BODY_PROSPECT_FACTS ≥ 1` — grounded in `research.md`

Signature + compliance:
- `G_SIG_HAS_NAME` / `G_SIG_HAS_COMPANY`
- `G_SIG_HAS_ADDRESS` — physical address (CAN-SPAM)
- `G_SIG_HAS_OPTOUT` — unsubscribe link or "reply STOP"

Deliverability:
- `G_COUNTRY_US_ONLY` — non-US send flagged
- `G_INBOX_CAP` — ≤ N per domain per day

## Personalization Hierarchy

- **Tier 1** (must-have): company name, city, vertical-specific term
- **Tier 2** (high-impact): recent trigger event (hiring, ribbon-cutting, new product, plant expansion, layoffs, acquisition), named current supplier, specific lane
- **Tier 3** (differentiator): custom volume estimate, specific pallet-type hypothesis, specific objection pre-empted

Facts must cite `drafts/<id>/research.md`. Never fabricate.

## Reply-Handling Playbook

| Reply type | Response | Stage action |
|------------|----------|--------------|
| `interested` | Book discovery; discovery-call skill drafts questions | → `engaged` |
| `not_now` | Acknowledge; calendar reactivation at stated date + 30 days | Pause; `dq_reason=timing_not_now` candidate |
| `wrong_person` | New cadence on referred contact with T+0 reset | Original row → `closed_lost` / `wrong_contact` |
| `decline` | Acknowledge briefly; add to DNC | → `closed_lost` / `declined` |
| `out_of_office` | Pause; resume T+N where N = 1 business day after OOO return | — |
| `hostile` / `C&D` | Immediate full stop + log | → `closed_lost` / `hostile` + DNC |
| `bounced` | Try alternate contact once; if fail | → `closed_lost` / `undeliverable` |

## Deliverability Fundamentals

- SPF + DKIM + DMARC + PTR — baseline
- Subdomain isolation (e.g., `send.yourdomain.com`) for outbound
- 3-week warmup schedule on new sending domain
- Bounce threshold < 2%; reply rate > 3% healthy
- Max N per inbox / per domain / per day
- No open tracking pixels, no attachments, no URL shorteners in v1

## Compliance (CAN-SPAM non-negotiables)

- Every message: physical address + clear unsubscribe path
- Honor opt-outs within 10 business days (we target 10 min via DNC CSV)
- No deceptive subject lines, no forged headers
- DNC CSV append-only; `outreach-gate` checks against it before pass

## Metrics & Targets

- **Primary**: qualified handoffs / week (SDR's only lagging indicator)
- **Leading**: reply-rate per vertical, meeting-booked-rate, positive-reply-rate
- **Gate-level**: gate PASS-rate; if < 90% investigate upstream
- **Deliverability**: bounce < 2%, spam complaint < 0.1%
