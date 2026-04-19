---
title: NC / Southeast Logistics Context
source: condensed from .claude/specs/sdr/03-nc-gtm.md
ingested: 2026-04-18
tags: [nc, southeast, gtm, territory, verticals, competitors]
---

# NC / Southeast Logistics Context

Reference for the sdr-pallet agent. Canonical spec: `.claude/specs/sdr/03-nc-gtm.md` (641 lines).

## Two Physics Constraints That Define GTM

1. **Freight kills reach**. ~$0.010-$0.012 / pallet / loaded mile. On $6 recycled GMA, 300 mi one-way = 50%+ of product cost. Beyond ~300 mi, nationals win.
2. **24-48h order cadence**. Same-day / next-morning delivery requires round-trip-within-shift (~150-200 mi sweet spot).

These two define tiers A/B/C/D. Everything else flows from them.

## Territory Tiers (from Piedmont Crescent centroid = Charlotte / Greensboro / Raleigh triangle)

### Tier A — Core (~150 mi radius; same-day/next-day)
One truck / one driver / one day. Freight < $2/pallet. 60%+ of NC manufacturing employment.

**Cities**: Charlotte, Concord, Gastonia, Monroe, Salisbury, Statesville, Mooresville, Hickory, Winston-Salem, Greensboro, High Point, Burlington, Durham, Raleigh, Cary, Morrisville, Garner, Clayton, Smithfield, Sanford, Fayetteville, Wilson, Rocky Mount, Henderson.

### Tier B — Extended (150-300 mi; 2nd-day or weekly lanes)
LTL consolidation. Freight $2-$4/pallet — competitive on mid-spec + custom, loses on commodity recycled.

**Cities**:
- NC periphery: Asheville, Hendersonville, Boone, Wilmington, New Bern, Greenville NC, Jacksonville, Kinston, Goldsboro, Tar Heel, Lumberton, Elizabethtown
- Upstate SC: Spartanburg, Greenville SC, Greer, Anderson, Rock Hill, Fort Mill, Lancaster, Columbia
- Southside VA: Danville, South Boston, Martinsville, Lynchburg, Richmond, Petersburg
- North GA: Gainesville, Commerce, Braselton
- East TN: Johnson City, Kingsport, Bristol

### Tier C — Opportunistic (300-500 mi; specialty only)
Competitive only on HT ISPM-15 export, custom block, or staged-inventory contracts. Atlanta metro, Savannah (port), Charleston SC (port), Hampton Roads / Norfolk, Chattanooga, Knoxville, Roanoke VA, DC-metro fringe.

### Tier D — Disqualify
Beyond ~500 mi unless: (a) customer has NC-area DC we ship to, OR (b) deal is >5 TL/week with no competitor at destination matching.

## Corridors

| Corridor | Role |
|----------|------|
| **I-85** | Spine. Atlanta ↔ Greenville/Spartanburg ↔ Charlotte ↔ Greensboro ↔ Durham ↔ Richmond. 70% of tier-A/B prospects within 20 mi. Highest 3PL density in SE. |
| **I-40** | East-west. Wilmington ↔ Raleigh ↔ Triad ↔ Hickory ↔ Asheville ↔ Knoxville. Port to mountains; RTP pharma, furniture belt, Asheville breweries. |
| **I-77** | N-S through Charlotte to Statesville, Mt. Airy, VA. Lake Norman industrial, Iredell distribution, Huntersville warehousing. |
| **I-95** | Eastern spine. Fayetteville ↔ Smithfield ↔ Rocky Mount ↔ Richmond. Ag / food processing / Smithfield Foods lane. |
| **I-26** | Asheville ↔ Spartanburg ↔ Columbia ↔ Charleston. Upstate SC mfg + Charleston port. |
| **I-74 / US-220 / I-73** | Piedmont ↔ Sandhills; rising density with Toyota and FedEx Greensboro/Liberty expansion. |

## Port of Wilmington (ILM)

NC State Ports Authority. ~400k TEU/yr. Smaller than Savannah / Charleston / Norfolk but growing.

