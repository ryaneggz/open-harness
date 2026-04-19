# 02 — Pallet Product Domain

> Scope: product knowledge for the SDR agent selling on behalf of a North Carolina–headquartered pallet company with a full mix (new wood, recycled, heat-treated export, custom, plastic, specialty). This spec defines WHAT is sold, the STANDARDS that govern it, the ECONOMICS that drive purchase decisions, and the BUYER CONCERNS that surface in discovery calls. Methodology, NC geography, outbound execution, and agent architecture live in sibling specs.

---

## 1. Context

A pallet is a flat transport structure that supports goods while being lifted by a forklift, pallet jack, front loader, or erect crane. It is the atomic unit of unit-load logistics. A pallet buyer is almost never buying "a pallet" in isolation — they are buying a **repeatable specification** that has to:

1. Fit their product (footprint, stack height, weight)
2. Fit their handling equipment (fork entry, rack bay, conveyor)
3. Fit their trading partners' requirements (retailer mandates, export regs, pool systems)
4. Fit their cost / loss tolerance (single-use vs. multi-trip, own vs. rent)

The SDR's credibility depends on recognizing which of those four is the dominant driver in any given conversation and speaking the vocabulary fluently. A prospect who says "48 by 40, heat treated, GMA spec, about a truckload a week, block construction preferred, we've been burned on moisture content" is not tolerant of a rep who asks "so how many pallets do you use?"

The North American industry produces roughly 500M+ new pallets per year (NWPCA estimates; ~90% wood, ~10% plastic / other), dominated by the **48×40 GMA** footprint which represents ~30–35% of all new wood pallets in the US. Recycled / remanufactured units are roughly **2x** the annual volume of new units on a trip basis because they cycle multiple times. Price and availability move with softwood lumber indices (SPF / SYP), which shifted violently in 2020–2022 and remain a live negotiation topic.

---

## 2. Product Taxonomy — Frozen `pallet_interest` Enum

This enum is consumed verbatim by the sales-methodology spec (qualification field `pallet_interest`) and by the cold-email / discovery skills. Values are pipe-delimited inside a CSV cell when a lead expresses multiple interests (e.g. `gma_48x40_recycled|heat_treated_ispm15`).

**Enum values (12, frozen, stable ordering):**

