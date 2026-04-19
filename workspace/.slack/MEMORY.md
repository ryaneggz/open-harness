# MEMORY — sdr-pallet

Learned decisions, lessons, triage history. Append-only log of durable patterns; daily ephemera stays in `memory/YYYY-MM-DD.md`.

## Decisions & Preferences

- **Close ownership** (2026-04-18): SDR hands off at `qualified`; human owner handles `quoted → closed_won`. Agent never drafts quotes or pricing. Hard guardrail in SOUL.md #2.
- **File-CRM authoritative** (2026-04-18): `leads.csv` / `history.csv` / `schema.json` / `stages.json` are source of truth. No external CRM integration in v1.
- **Template-library-first** (2026-04-18): `cold-email/` reads from `crm/templates/` before drafting freehand. Missing templates surface as gaps for `template-write/`.
- **Territory scope** (2026-04-18): `{NC, SC, VA, GA, TN}` primary; `other` = opportunistic only. Disqualify beyond ~500 mi unless customer has NC-area DC or >5 TL/week.

## Objection Bank (seeded from spec 02 § 9)

Each objection → factual rebuttal grounded in standards, numbers, or logistic reality. Never price-war.

1. **"We're happy with our current supplier"** → "Understood. Most happy customers benchmark 2-3 times a year — worth a comparison at renewal?"
2. **"Your price is too high"** → Reframe to total landed cost: freight (~$0.011/pallet/mi), stockout risk, damage claims. Recycled GMA is lumber-index-sensitive; quote a rolling average, not spot.
3. **"We use CHEP/PECO"** → Not a price war. Openings: (a) surge capacity when the pool is short, (b) stenciled custom for brand-facing loads, (c) exchange-pool alternatives when audit fees squeeze.
4. **"Send me a quote"** (too fast) → Defer until `pallet_interest`, `est_volume_weekly`, `primary_lane`, `timing` known. "Happy to — I need your lane and volume first so the number means something."
5. **"We don't export"** → Confirm `export_exposure=none`. If they later mention any international shipment, reconsider.
6. **"Wood is not allowed in our facility"** → Pivot to `plastic_pallet` or `presswood_molded`. Don't force wood.
7. **"Your delivery was late last time"** (incumbent) → "We don't compete same-day against a local incumbent. We win on surge capacity when your regular can't."
8. **"We buy from a broker"** → Brokers are frenemies. Win on consistent spec + traceability. "Bad pallet through a broker = 3 parties to call; through us = 1."
9. **"Multi-year contract"** → `contract_status=multi_year`; reactivation calendar at `contract_end_date - 90d`.
10. **"In-house recycling"** → Not a fit unless overflow or remanufactured line we can sell into. Don't force.
11. **"Send literature"** → Polite DQ signal. "Quickest way: 10-minute call so I send relevant info, not a brochure." If pushback, `no_stated_pain`, nurture.
12. **"Email me in Q4"** → `timing_not_now`, not DQ. Calendar reactivation at stated date + 30 days.
13. **"Our volume is 20 pallets a month"** → If `est_volume_weekly < 50` and not `one_time`, `volume_below_floor` DQ. Refer to local broker politely.
14. **"We need IPPC-stamped for Mexico"** → `heat_treated_ispm15` fit signal. Confirm destination country and volume.

## Discovery Question Bank (seeded from spec 01 § 8 — SPIN overlay)

### Situation (establish facts)
- "Walk me through how pallets flow — inbound, outbound, internal?"
- "Roughly how many pallets a week at [city]?"
- "Sizes — 48×40 standard, or custom?"
- "How often shipping internationally, and to which countries?" (surfaces ISPM-15)

### Problem (surface pain)
- "What breaks most often — missed delivery, wrong spec, damaged cores?"
- "How often short on a Monday?"
- "When you've rejected a load, what was the reason?"

### Implication (cost the pain)
- "Last time you ran short, what did that cost in overtime or stockouts?"
- "When a customer rejected for pallet reasons, what's the downstream bill?"
- "If your primary supplier went out tomorrow for two weeks, what would you do?"

### Need-Payoff (let prospect sell themselves)
- "If I could guarantee surge capacity within 150 miles of [city], what's that worth?"
- "If we solved [specific pain], what changes for you?"

## Lane Notes (seeded from spec 03)

- **I-85**: spine. Atlanta ↔ Greenville/Spartanburg ↔ Charlotte ↔ Greensboro ↔ Durham ↔ Richmond. 70% of tier-A/B prospects within 20 mi.
- **I-40**: east-west. Wilmington ↔ RTP ↔ Triad ↔ Hickory ↔ Asheville ↔ Knoxville. RTP pharma + furniture belt + Asheville breweries.
- **I-95**: ag + food processing. Smithfield Foods Tar Heel is the extreme high end.
- **I-77**: N-S through Charlotte; Lake Norman distribution.
- **I-26**: Asheville ↔ Spartanburg ↔ Columbia ↔ Charleston. Upstate SC mfg + Charleston port.
- **Port of Wilmington**: ~400k TEU/yr. Drayage-only (no Class I double-stack). NC exporters often truck to Charleston for scale; ILM sweet spot is mid-size exporters for whom drayage simplicity outweighs scale gap.

## Triage History

_(empty — append-only, grown by `/issue-triage` or manual DQ notes)_

## Lessons Learned

_(empty — append-only, grown by `memory-distill` heartbeat)_