Pallet-GTM characteristics:
- **Export heat-treated demand** — Brunswick / New Hanover / Pender exporters routing to EU / UK / AU / NZ / CN / MX need ISPM-15.
- **Forest products lane** — SYP raw material moves through/near Wilmington.
- **Intermodal weakness** — no Class I double-stack; drayage only. NC-based exporters often truck to Charleston for scale. ILM sweet spot = mid-size exporters for whom drayage simplicity beats scale gap.

## Industrial Hubs — Named Anchors

**Charlotte Metro**: Lowe's HQ + regional DCs, Red Bull NA, Honeywell, Bojangles', Compass Group, Nucor, SPX, Sealed Air, Albemarle. Concord/Kannapolis: NASCAR + food & bev co-packers. Mooresville/Statesville: Lake Norman distribution, Lowe's DCs. Pallet reality: recycled GMA dominates, TL/wk volumes, contract > spot.

**Triad (Greensboro / Winston-Salem / High Point)**: FedEx Mid-Atlantic hub at PTI, HondaJet, HAECO Americas, Cone Health, Boom Supersonic, Mack Trucks, Syngenta, Procter & Gamble DC. Winston-Salem: Hanesbrands HQ, Reynolds American, Corning Life Sciences. High Point: furniture capital (Bassett, Kincaid, Bernhardt, Mitchell Gold); High Point Market (April + October) quadruples short-term demand.

**RTP (Durham / Morrisville / Holly Springs / Clayton / Sanford)**: Novo Nordisk Clayton, FUJIFILM, Grifols, biotech cluster. Rocky Mount: Pfizer Hospira. Wilson: Sandoz/Thermo Fisher. Burlington: LabCorp. Long-cycle (9-18 mo) but premium margins, ISO audits, no-nail standards for some.

**Hickory / Catawba Valley**: furniture + fiber-optic cable (CommScope). Lenoir / Morganton / Thomasville furniture cluster.

**Asheville / WNC**: Sierra Nevada Mills River, New Belgium, Oskar Blues, craft brewery cluster. Pratt & Whitney Asheville (aerospace). GE Aviation. Brand-facing pallet premium opportunity.

**Wilmington metro**: GE Hitachi Nuclear Energy, Corning Wilmington plant, PPD/Thermo Fisher Clinical Research, nCino. House of Raeford poultry, Mountaire, Fortron/Chemours.