| # | Enum key | Full name | Primary material | Typical use | Rough price band (USD, 48×40 equivalent, 2024–2026) | Lead time (typical) |
|---|----------|-----------|------------------|-------------|-----------------------------------------------------|---------------------|
| 1 | `gma_48x40_new` | GMA 48×40 New Wood | SPF / SYP / mixed hardwood | Grocery, CPG, retail DC inbound, food & beverage | $14 – $24 new A-grade; premium spec $20 – $30 | 1–3 weeks |
| 2 | `gma_48x40_recycled` | GMA 48×40 Recycled (#1 / #2 / Combo) | Reclaimed wood | Internal handling, secondary distribution, lower-value freight | $6 – $12 (#1 ≈ $10 – $12; #2 ≈ $6 – $9) | 1–7 days (regionally) |
| 3 | `heat_treated_ispm15` | Heat-Treated / ISPM-15 Export | Wood (any species) treated to core 56 °C / 30 min | International export (any country enforcing ISPM-15) | +$1 – $3 surcharge over equivalent untreated pallet | 1–2 weeks (kiln-capacity bound) |
| 4 | `block_pallet` | Block Pallet (4-way entry) | Wood (block) or plastic | Automated warehouses, rack storage, pool systems (CHEP / PECO-equivalent spec) | $18 – $35 new wood block; plastic block $55 – $120 | 2–4 weeks |
| 5 | `stringer_pallet` | Stringer Pallet (non-GMA or custom sizes) | Wood | General freight, custom footprints, 40×48 export variants, 36×36, 42×42 | $12 – $22 depending on size & grade | 1–3 weeks |
| 6 | `custom_wood` | Custom-Dimensioned Wood Pallet | Wood (spec by customer) | OEM machinery, furniture, cabinetry, HVAC, engine blocks, military crating | Quoted per spec; commonly $18 – $80+ | 2–6 weeks (first run), 1–2 weeks reorder |
| 7 | `plastic_pallet` | Plastic Pallet (HDPE / PP) | HDPE or PP, injection-molded or structural foam | Pharma, food GMP / FDA, cleanroom, closed-loop, cold chain, automated lines | $40 – $220 (nestable ~$40 – $90; rackable $90 – $220) | 4–12 weeks (tooled) |
| 8 | `cp_series` | CP Series (CP1–CP9 Chemical Industry) | Wood, specific block / stringer specs per CP number | Chemical and petrochemical export (APME / CEFIC spec) | $18 – $35; CP3 / CP9 often premium | 2–4 weeks |
| 9 | `presswood_molded` | Presswood / Molded Wood-Fiber | Compressed wood fiber + resin (Inka, Litco-style) | Export (ISPM-15 exempt), nestable air / ocean freight, one-way loads | $8 – $18; weight savings often offsets | 2–6 weeks |
| 10 | `eur_epal` | EUR / EPAL (1200×800 mm) | Wood, block construction, licensed EPAL mark | Europe-bound freight, EU retailer mandates, intercontinental pool | $15 – $28 new EPAL-licensed; used $8 – $14 | 2–4 weeks |
| 11 | `pallet_recycling_service` | Pallet Recycling / Take-Back Service | n/a (service) | Large-volume receivers with surplus cores (DCs, retailers, 3PLs) | Often net-zero or pays the customer per core; sorting / hauling fees may apply | Recurring route (weekly / bi-weekly) |
| 12 | `pallet_management_program` | Onsite Pallet Management / Full Pool Program | n/a (service) | High-volume shippers wanting turnkey supply + sort + repair + return | Unit-priced contract; commonly $9 – $16 per trip equivalent | 30–90 day implementation |

**Notes on the enum:**

- Composite pallets (paper-corrugated, metal-reinforced, nestable corrugated) are intentionally NOT a separate enum value. They are rare, almost always sold as a sub-variant of `plastic_pallet` or `presswood_molded`, and an SDR can probe them with `custom_wood` plus discovery questions.
- `cp_series` covers nine distinct European chemical-industry specs (CP1 through CP9). An SDR should recognize CP3 (1140×1140 square) and CP9 (1140×1140 9-block) most often in North American export conversations.
- `pallet_recycling_service` and `pallet_management_program` are service lines, included in the enum because prospects frequently interest-signal on these before any product purchase is scoped.
- Values are snake_case, CSV / JSON-safe, ≤30 chars, stable. Downstream specs may cite these verbatim.

---

## 3. Standards & Compliance

### 3.1 NWPCA — National Wooden Pallet & Container Association

The US industry body. Publishes the **Uniform Standard for Wood Pallets** (revised 2014, republished periodically), which defines: component dimensions, fastener counts and placement, grade definitions, MIBANT (Montreal Impact Bending Angle Nail Test) fastener strength, and the Pallet Design System (PDS) engineering software used by designers.

SDR-relevant touchpoints:

- **PDS modeling** — if a prospect has a custom load (heavy, unbalanced, dense machinery), an NWPCA-member manufacturer can run PDS to engineer a spec. Strong differentiator vs. a generic sawmill-attached pallet cutter.
- **Pallet Safe Handling Council** — NWPCA initiative, useful credibility marker in safety-sensitive industries (grocery, pharma).
- **CPR — Certified Pallet Recycler** accreditation exists but is less standardized than ISPM-15 certification; still worth citing when talking to sustainability-focused buyers.

### 3.2 GMA 48×40 Specification

**GMA** (Grocery Manufacturers Association, now merged into the Consumer Brands Association) published the de-facto grocery-industry pallet spec. It is a voluntary standard but functions as a universal "speak-the-language" baseline.

Canonical GMA 48×40 specification:

- **Dimensions:** 48" length × 40" width (1219 × 1016 mm)
- **Height:** 6¼" (~159 mm) — critical for rack bay utilization
- **Deckboards:** 7 top, 5 bottom (7-up / 5-down); top may be chamfered for pallet-jack entry
- **Stringers:** 3 stringers (notched for partial 4-way fork entry)
- **Fasteners:** helically-threaded or stiff-stock shank nails, MIBANT-qualified
- **Weight:** 40 – 50 lb typical (hardwood or mixed ~50 – 60 lb; SPF softwood ~33 – 40 lb)
- **Static load:** 2,800 – 3,000+ lb (stacked / floor)
- **Dynamic load:** typically ~2,500 lb (in-motion, forklift)
- **Rack load:** typically 1,500 – 2,800 lb depending on deckboard spec and rack orientation

Grade conventions for recycled GMA 48×40:

- **#1 / A-grade / "Premium Recycled":** all stringers intact (no companion-block repairs), ≥5 top deckboards, no protruding fasteners, clean. Visually close to new.
- **#2 / B-grade / "Standard Recycled":** one repaired stringer allowed (companion block or plated), missing deckboards acceptable up to spec, visible wear.
- **Combo / #1.5:** informal middle grade — some shippers accept, others don't. Do not assume combo is universally welcome.

### 3.3 ISPM-15 (IPPC) — Export Compliance

**ISPM-15** (International Standards for Phytosanitary Measures No. 15) is the UN International Plant Protection Convention standard that governs wood packaging material (WPM) crossing international borders. Non-compliant wood packaging is routinely rejected or fumigated at port — at the shipper's cost — causing ocean-freight delays of days to weeks.

Key facts an SDR must have at fingertips:

- **Applies to:** solid wood packaging ≥ 6 mm thick used in international trade. Pallets, crates, dunnage, skids. DOES NOT apply to: plywood, OSB, particleboard, presswood / molded fiber, heat-treated engineered wood — these are "manufactured wood" and ISPM-15 exempt.
- **Treatments:**
  - **HT — Heat Treatment:** wood core temperature ≥ 56 °C for ≥ 30 minutes. By far the dominant method in North America.
  - **KD-HT — Kiln-Dried & Heat Treated:** HT applied during the drying cycle; same 56 / 30 core requirement plus moisture reduction. Not a separate treatment code on the stamp — stamped `HT`, but marketed as KD-HT.
  - **MB — Methyl Bromide Fumigation:** banned or restricted in the EU, Canada, Australia, and increasingly used only when HT is infeasible (e.g., oversized dunnage). **Red flag for EU-bound freight.**
  - **DH — Dielectric Heating:** added to ISPM-15 in 2018, microwave-based treatment, ≥60 °C for 1 minute through the full cross-section. Niche.
  - **SF — Sulfuryl Fluoride:** added in 2018, limited adoption.
- **IPPC Mark:** burnt or stenciled on at least two opposite sides, contains:
  - IPPC logo (wheat symbol)
  - Two-letter ISO country code (e.g. `US`)
  - Unique state + facility number (e.g. `NC-1234`)
  - Treatment code (`HT`, `MB`, `DH`, `SF`)
- **Certification bodies in the US:** ALSC (American Lumber Standards Committee) accredits inspection agencies (NHLA, TP, NELMA, SPIB, WWPA, etc.). A prospect can and should verify a supplier's ALSC-accredited stamp.
- **Penalties:** CBP may refuse entry, re-export the container at the shipper's cost, or destroy the wood packaging. USDA APHIS enforces inbound US; other countries' agriculture ministries enforce their own imports.

### 3.4 CP Series (Chemical Industry Pallets)

Published by APME / CEFIC (European Association of Plastics Manufacturers / European Chemical Industry Council). Nine specs, numbered CP1 – CP9, each dictating exact dimensions, block / stringer pattern, deckboard count, and fastener schedule. Commonly requested when shipping resins, polymers, and specialty chemicals.

Key CP specs (most-requested in North America):

- **CP1:** 1200×1000 mm, block, 4-way — the most common CP spec
- **CP3:** 1140×1140 mm, block, 4-way — square, chemical drums / IBCs
- **CP9:** 1140×1140 mm, block, 9-block — square, heavier-duty

A manufacturer offering `cp_series` is signaling capability to European chemical exporters and tolling customers. Differentiator vs. commodity 48×40 shops.

### 3.5 EPAL / EUR Pallet

European standard, 1200×800 mm block pallet. License-restricted: only EPAL-licensed manufacturers can produce or repair pallets bearing the EPAL / EUR mark. A small number of EPAL-licensed producers exist in the US. A prospect shipping to European retailers (Aldi, Lidl, Carrefour) or participating in the EPAL pool will specifically ask for EPAL-licensed EUR pallets — a used EUR pallet without EPAL re-licensing is effectively a generic 1200×800 block pallet.

---

## 4. Construction Types

### 4.1 Block vs. Stringer

| Attribute | Stringer pallet | Block pallet |
|-----------|-----------------|--------------|
| Support | 3 long boards (stringers) running length | 9 blocks (3×3) connecting top / bottom deckboards |
| Fork entry | 2-way full, 4-way partial (notched) | True 4-way |
| Automation fit | Weaker — stringer-side fork entry is partial | Stronger — conveyors, AS / RS, automated forks prefer block |
| Cost | Lower (less material, less labor) | Higher (9 blocks + more boards) |
| Typical use | US general freight, GMA 48×40 standard | Pool systems (CHEP, PECO), European (EPAL), automated warehouses |
| Repair | Companion block or plated repair on broken stringer | Block replacement |

**SDR shorthand:** if a prospect mentions AS / RS, conveyors, automated put-away, or CHEP-spec, they likely need block. If they're a traditional DC running standard forklifts, stringer is fine.

### 4.2 Fork Entry

- **2-way:** forks enter from two opposite sides only (typically the short 40" sides on a stringer pallet).
- **Partial 4-way:** notched stringers allow pallet-jack entry from the 48" side but limited forklift access.
- **True 4-way:** forks and jacks enter from all four sides. Block pallets are always true 4-way.

### 4.3 Deck Configuration

- **Single-face:** deckboards on top only. Common in one-way / export scenarios.
- **Double-face non-reversible:** top and bottom deckboards, but top has more for load support.
- **Double-face reversible:** symmetric top / bottom, usable either way up. Rarer, higher cost.
- **Flush vs. overhang:** deckboards flush with stringer ends (flush) or extending past (wing / overhang) — wing pallets support forward-rack loads but can catch on racking.

---

## 5. Pool / Rental vs. Purchase — Economics

### 5.1 Pool / Rental Model (CHEP, PECO, iGPS)

Large third-party operators rent pooled pallets: they own the inventory, the shipper pays per-trip, and the pool operator manages pickup, sort, and repair across a network. CHEP's blue pallets and PECO's red pallets are iconic in US grocery. iGPS runs a pooled plastic program.

**Economics (approximate, 2024–2026):**

- Per-trip fee: commonly $6 – $12 depending on lane and program
- Daily / dwell fee: may accrue if a pallet sits at receiver longer than grace period
- Lost pallet fee: $60 – $150+ per unit
- Issue fee / transfer fee: negotiated
- Total landed cost for a 10-trip pallet: often $60 – $120 all-in via pool

**Buyer motivations:**
- No capital tied up in pallet inventory
- Predictable quality (pool operator maintains to spec)
- Retailer-mandated in some cases (Costco, Kroger, Walmart in some lanes)

**Buyer pain points (SDR leverage):**
- Dwell fees surprise at month-end
- Lost-pallet fees balloon when receivers don't return
- Core availability during peak (fall / holiday) forces emergency buys
- "Whitewood exit" — many mid-market shippers actively search for alternatives to escape pool fees

### 5.2 Purchase Model ("Whitewood")

Buyer owns pallets outright. Uses them one-way (single trip, often to retailer DC) or multi-trip (closed-loop, in-house). Pays freight to dispose or arranges recycling.

**Economics:**

- New GMA 48×40: $14 – $24 (see enum table)
- Recycled GMA 48×40: $6 – $12
- Disposal or recycling: often revenue-positive if buyer partners with a recycler who pays per core

**Buyer motivations:**
- Lowest unit cost when pallets are essentially expendable (one-way export, landfill-bound)
- No dwell fees, no lost-pallet fees, no per-trip accounting
- Supply-chain control (own timing, own quality, own grade)

**Buyer pain points (SDR leverage):**
- Lumber price volatility hits new-pallet pricing directly
- Quality variance across recycled suppliers
- Internal tracking of returnable whitewood is usually ad-hoc

### 5.3 Hybrid / Managed Programs

A full-service pallet company can offer:

- **Buy-back / take-back:** pay the receiver per core, resell as recycled #1 / #2
- **Onsite sort-and-repair:** station at the customer's DC, sort inbound cores, repair, re-issue
- **Pool-equivalent internal programs:** whitewood-owned but managed like a pool

These sit behind `pallet_recycling_service` and `pallet_management_program` in the enum.

### 5.4 Unit Economics to Memorize

- New GMA 48×40 delivered: ~$18 blended (SE US, mid-2026, softwood)
- Recycled #1 GMA 48×40 delivered: ~$10 blended
- Recycled #2 GMA 48×40 delivered: ~$7 blended
- Repair cost per pallet: ~$2 – $4 depending on damage
- Heat treatment surcharge: ~$1 – $3 per pallet
- Trucking recovery / transfer cost per pallet in mixed load: ~$0.50 – $1.50

These numbers move with lumber indices. The SDR should ALWAYS qualify "at current lumber pricing" and never quote specific numbers without deferring to inside sales or the quote team.

---

## 6. Freight & Truckload Math

The SDR must be able to do this math live on a call.

### 6.1 Pallets Per 53' Dry Van Trailer

- **53' trailer internal length:** ~630" (~52'6")
- **53' trailer internal width:** ~100 – 102"
- **53' trailer internal height:** ~110" (varies)

**GMA 48×40 pallets, floor-loaded, single-stack:**

- **Pinwheeled (alternating 48" and 40" along length):** 30 pallets per trailer (2-wide)
- **Straight (48" along length):** 26 floor positions (13 rows × 2)
- **Turned (40" along length):** 30 floor positions (15 rows × 2)

**The canonical answer: 30 pallets floor-loaded per 53' trailer, or 60 double-stacked when height and weight allow.**

**Weight ceiling:** 53' dry van gross tolerance is typically ~45,000 lb of payload (after tractor / trailer tare). At 50 lb / pallet × 60 stacked = 3,000 lb in pallets alone, with ~42,000 lb of product budget remaining — most loads cube out or weigh out at 26–30 positions long before 60.

### 6.2 48' Trailer

- 24 pallets straight, 28 pinwheeled — still used by older fleets and regional LTL.

### 6.3 Ocean Container

- **40' standard:** ~21 GMA 48×40 pallets single-stacked on floor (spec varies with container cube loss)
- **40' high-cube:** allows double-stack in many cases, doubling to 40–42 positions
- **20' standard:** ~10 – 11 GMA 48×40 positions

### 6.4 Implication for SDR Pitch

"If you're filling a 53' van, you're moving 30 pallets — at recycled #1 pricing, that's $300 in pallet cost riding on ~$1,500 of freight. A 10% pallet price swing is $30 on a $1,500 lane. But a quality problem that ruins one skid is $500 in product. That's why we sort to grade — not just price."

---

## 7. Buyer Pain Points by Vertical

### 7.1 Third-Party Logistics (3PL) / Distribution Center

- **Core availability during peak:** fall / holiday surge strands shippers without pallets; secondary market spikes 20–40%
- **Sort labor cost:** inbound cores arrive mixed-grade, require labor to sort and stage
- **Dwell / demurrage on pool pallets:** CHEP / PECO fees compound when receivers hold
- **Dock congestion:** pallet supplier delivery windows that miss dock schedules waste labor
- **Retailer compliance fines:** Walmart OTIF, Amazon CHEP-spec, Kroger block-only — non-compliance is expensive

### 7.2 Manufacturing (OEM, Industrial, Furniture)

- **Custom spec reliability:** a furniture OEM with unique 58×48 spec needs a supplier who won't drift dimensions
- **Lead time on first-run custom:** tooling, cut, dry, assemble, inspect — can stretch 4–6 weeks
- **Moisture content:** wood >19% moisture causes mold, product staining, and freight rejections — KD-HT (kiln-dried) solves
- **Weight on packaging:** machined goods often hit trailer weight limit; pallet weight matters (hardwood ~50 lb vs. SPF ~35 lb)
- **Fastener protrusion / splinters:** automotive, medical, and aerospace reject visible damage

### 7.3 Brewery / Beverage

- **Cold / wet environments:** pallets absorb moisture in cold storage, gain weight, warp
- **Keg and case weight:** full kegs (~160 lb each × 4 = 640 lb / pallet) approach dynamic load limit — spec matters
- **Recyclability / ESG:** craft segment cares publicly about sustainability
- **Returnable pool programs:** beer industry uses returnable pools extensively (CHEP, iGPS plastic)
- **Retailer block-pallet mandates:** Costco, Kroger, some large grocers

### 7.4 Agriculture / Food / Produce

- **Food safety (FSMA, FDA):** bare-wood contact is scrutinized; cleanroom or plastic in some pharma-adjacent produce
- **Export compliance:** anything leaving the country needs an ISPM-15 HT stamp
- **Moisture and contamination:** recycled wood with visible staining or odor is rejected
- **Seasonal demand:** harvest windows create short spikes — supply continuity is critical
- **Cold chain:** freeze / thaw cycles degrade wood; plastic often preferred

### 7.5 Export / Ocean Freight

- **ISPM-15 noncompliance = container refusal:** the single most expensive mistake
- **IPPC mark legibility:** faded stamps get rejected at some ports even if treatment is valid
- **MB restrictions:** EU, Canada, Australia, Mexico — HT only
- **Core thickness:** engineered wood (plywood, OSB) is ISPM-15 exempt; some shippers switch to engineered for simplicity
- **Weight optimization:** ocean freight is often weight- and cube-sensitive; presswood / molded saves weight on air freight
- **Presswood nestable savings:** ~4x pallets per shipping unit when nesting empty — massive inbound-empty savings
- **One-way economics:** no return, so lowest acceptable cost dominates

---

## 8. Metrics to Capture in Discovery (by Vertical)

These feed the `discovery-call` skill and the MEDDIC-style qualification in the sales-methodology spec. The SDR should leave discovery with concrete numbers, not vague "a lot."

### 8.1 Universal (every discovery call)

- Current pallet spec(s) in use — dimensions, grade, treatment
- Weekly / monthly volume (**units per week** is the industry unit)
- Single source or multi-source today? Who are current suppliers?
- Pool vs. whitewood vs. hybrid?
- Any retailer or partner mandates (block-only, CHEP-only, EPAL, etc.)?
- Export portion of volume?
- Decision maker(s): procurement, operations, logistics, plant manager?
- Current contract: month-to-month, annual, quarterly?
- Any active pain — shortage, quality rejection, price swing, retailer fine?

### 8.2 3PL / DC Specific

- Inbound pallet volume per week (cores received)
- Outbound pallet volume per week (cores shipped)
- Sort labor hours per week dedicated to pallets
- Pool dwell / lost-pallet fees in last 12 months
- Number of receivers requiring block pallets
- Peak-season volume multiplier (2x? 3x?)

### 8.3 Manufacturing Specific

- Pallet spec — standard or custom?
- Moisture tolerance requirement
- Load weight per pallet (critical for PDS engineering)
- Storage environment (outdoor? climate-controlled? cold?)
- Fastener tolerance (visible nails acceptable?)
- First-run qty, annual qty, reorder cadence

### 8.4 Brewery / Beverage Specific

- Cases or kegs per pallet (typical configurations)
- Block or stringer required by retailer?
- Cold-storage or cooler dwell time?
- ESG / sustainability mandate in place?
- Returnable pool participation?

### 8.5 Agriculture / Food Specific

- FDA / FSMA compliance requirements
- Cold chain percentage
- Export percentage (requires ISPM-15)
- Produce-touch exposure — bare-wood concerns?
- Peak harvest window volumes

### 8.6 Export Specific

- Destination countries (EU = no MB; always HT)
- ISPM-15 stamp needed? Current supplier ALSC-accredited?
- Ocean or air freight mix?
- One-way or returnable?
- Presswood / molded interest for nestable weight savings?

---

## 9. Objection Bank

Every objection has a factual rebuttal grounded in a standard, a number, or a logistic reality. No sales fluff.

### 9.1 "We already have a supplier."

**Rebuttal:** Most pallet buyers are already multi-sourced whether they know it or not — regional supply is thin enough that a single supplier rarely covers peak. Ask if they've had a stockout or emergency buy in the last 12 months. If yes, you're applying for the backup slot, not the primary. If no, ask about lumber-index exposure — a single supplier is single-threaded on price risk.

### 9.2 "Your price is higher than what I pay now."

**Rebuttal:** Unit price is one of six cost lines in total pallet cost: unit price, freight, dwell / loss (if pool), rework / repair, retailer fines from bad pallets, and labor to handle exceptions. A $2 price premium on a #1 recycled pallet vs. #2 saves labor on inbound sort and eliminates most retailer rejection events. The question is total landed cost per *delivered good pallet*, not sticker.

### 9.3 "Just send me your cheapest pallet."

**Rebuttal:** "Cheapest" without spec risks a downstream rejection — the last-mile receiver (Walmart, Costco, Kroger) has grade requirements. A #2 combo that fails audit at a DC is a multi-hundred-dollar chargeback. Match the pallet grade to the receiver's audit standard; we can usually mix grades by lane.

### 9.4 "Recycled pallets are unreliable."

**Rebuttal:** #1 recycled is graded to NWPCA premium standards — structurally identical to new, cosmetically used. If prior experience was with #2 or combo grade, that's a spec mismatch, not a recycled-category problem. We can spec #1 only and back it with our ALSC-accredited facility.

### 9.5 "We use CHEP / PECO / iGPS — we don't need whitewood."

**Rebuttal:** Most CHEP / PECO shippers still have a whitewood line for one-way shipments or small lanes where pool fees don't pencil. Also common: peak-season augmentation when the pool can't supply. We don't displace the pool — we cover the gaps where pool economics break down. Ask about their pool invoice line items: dwell, lost, transfer, issue — that's the wedge.

### 9.6 "We don't export, so ISPM-15 doesn't matter."

**Rebuttal:** Acknowledged — for domestic-only, HT is an unnecessary surcharge. Worth confirming: no direct export, no indirect export through a distributor, no Mexico lanes (Mexico enforces ISPM-15). If any of those surface later, you know the HT pathway rather than scrambling against a deadline.

### 9.7 "Plastic is more expensive, we can't justify it."

**Rebuttal:** Unit cost yes ($40 – $220 vs. $10 – $20 wood), but plastic is typically a 20–100-trip asset in a closed loop. Per-trip amortized cost drops below wood within 5–10 cycles. Plastic pencils in: closed-loop automotive, pharma GMP, cold chain, any ISPM-15 lane (wood treatment recurring vs. plastic exempt), and automated lines where dimension consistency drives throughput. If freight is genuinely one-way and open-loop, wood wins and we'd tell you so.

### 9.8 "We don't have a forklift, just a pallet jack."

**Rebuttal:** Then 4-way entry matters. A partial 4-way stringer pallet (notched) supports a jack from the 48" side. A true 4-way block pallet is ideal. Either way, steer away from 2-way-only stringer configs for that site.

### 9.9 "I don't have time for a call right now."

**Rebuttal:** Fair — the ask is typically 10–15 minutes to understand spec and volume. If easier, a ten-line email summary (current pallet spec, weekly volume, any peak-season pain) gets a quoted range same day without a call.

### 9.10 "Lumber prices are too volatile, I'm waiting."

**Rebuttal:** SPF and SYP indices have been range-bound since 2023 after the 2020–2022 spike. Contract pricing with a lumber-index pass-through clause is standard — lock margin without locking lumber. Waiting exposes you to the next event, not insulated from it.

### 9.11 "We're happy — nothing's broken."

**Rebuttal:** Not asking to displace primary supply. Three questions: (1) have you had a stockout in 12 months? (2) do you have a second source for peak? (3) what's your escalation path if your supplier has a fire, strike, or transport disruption? If all three are solid, not a fit right now. If any is soft, we're the insurance policy.

### 9.12 "Send me a quote and I'll look at it."

**Rebuttal:** Quote-without-spec is where pallet deals die — we'd send a number for something that doesn't match your actual need and you'd compare apples to oranges with an incumbent. Fastest path to a real quote is three data points: dimensions, weekly volume, treatment / grade. Two minutes on the phone or by email.

### 9.13 "Procurement handles this, not me."

**Rebuttal:** Understood — appreciate the pointer. Can you share who owns the pallet category and whether they run RFPs annually, quarterly, or ad-hoc? Also useful: is there a current-supplier contract end date you're aware of?

### 9.14 "Your lead time is too long."

**Rebuttal:** Lead time splits by product: recycled GMA 48×40 is typically 1–7 days regionally, new GMA 48×40 is 1–3 weeks, custom is 2–6 weeks on first run and 1–2 weeks on reorder. If current pain is a same-week need, recycled is the path. If it's an engineered custom spec, the first-run investment unlocks fast reorders later.

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **ALSC** | American Lumber Standards Committee — accredits ISPM-15 inspection agencies in the US |
| **APHIS** | Animal and Plant Health Inspection Service (USDA) — enforces ISPM-15 on imports |
| **AS / RS** | Automated Storage and Retrieval System — automated warehouse requiring tight pallet dimensional tolerance |
| **Block pallet** | Pallet using 9 blocks (3×3) instead of stringers; true 4-way entry |
| **CHEP** | Commonwealth Handling Equipment Pool — largest blue-pallet rental pool globally |
| **Combo** | Informal recycled grade between #1 and #2 |
| **Companion block** | Repair technique: wood block nailed alongside a broken stringer |
| **Core** | Used pallet entering the recycling stream |
| **CP1 – CP9** | European chemical industry pallet specs (APME / CEFIC) |
| **CPR** | Certified Pallet Recycler (NWPCA credential) |
| **Dunnage** | Loose wood used to brace or separate loads in shipping |
| **EPAL** | European Pallet Association — licenses EUR pallet production / repair |
| **EUR pallet** | 1200×800 mm European block pallet |
| **GMA** | Grocery Manufacturers Association — publishes de-facto 48×40 spec |
| **HT** | Heat Treated (ISPM-15 code): 56 °C core for 30 minutes |
| **iGPS** | Intelligent Global Pooling Systems — plastic pooled pallet operator |
| **IPPC** | International Plant Protection Convention — governing body for ISPM-15 |
| **ISPM-15** | International Standards for Phytosanitary Measures No. 15 — governs wood packaging in international trade |
| **KD-HT** | Kiln-Dried & Heat Treated — moisture reduction plus ISPM-15 compliance (stamped `HT`) |
| **MB** | Methyl Bromide (ISPM-15 code) — fumigation, restricted in EU / Canada / Australia |
| **MIBANT** | Montreal Impact Bending Angle Nail Test — NWPCA fastener strength test |
| **NWPCA** | National Wooden Pallet & Container Association — US industry body |
| **One-way pallet** | Pallet built for single-trip disposal rather than multi-trip cycling |
| **PDS** | Pallet Design System — NWPCA engineering software for load modeling |
| **PECO** | Peco Pallet — second-largest US pool operator (red pallets) |
| **Pinwheel** | Loading pattern alternating 48" and 40" pallet orientations to maximize trailer cube |
| **Pool pallet** | Rented pallet in a managed cycling system (CHEP, PECO, iGPS) |
| **Presswood / molded** | Compressed wood-fiber pallet, ISPM-15 exempt, nestable |
| **Rackable** | Pallet rated for unsupported span in pallet racking (vs. floor / stack only) |
| **Recycled #1 / #2** | Grade of remanufactured pallet — #1 is premium, #2 is standard |
| **Stringer** | Long board running length of pallet, supporting deckboards |
| **SPF / SYP** | Spruce-Pine-Fir / Southern Yellow Pine — dominant softwood lumber species for pallets |
| **Whitewood** | Non-pool, non-branded pallet owned outright by the shipper |
| **Wing / overhang** | Deckboards extending past the stringer end |

---

## 11. Open Questions

Questions that remain for the agent's operating config — NOT for this spec to close, but flagged for the orchestrator or downstream skills to resolve.

1. **Pricing quote authority.** Does the SDR agent quote prices directly, or always hand off to inside sales? (Recommended: never quote; always defer to sales — lumber volatility and spec nuance make wrong quotes a legal / commercial risk.)
2. **Product-mix confirmation with the real client.** Enum assumes full mix. If the NC company doesn't actually produce plastic or CP series, those enum values become aspirational-only and the SDR must qualify before promising.
3. **ALSC certification status of the client's treatment facility.** SDR should know the stamp number and accredited inspection agency before first outbound.
4. **Pool-exit positioning stance.** Does the client aggressively pitch whitewood as a pool alternative, or play alongside CHEP / PECO? Positioning depends on client strategy.
5. **Minimum order quantity / geographic delivery radius.** MOQs and how far outside NC the client ships will shape ICP in the NC / GTM spec.
6. **Sustainability positioning.** If the client has a recycling-rate number (e.g. "95% of cores returned to circulation"), that becomes a pitch asset — SDR needs the number.
7. **Export lane inventory.** Does the client handle Mexico lanes, EU-bound, or Asia-bound? ISPM-15 compliance is table stakes but pitch nuance changes per destination.
8. **Lumber pass-through contract language.** If the client offers contracted index-linked pricing, that's a differentiator for the objection bank. If not, it's a risk topic.
9. **Real-world lead-time commitments.** Table values are industry-typical. Client-specific lead times may be tighter or looser and must be validated before the SDR uses them in conversation.
10. **Pallet management / onsite program capability.** If the client does not actually run onsite sort stations, enum value 12 (`pallet_management_program`) becomes a future-state offering rather than a sellable service today.

---

*End of spec. Enum values in Section 2 are frozen. Downstream specs (sales-methodology, outbound-execution, agent-architecture) may cite these keys verbatim without re-derivation.*