**Eastern NC / I-95 corridor**: Smithfield Foods Tar Heel (largest pork plant globally, ~32,000 hogs/day — enormous pallet consumer). Butterball, Mountaire, Perdue, Case Farms, Campbell Soup Maxton, Coca-Cola Consolidated. Sweet potato packers in Nash/Wilson/Johnston/Sampson (NC = #1 US producer).

**Upstate SC (tier B, strategic)**: BMW Spartanburg (largest BMW plant globally — X3/X5/X6/X7), Michelin NA HQ, Milliken, Bosch, Boeing Charleston (787), Volvo Cars Ridgeville, Mercedes-Benz Vans N Charleston, ZF, Magna, Proterra, CU-ICAR. I-85 3PL explosion. Premium spec + HT ISPM-15 + custom block for automotive. Nationals (PalletOne, UFP) dominate on price; we win on responsiveness and custom runs.

## Vertical Prioritization (ranked 1-8 for ICP targeting)

1. **`vertical_3pl`** — 3PL / DCs. Why #1: highest recurring volume per account, tier-A concentrated, recycled-GMA fit, procurement-accessible. 500-5,000/wk. Titles: Director of Ops, Warehouse Mgr, Procurement Mgr, Category Mgr (Packaging). 80% recycled GMA, 15% new, 5% custom.
2. **`vertical_food_bev`** — Food & bev. Why #2: enormous NC footprint, steady non-cyclical demand, willing to pay for food-grade. 1,000-10,000/wk at majors (Smithfield Tar Heel extreme high end). Titles: Plant Mgr, Purchasing Mgr, Ops Mgr; corporate Director Packaging/Procurement. HT for export + plastic for wash-down + recycled GMA for dry.
3. **`vertical_furniture`** — Furniture belt. Why #3: defining NC industry. High Point/Hickory/Lenoir/Morganton/Thomasville. 100-1,500/wk, quadruples at High Point Market (April/Oct). Custom sizes + HT export. Titles: Shipping Mgr, Plant Mgr, Purchasing Mgr, VP Ops; owner/CFO for family-run.
4. **`vertical_brewery`** — Breweries / cideries / distilleries. Why #4: top-10 US craft state. Asheville/Raleigh/Charlotte/Wilmington. 50-800/wk per brewery; 1,000-3,000 at Sierra Nevada Mills River, New Belgium, Oskar Blues. Titles: Ops Mgr, Logistics Mgr, Packaging Mgr; larger-craft Procurement Mgr. Mostly new GMA or CP-spec, often CHEP/PECO-rented. Our openings: surge, stenciled custom, exchange-pool alternatives.
5. **`vertical_biotech_pharma`** — Biotech/pharma/med-device. Why #5: lower volume, premium margins, long contracts, RTP concentration. 50-800/wk per site; aggregated higher. Titles: Supply Chain Mgr, Packaging Engineer (technical gate), Procurement Mgr (PO writer). HT wood, cleanroom-compatible plastic, custom dims, strict supplier qualification. 9-18 mo cycle — prioritize but plan.
6. **`vertical_industrial_mfg`** — Heavy industrial / automotive / aerospace. Why #6: highest per-unit margin (HT ISPM-15 + custom block). Upstate SC (BMW, Michelin, Bosch, Boeing, Volvo) + NC (Honda Aircraft, Toyota Battery Liberty, GE Aviation, Pratt & Whitney Asheville). 200-2,000/wk at tier-1 plants. Titles: Materials Mgr, Logistics Mgr, Packaging Engineer, Supplier Quality; tier-1 OEMs Category Mgr/Strategic Sourcing.
7. **`vertical_agriculture`** — Ag / produce / nursery. Why #7: seasonally huge (Aug-Nov peaks), ~0 off-season. NC = #1 US sweet potato producer, major Christmas tree producer (Ashe/Alleghany/Watauga ~25% US supply), apples (Hendersonville). 200-3,000/wk in season. Titles: Packinghouse Mgr, Owner/Operator, Ops Mgr. HT for export, bin-boxes, short-turn rental/repair.
8. **`vertical_textile`** — Textiles / apparel / carpet / nonwovens. Why #8 (still on list): legacy + nonwovens growth (Fitesa, Berry Global, Magnera). 100-1,500/wk. Titles: Warehouse Mgr, Shipping Mgr, Purchasing Mgr. Recycled GMA dominates + HT for export.

## Out-of-Scope Verticals (no-prospect list)

Per spec — volume too low, buying process wrong, or commodity pressure unbeatable. Do not cold-prospect: single-site small retail, salon/spa supply, consumer e-commerce <10k/mo pallets, residential moving, sign/printing shops.

## Competitive Landscape

**National manufacturers**: PalletOne (largest US), 48forty Solutions, UFP Industries (LTV Pallet), Millwood, Kamps. Dominant on scale + spot price. We win on responsiveness, custom runs, regional service.

**Pooling (frenemy)**: CHEP, PECO, iGPS. Not a price war. Openings: (a) surge capacity when pool is short, (b) stenciled custom for brand-facing, (c) exchange-pool alternatives for audit-fee-squeezed customers.

**Regionals**: Carolina Pallet (Greensboro), Quality Pallet (Wilmington area), Dixie Pallet, Greenway Products & Services, Blue Ridge Pallet. Close competitors — win on spec discipline, lead-time reliability, engineering support (PDS).

**Brokers**: fragmented. Win on consistent spec + traceability.

**In-house recycling**: not a target unless overflow or remanufactured line we can sell into.

## Strategic Flags (2026)

- **Toyota Battery NC (Liberty/Randolph County)** — largest territorial demand accretion event of the decade. Plan cold approach Q3-Q4 2026.
- **Toyota + FedEx Greensboro / Liberty** — I-74/US-220/I-73 freight density rising.
- **High Point Market April 2026 + October 2026** — furniture-vertical spike; prep template variants.
