# 03 — NC / Southeast Go-to-Market

> Expert spec — one of five parallel inputs for the `sdr-pallet` agent.
> Mandate: territory, industrial geography, vertical prioritization, ICP tiering,
> competitive landscape. Product taxonomy, sales methodology, outbound mechanics,
> and agent architecture live in sibling specs (01, 02, 04, 05).

## Context

The agent sells for a generic North Carolina-HQ'd pallet manufacturer / distributor
with a full product mix: new GMA 48x40, heat-treated ISPM-15 export, recycled
(A/B/#1/#2 grades), custom-cut, and plastic/composite resale. The business model
blends manufacturing, recycling, and brokered capacity.

Pallet GTM is dominated by two physics constraints that make this a regional —
not national — sales motion:

1. **Freight economics kill reach.** A 53' dry van holds ~500 GMA pallets
   (stacked 20-high, two stacks wide, 25 deep — ~500 units; block pallets or
   heat-treated stacks reduce this to 400-440). At roughly $2.50-$3.00 per
   loaded mile for SE dry-van capacity, delivered freight adds ~$0.01-$0.012
   per pallet per mile. On a $6 recycled GMA, a 300-mile one-way haul adds
   ~$3-$3.60 / pallet — 50%+ of product cost. Beyond ~300 miles the nationals
   win on scale and we cannot.
2. **Inventory is bulky and time-sensitive.** Customers routinely order on
   24-48h notice. Same-day / next-morning delivery requires a truck that can
   round-trip within a shift (~150-200 mile one-way sweet spot).

These two facts define the territory tiers below. Everything after flows from
them.

---

## Service Territory

### Tier A — Core (primary revenue, same-day/next-day delivery)

**Radius:** ~150 miles from a Charlotte-Greensboro-Raleigh centroid
(call it the "Piedmont Crescent"). This is the NC I-85 / I-40 spine plus
spokes on I-77 (north-south) and US-220 / I-73 / I-74.

**Rationale:** one truck, one driver, one day. Freight adds <$2/pallet.
Matches the gravity well of NC's industrial base — Charlotte metro, the
Triad (Greensboro / Winston-Salem / High Point), and the Research Triangle
(Raleigh / Durham / Cary / RTP) together hold >60% of NC manufacturing
employment and the bulk of SE distribution capacity.

**Cities in tier A:** Charlotte, Concord, Gastonia, Monroe, Salisbury,
Statesville, Mooresville, Hickory, Winston-Salem, Greensboro, High Point,
Burlington, Durham, Raleigh, Cary, Morrisville, Garner, Clayton, Smithfield,
Sanford, Fayetteville (southern edge), Wilson, Rocky Mount, Henderson.

### Tier B — Extended (2nd-day delivery, strong bid territory)

**Radius:** 150-300 miles from the Piedmont Crescent. Requires LTL
consolidation or scheduled weekly lanes. Freight adds $2-$4 / pallet —
competitive for mid-spec and custom, loses on straight commodity recycled.

**Cities in tier B:**
- **NC periphery:** Asheville, Hendersonville, Boone, Wilmington,
  New Bern, Greenville (NC), Jacksonville, Kinston, Goldsboro, Tar Heel,
  Lumberton, Elizabethtown.
- **Upstate SC:** Spartanburg, Greenville (SC), Greer, Anderson, Rock Hill,
  Fort Mill, Lancaster, Columbia.
- **Southside VA:** Danville, South Boston, Martinsville, Lynchburg,
  Richmond, Petersburg.
- **North GA:** Gainesville, Commerce, Braselton (I-85 corridor into Atlanta).
- **East TN:** Johnson City, Kingsport, Bristol (Tri-Cities).

### Tier C — Opportunistic (specialty / export / high-margin only)

**Radius:** 300-500 miles. Competitive only on heat-treated ISPM-15 for export,
custom block pallets, or large-volume contracts where we can stage inventory
at a customer or 3PL site. Freight makes straight recycled GMA unwinnable.

**Cities in tier C:** Atlanta metro, Savannah (port lane), Charleston SC
(port lane), Hampton Roads / Norfolk VA, Chattanooga, Knoxville, Roanoke VA,
Washington DC metro fringe.

### Tier D — Disqualify

Anything beyond ~500 miles of a Piedmont Crescent shipping point unless:
(a) the customer has an NC-area DC we ship to, OR (b) the deal is >5 full
truckloads / week of a product a competitor at destination cannot match.

---

## Industrial Geography (named hubs, corridors, port)

### Corridors

| Corridor | Role |
|----------|------|
| **I-85** | Spine. Atlanta - Greenville/Spartanburg - Charlotte - Greensboro - Durham - Richmond. ~70% of our tier-A/B prospects sit within 20 miles of I-85. Highest 3PL density in the Southeast. |
| **I-40** | East-west. Wilmington - Raleigh - Greensboro - Winston-Salem - Hickory - Asheville - Knoxville. Connects the port to the mountains; picks up RTP pharma, furniture belt, and Asheville breweries. |
| **I-77** | North-south through Charlotte to Statesville, Mt. Airy, and VA. Catches Lake Norman industrial, Iredell County distribution, and Huntersville / Cornelius warehousing. |
| **I-95** | Eastern spine. Fayetteville - Smithfield - Rocky Mount - Richmond. Ag / food processing / Smithfield Foods lane. |
| **I-26** | Asheville - Spartanburg - Columbia - Charleston. Key for Upstate SC manufacturing and Charleston port volume. |
| **I-74 / US-220 / I-73** | Secondary Piedmont - Sandhills connector; rising freight density as Toyota and FedEx expand Greensboro / Liberty sites. |

### Port of Wilmington (NC)

NC State Ports Authority facility. Smaller than Savannah / Charleston /
Norfolk but growing (container volume ~400k TEU/yr). Key characteristics for
pallet GTM:

- **Export heat-treated (ISPM-15) demand.** Any shipper routing containers
  through ILM for EU / UK / AU / NZ / CN / MX needs compliant wood packaging.
  Brunswick / New Hanover / Pender County exporters are prime targets.
- **Forest products lane.** Southern yellow pine (the raw material for
  new pallets) moves through and near Wilmington — relevant to our own
  supply economics but also to regional lumber buyers we cross-sell with.
- **Intermodal weakness.** ILM has no Class I rail double-stack; most
  container cargo moves by drayage. That favors ports at Norfolk and
  Charleston for large shippers — which is why NC-based exporters often
  truck to Charleston. Our Wilmington prospects are mid-size exporters for
  whom ILM's drayage and trucking simplicity outweighs the scale gap.

### Charlotte Metro (Mecklenburg + Union + Cabarrus + Gaston + Iredell + York SC)

- **Archetype:** 3PL and distribution capital of the Carolinas.
- **What's here:** Lowe's HQ + regional DCs, Red Bull NA HQ/DC, Honeywell,
  Bojangles', Compass Group, Nucor, SPX, Sealed Air, Albemarle.
  Concord / Kannapolis: NASCAR + food & bev co-packers. Mooresville /
  Statesville: Lake Norman distribution, Lowe's DCs, Kewaunee.
  Monroe: Turbomeca / Safran, ATI Allvac. Rock Hill / Fort Mill SC:
  Bowater, Schaeffler, 3D Systems, Continental Tire (in Sumter nearby),
  Sharonview / growing 3PL park.
- **Pallet reality:** recycled GMA 48x40 dominates. 3PL / DC volume
  measured in full truckloads / week. Contracts > spot. Procurement /
  supply-chain function exists and is reachable.

### The Triad — Greensboro / Winston-Salem / High Point

- **Archetype:** furniture belt (declining but present) + FedEx Mid-Atlantic
  hub + rapidly emerging EV / battery / aerospace hub.
- **What's here:**
  - Greensboro / PTI airport: FedEx Mid-Atlantic hub, Honda Aircraft (HondaJet),
    HAECO Americas (MRO), Cone Health, UPS freight heritage, Volvo Trucks
    (Dublin VA, ~100mi N), Boom Supersonic (Overture factory at PTI),
    Mack Trucks, Syngenta, Procter & Gamble (Browns Summit DC).
  - Winston-Salem: Hanesbrands HQ, Reynolds American, Corning Life Sciences,
    Herbalife, Pepsi Bottling Ventures.
  - High Point: furniture mfg + showroom district ("furniture capital of the
    world"), Bassett, Kincaid, Bernhardt (nearby Lenoir), custom upholstered
    makers, plus the biannual furniture market (massive demand spike).
  - Liberty / Randolph County: **Toyota Battery Manufacturing NC** (one of
    the largest EV battery plants in US, coming online) + supplier park.
    This is the biggest single pallet-volume accretion event in the
    territory this decade.
- **Pallet reality:** mix of new GMA (FedEx / Toyota / Honda spec), custom
  furniture-sized (High Point), heat-treated export (Hanesbrands, Volvo).

### Research Triangle — Raleigh / Durham / Cary / RTP

- **Archetype:** biotech + pharma + medical device + tech.
- **What's here:**
  - RTP / Durham: Merck (Durham vaccines), Pfizer (Sanford - clinical mfg),
    Eli Lilly (Concord / RTP fill-finish + Durham), BioMarin, GSK,
    FUJIFILM Diosynth Biotechnologies (large biologics CDMO), Seqirus /
    CSL (Holly Springs - flu vaccine), Novo Nordisk (Clayton - large
    diabetes API / fill-finish), Grifols (Clayton), Biogen, IQVIA,
    Parexel, LabCorp HQ (Burlington).
  - Raleigh / Cary: Martin Marietta, Red Hat, Lenovo NA, Pendo, ABB,
    SAS Institute.
  - Morrisville: pharmaceutical distribution, FUJIFILM, Syngenta (Vero Beach FL
    + RTP), Xerox.
- **Pallet reality:** premium spec. Heat-treated, custom, cleanroom-compatible
  (sometimes plastic), rigorous supplier qualification, long sales cycles
  (9-18 months), high LTV. Lower weekly volume per site (50-500/wk) but
  multi-site buyers exist (Novo Nordisk's Clayton campus alone will drive
  pallet demand comparable to a mid-size DC once fully online).

### Hickory / Catawba Valley

- **Archetype:** furniture + fiber optics.
- **What's here:** CommScope (HQ), Corning Optical Communications, Prysmian,
  GKN Driveline, Lenoir furniture (Broyhill legacy, Bernhardt), Case Farms
  poultry, Transportation Insight.
- **Pallet reality:** custom sizes for furniture, heat-treated for Corning /
  CommScope export, poultry-grade (wash-down, often plastic) at Case Farms.

### Asheville / Western NC

- **Archetype:** craft brewing cluster + specialty mfg.
- **What's here:**
  - **Breweries:** Sierra Nevada (Mills River - East Coast flagship, huge
    production), New Belgium (Asheville), Highland, Wicked Weed, Hi-Wire,
    Burial, Green Man, plus Oskar Blues (Brevard, ~40mi S),
    Bold Rock Cidery (Mills River).
  - **Manufacturing:** Pratt & Whitney (Asheville - turbine airfoils, large
    new plant), Linamar, BorgWarner, Eaton, GE Aviation (Asheville / West
    Asheville), Baxter International.
- **Pallet reality:** breweries need new or premium recycled (brand-facing),
  often stenciled or pooled (CHEP / PECO pressure). Pratt/GE Aviation need
  heat-treated ISPM-15 and custom crating.

### Port of Wilmington + Wilmington metro

- **What's here:** GE Hitachi Nuclear Energy (HQ), Corning Incorporated
  (Wilmington plant), PPD / Thermo Fisher Clinical Research, Verizon
  (contact center - not pallet-relevant), Castle Branch, nCino (software).
  Regional food: House of Raeford (poultry, near Rose Hill), Mountaire
  (Lumber Bridge). Chemical: Fortron / Chemours (Fayetteville-area
  Fayetteville Works), DuPont legacy.
- **Pallet reality:** export heat-treated for GE Hitachi and Corning, bulk
  commodity for ag / food processing in Duplin / Sampson / Bladen counties.

### Eastern NC / Sandhills (I-95 corridor)

- **Archetype:** food processing + ag.
- **What's here:**
  - **Smithfield Foods Tar Heel** (Bladen County) - world's largest pork
    processing plant, ~32,000 hogs/day. Enormous pallet consumer.
  - **Butterball** (Mt. Olive HQ + Goldsboro, Kenansville).
  - **Mountaire Farms** (Lumber Bridge, Siler City).
  - **Perdue Farms** (Lewiston, Robersonville, Rockingham).
  - **Case Farms** (Morganton + Dudley).
  - **Campbell Soup** (Maxton - large soup/sauce plant).
  - **Coca-Cola Consolidated** (Charlotte HQ, bottling in Charlotte /
    Mocksville / Whitakers NC).
  - Sweet potato packers in Nash / Wilson / Johnston / Sampson counties
    (NC is #1 US producer; Wada Farms, Ham Produce, Nash Produce).
  - Tobacco / ag distribution in Wilson, Rocky Mount.
- **Pallet reality:** very high volume, wash-down / food-grade concerns
  (plastic or heat-treated wood), seasonal spikes (sweet potato harvest
  Aug-Oct), price-sensitive on recycled but willing to pay for spec.

### Upstate SC (tier B, high strategic value)

- **Archetype:** foreign-direct-investment manufacturing belt.
- **What's here:** BMW Spartanburg (largest BMW plant globally by volume -
  X3/X5/X6/X7), Michelin NA HQ (Greenville), Milliken & Company,
  Bosch (Charleston + Anderson), Boeing (Charleston - 787), Volvo Cars
  (Ridgeville/Charleston), Mercedes-Benz Vans (North Charleston),
  ZF Transmissions (Gray Court), Magna, Proterra, CU-ICAR (Clemson auto
  research). Plus Greenville / Spartanburg 3PL explosion along I-85.
- **Pallet reality:** premium spec, heat-treated ISPM-15 for export, custom
  block pallets for automotive. Dominated by national suppliers (PalletOne,
  UFP) - we win on responsiveness and custom runs, not price.

### Atlanta metro (tier C - opportunistic)

Listed because two things cross into our lane: (a) Hartsfield distribution
/ 3PL companies with NC DCs often centralize procurement in Atlanta; (b)
the I-85 Commerce/Braselton corridor is effectively a shared Charlotte-Atlanta
market. Do not prospect Atlanta cold - only engage where an Atlanta HQ has a
buying site inside tier A/B.

---

## Vertical Prioritization

Ranked by combination of: NC concentration, recurring volume, fit with our
product mix, contact accessibility, and expected close rate.

### 1. `vertical_3pl` — Third-party logistics & distribution centers

- **Why #1:** highest recurring volume per account, most concentrated in
  tier A (Charlotte, Triad, Greensboro/Kernersville corridor, Mebane),
  strongest fit with our core recycled GMA + new GMA mix, established
  procurement function.
- **Typical weekly need:** 500-5000 pallets/week (DC sites run 2000+ easily).
- **Typical decision-maker title:** Director of Operations, Warehouse Manager,
  Procurement Manager, Supply Chain Manager, General Manager, Regional
  Operations Director. At enterprise: Category Manager - Packaging /
  Indirect Procurement.
- **NC concentration signal:** Charlotte-I-85 corridor, Greensboro /
  Kernersville / Whitsett 3PL park, Mebane (Medline, Walmart, Lidl), Concord,
  Statesville.
- **Pallet-mix reality:** 80% recycled GMA, 15% new GMA, 5% custom.

### 2. `vertical_food_bev` — Food & beverage processing

- **Why #2:** enormous NC footprint (pork, poultry, sweet potato, tobacco,
  bottling), steady non-cyclical demand, willing to pay for food-grade spec.
- **Typical weekly need:** 1000-10,000/week at major plants (Smithfield
  Tar Heel is the extreme high end), 200-1000 at mid-size processors.
- **Typical decision-maker title:** Plant Manager, Purchasing Manager,
  Operations Manager, Shipping Supervisor; at corporate: Director of
  Packaging / Director of Procurement.
- **NC concentration signal:** Bladen, Duplin, Sampson, Robeson, Wayne,
  Wilson, Nash, Johnston, Burke counties. I-95 corridor east + I-40/I-74
  south.
- **Pallet-mix reality:** heat-treated for export (especially poultry /
  pork to Asia), plastic for wash-down zones, recycled GMA for dry
  ingredient and outbound finished goods.

### 3. `vertical_furniture` — Furniture & case goods manufacturing

- **Why #3:** defining NC industry. High Point / Hickory / Lenoir /
  Morganton / Thomasville cluster. Custom sizes required - margin opportunity.
- **Typical weekly need:** 100-1500/week production, plus spikes around
  the High Point Market (April + October) which quadruple short-term demand.
- **Typical decision-maker title:** Shipping Manager, Plant Manager,
  Purchasing Manager, VP Operations. Often family-owned - owner / CFO
  involvement common on contracts.
- **NC concentration signal:** High Point, Thomasville, Lexington, Hickory,
  Lenoir, Morganton, Taylorsville (Mitchell Gold + Bob Williams), Troutman.
- **Pallet-mix reality:** custom dimensions (not 48x40) for bedroom suites,
  upholstered seating, and shipping crates; heat-treated for export
  (significant export to Canada, UK, Middle East).

### 4. `vertical_brewery` — Breweries, cideries, distilleries, beverage

- **Why #4:** NC is a top-10 US state for craft breweries. Asheville and
  Raleigh clusters are defined markets. Brand-facing pallets = premium
  pricing opportunity (custom stenciling, new pallets, consistent spec).
- **Typical weekly need:** 50-800/week per brewery; larger (Sierra Nevada
  Mills River, New Belgium, Oskar Blues) run 1000-3000/week in kegs + cans.
- **Typical decision-maker title:** Operations Manager, Logistics Manager,
  Packaging Manager, Brewery Ops, Supply Chain Lead. At larger craft:
  Procurement Manager.
- **NC concentration signal:** Asheville / Mills River / Brevard / Fletcher,
  Raleigh / Durham, Charlotte (NoDa, Olde Mecklenburg, Wicked Weed Charlotte),
  Wilmington.
- **Pallet-mix reality:** mostly new GMA or CP-spec, often rented (CHEP /
  PECO) — our opening is (a) spike capacity, (b) stenciled custom for
  brand-facing deliveries, (c) exchange-pool alternatives for breweries
  squeezed on CHEP / PECO audit fees.

### 5. `vertical_biotech_pharma` — Biotech, pharma, medical device

- **Why #5:** lower volume per site, but premium margins, long contracts,
  and RTP concentration gives geographic leverage. High-LTV anchors for
  the book of business.
- **Typical weekly need:** 50-800/week per site. Multi-site buyers
  (Novo Nordisk Clayton, FUJIFILM, Grifols) aggregate higher.
- **Typical decision-maker title:** Supply Chain Manager, Packaging
  Engineer, Procurement / Category Manager (Indirect), Facilities Manager,
  Warehouse Supervisor. Packaging Engineer is the technical gate;
  Procurement writes the PO.
- **NC concentration signal:** RTP (Durham, Morrisville, Research Triangle
  Park), Holly Springs, Clayton, Sanford, Concord (Cabarrus - Eli Lilly
  Concord), Greenville (East NC - Thermo Fisher / Patheon Greenville, huge
  sterile mfg site), Rocky Mount (Pfizer Hospira plant), Wilson (Sandoz
  / Thermo Fisher), Burlington (LabCorp).
- **Pallet-mix reality:** heat-treated wood, cleanroom-compatible (export
  plastic common), custom dimensions, strict supplier qualification (ISO
  audits, traceability, no-nail standards for some). Long sales cycles -
  prioritize but plan 9-18 month funnel.

### 6. `vertical_industrial_mfg` — Heavy industrial / automotive / aerospace

- **Why #6:** heat-treated ISPM-15 + custom block pallets = highest per-unit
  margin segment. Concentrated in Upstate SC (BMW, Michelin, Bosch, Boeing,
  Volvo) and NC (Honda Aircraft, HondaJet, Pratt & Whitney Asheville,
  Toyota Battery Liberty, GE Aviation).
- **Typical weekly need:** 200-2000/week at tier-1 plants; custom crating
  deals can be larger but episodic.
- **Typical decision-maker title:** Materials Manager, Logistics Manager,
  Packaging Engineer, Supplier Quality Manager, Purchasing Manager. Tier-1
  OEMs run Category Manager / Strategic Sourcing.
- **NC concentration signal:** Liberty (Toyota Battery), Greensboro (Honda
  Aircraft, Boom, HAECO), Asheville (Pratt & Whitney, GE Aviation),
  Charlotte region (Honeywell, Siemens Energy - Charlotte turbine plant),
  Sanford (Caterpillar), Salisbury / Lexington (Freightliner cab/chassis
  supplier chain). Upstate SC is tier B but enormous.
- **Pallet-mix reality:** heat-treated ISPM-15 for overseas sub-assembly
  shipments, custom block pallets for heavy parts, reusable / returnable
  programs. Price-sensitive but rewards responsiveness and custom capability.

### 7. `vertical_agriculture` — Agriculture, produce, nursery

- **Why #7:** seasonally huge, but volume concentrated in narrow windows.
  NC #1 US sweet potato producer, #1 tobacco producer historically, major
  Christmas tree producer (Ashe / Alleghany / Watauga counties - ~25% of US
  supply), nursery stock (Wayne / Johnston), and apples (Hendersonville).
- **Typical weekly need:** 200-3000/week in season (Aug-Nov peaks), near
  zero off-season. Many buyers rent bin-boxes + pallets seasonally.
- **Typical decision-maker title:** Packinghouse Manager, Owner / Operator,
  Operations Manager. Smaller / family operations - sales cycle is short
  but relationship-driven.
- **NC concentration signal:** Wilson / Nash / Johnston / Sampson / Duplin
  (sweet potatoes, tobacco), Henderson County (apples), Ashe / Alleghany
  (Christmas trees), Sampson / Duplin (poultry coordination with vertical 2).
- **Pallet-mix reality:** heat-treated for export sweet potatoes, bin-boxes,
  short-turn rental / repair.

### 8. `vertical_textile` — Textiles, apparel, carpet, nonwovens

- **Why #8 (still on list):** legacy NC industry with real persistent
  accounts (Hanesbrands, Parkdale, International Textile Group), plus
  nonwovens growth (Fitesa, Berry Global, Glatfelter / Magnera).
- **Typical weekly need:** 100-1500/week. Larger at Hanesbrands DCs.
- **Typical decision-maker title:** Warehouse Manager, Shipping Manager,
  Purchasing Manager.
- **NC concentration signal:** Winston-Salem (Hanesbrands HQ), Gastonia /
  Belmont (Parkdale, American & Efird), Mount Airy (nonwovens), Greensboro
  (ITG legacy), Statesville.
- **Pallet-mix reality:** recycled GMA dominates; export heat-treated for
  international shipments.

---

## Out-of-scope verticals (explicit no-prospect list)

We don't cold-prospect these even if tier-A located — volume too low,
buying process wrong, or commodity pressure unbeatable by the nationals:

- Residential / home / consumer single-orders
- Garden centers / Home Depot / Lowe's display pallets (vendor-managed)
- Big-box retail corporate (Walmart / Amazon / Target centralize at scale
  tiers we can't reach economically)
- Construction contractors (one-off project demand)
- Accounts already locked to CHEP/PECO pooling where we can't offer an
  exchange alternative

---

## ICP Tier Definitions

Criteria combine: geographic tier (A/B/C above), weekly pallet volume,
recurrence, contact accessibility, and disqualifying signals.

### ICP Tier 1 — Ideal

ALL of the following:

- Located in tier-A geography (<=150mi of Piedmont Crescent)
- Weekly pallet consumption **>=500 units/week, recurring** (not single
  project)
- One of the priority verticals 1-4 (3PL, food_bev, furniture, brewery)
  OR any vertical operating a verifiable NC DC of >=100,000 sq ft
- Reachable procurement / operations contact (named, title-verified)
- Current pallet supplier identifiable (competitor named) OR currently
  self-recycling at a scale that's hitting constraints (sign: listings
  for waste-hauler contracts, backhaul complaints, or OSHA incidents
  related to pallet stacks)
- No known exclusive national-contract lock-in (not all PalletOne /
  48forty accounts — some are multi-source)

Target count for the book: ~150-250 tier-1 prospects at any time.

### ICP Tier 2 — Good

At least THREE of these:

- Located in tier-A OR tier-B geography (<=300mi)
- Weekly consumption **100-500 units/week** OR seasonal spike-to-1000+
  (ag, furniture market, holiday beverage)
- Any of the 8 priority verticals
- Specialty need our product mix serves: ISPM-15 export, custom sizing,
  cleanroom plastic, food-grade wash-down
- Named operations contact (email, phone, or LinkedIn)
- Open multi-source procurement (not single-sourced with a lock)

Target count: ~500-800 tier-2 prospects in the top-of-funnel.

### ICP Tier 3 — Disqualify

ANY ONE of these disqualifies cold outreach:

- Located beyond 500mi of a Piedmont Crescent shipping point (tier D)
  with no NC DC
- Weekly pallet need <50 units or one-time / project-only purchase
- Residential / home / consumer / garden-use
- Publicly disclosed exclusive national pallet contract in force (PalletOne
  master contract, 48forty Gold account, CHEP-only pooled)
- Contact only available as a generic info@ or contact-form
- Sub-industry we don't serve (e.g., medical waste, hazardous chemical
  where pallets must be certified for specific DOT packaging — not our
  specialty without partner)
- Any "how do I buy ONE pallet" consumer inquiry

Tier-3 is a filter, not a tracked list. Log and drop; do not enqueue
follow-up.

---

## Competitive Landscape

### National players (full-service, our scale ceiling)

- **PalletOne (IFCO Systems / Triangle Industries)** — largest US new-pallet
  manufacturer, 65+ plants including NC (Thomasville, Fayetteville). Wins
  on scale, new GMA price, national account programs. Loses on
  responsiveness to non-contract accounts and on small-batch custom.
- **48forty Solutions (formerly IFCO Recycled Pallets + Relogistics
  combined)** — largest US recycled pallet network. Multiple NC yards.
  Wins on recycled price and DC retrieval logistics ("core" recovery).
  Loses on new/custom and on service for sub-500/week accounts.
- **UFP Industries (Universal Forest Products)** — public, $8B+ revenue,
  packaging division runs Deckorators / UFP Packaging. NC presence.
  Wins on lumber vertical integration and heat-treated export. Loses on
  responsiveness to mid-market and on recycled focus.
- **Millwood, Inc.** — private Ohio-based, strong SE presence, full-service
  (new + recycled + custom + unitization). Closest mirror of our own
  product mix at national scale. Primary threat.
- **Kamps Pallets** — Michigan-HQ, growing SE. Strong recycled network.

### Pooling / rental (different model — frenemies)

- **CHEP (Brambles)** — blue-painted rented pallets. Dominant in CPG /
  grocery. Customers don't buy — they rent. Our opportunity: surge
  capacity when CHEP is short, exchange-pool alternatives for customers
  tired of audit / loss fees.
- **PECO Pallet** — red 9-block rental. Same model as CHEP; second place.
- **iGPS** — plastic rental pallets. Growing in food / pharma.

### Regional NC / SE players (direct competitors at our tier)

- **Carolina Pallet (Greensboro)** — established regional recycled / new,
  strong Triad relationships.
- **Quality Pallet & Recycling (Charlotte / Hickory)** — recycled-heavy,
  Charlotte metro strength.
- **Dixie Pallets (various SE locations)**
- **Greenway Products & Services / Greenway Pallet** — SE recycled network.
- **Blue Ridge Pallet (VA / NC mountain region)**
- **Pallet Consultants (SE / FL but reaches GA/NC)**
- **Numerous independent yards** — any county of 50k+ population in NC has
  1-3 independent recyclers. Most are owner-operated, <30 employees,
  relationship-sold.

### Broker marketplaces

- **The Pallet Alliance** — network of independents aggregated for
  national account sellthrough. Competes on coverage, not price.
- **1-800-PALLET / PalletMarket.com / similar** — inbound-lead brokers.
  Less relevant in our territory (most of our ICP buys direct).

### In-house recycling

Large DCs (500k+ sq ft) sometimes run their own pallet recycling in-house
to capture core value. When they do, we compete on: (a) disposal /
hauling of unrepairable cores (#3 / burn pile), (b) incremental
new-pallet supply on spikes, (c) taking the problem away entirely when
in-house economics flip (common failure modes: labor shortage, safety
incidents, space pressure).

### Our positioning vs. each tier

| Vs. | Their strength | Our play |
|-----|----------------|----------|
| Nationals (PalletOne / 48forty / UFP) | Scale price, national accounts | Responsiveness (24h orders), sub-500/week accounts they under-serve, owner-level relationship, custom runs under 1 truckload |
| Millwood / Kamps (SE regional) | Full-service parity | NC-local presence, faster service radius, Piedmont Crescent density |
| Local recyclers | Cheapest on commodity recycled | Full product mix (new + HT + custom), consistent spec, credit / terms, scale-up capacity on spikes |
| CHEP / PECO | Turnkey pooling | Exchange programs without audit fees, surge capacity, escape path from pooling when CPG customers tire of it |
| Brokers | One-call sourcing convenience | Direct relationship cuts out broker margin (~5-10% swing), tighter spec control |
| In-house recycling | Captures core value | Take hauling burden, supply the spike, buy their #3 cores at scale |

---

## Pricing & Terms Considerations by Vertical

Rough heuristics (to be refined by the pallet-domain spec 02 — this is
GTM shape, not a price list):

| Vertical | Typical product | Price sensitivity | Terms leverage |
|----------|-----------------|-------------------|----------------|
| 3PL / DC | Recycled A / #1 GMA | Very high (commodity) | Volume contracts, buy-back #3 core, weekly standing order |
| Food & bev | Heat-treated, food-grade, plastic for wash-down | Medium | Food-safety audit support, ISPM-15 cert on file, emergency surge |
| Furniture | Custom-cut, HT export | Medium-low | Market-spike capacity (April/October), custom tooling |
| Brewery | New or premium recycled, stenciled | Low (brand) | Stenciling, exchange-pool alt to CHEP, consistent spec |
| Biotech / pharma | HT, cleanroom, custom | Low | Supplier qualification, traceability docs, long-term contract |
| Industrial / auto | HT ISPM-15, custom block | Low | Export cert, custom tooling, Kanban / scheduled deliveries |
| Agriculture | HT export, bin-boxes, seasonal | High in-season | Seasonal rental / return, harvest surge capacity |
| Textile | Recycled GMA | High | Weekly standing order, core buyback |

---

## Key Account Archetypes

Not real-company callouts — these are shapes used for skill dry-runs and
MEMORY seed entries.

1. **"Charlotte mid-market 3PL"** — 250k sq ft DC, Concord NC, 1800
   pallets/week recycled GMA, currently single-sourced with a national,
   contract renews in 6 months. Decision-maker: Operations Director.
   Tier 1. Core cold-call target.

2. **"Tar Heel-size pork plant"** — major food processor, Bladen/Duplin
   county, 5000+ pallets/week mixed plastic + heat-treated + recycled.
   Decision-maker: Plant Manager + corporate Director of Packaging.
   Tier 1. Long cycle, big prize.

3. **"High Point furniture maker"** — family-owned case-goods, High Point,
   300 pallets/week custom-cut + 100 HT export/week. Decision-maker:
   Owner / CFO. Tier 1. Spike demand April + October.

4. **"Asheville craft brewery (production-tier)"** — 50-150k BBL/year,
   500 new pallets/month + stenciled. Decision-maker: Ops Manager + head
   brewer. Tier 1. Brand-conscious.

5. **"RTP biologics CDMO"** — Holly Springs or Morrisville, 200 HT +
   cleanroom plastic/week, procurement-led with packaging-engineer gate.
   Decision-maker: Packaging Engineer (technical) + Procurement Category
   Manager (commercial). Tier 1 by LTV, long cycle.

6. **"Sweet potato packinghouse"** — Nash / Wilson / Johnston, 800 HT
   export/week in season, zero off-season. Decision-maker: owner /
   packinghouse manager. Tier 2 (seasonal).

7. **"Upstate SC automotive tier-1"** — Spartanburg / Greer, 1200 HT
   ISPM-15/week + custom block, national contract but open to local
   secondary supplier for surge + custom. Decision-maker: Materials
   Manager + Supplier Quality. Tier 2 (geography tier B, volume tier A).

8. **"Greensboro e-commerce 3PL (Toyota-adjacent)"** — new 500k sq ft build
   in Liberty / Randolph County supplier park, 3000+ pallets/week
   projected. Tier 1 but pre-launch — relationship-build during
   construction.

---

## Open Questions (for synthesis / later)

1. **New vs. recycled mix.** What fraction of our own production capacity
   is new vs. recycled vs. brokered? This determines whether vertical 1
   (3PL commodity recycled) or vertical 6 (industrial HT new) should be
   the volume anchor.
2. **Port of Wilmington vs. Port of Charleston bias.** Do we have a
   standing dray relationship with either? Shifts whether we treat
   Charleston-bound exporters as tier B or tier C.
3. **Toyota Battery Liberty ramp.** Do we have a supplier park foothold
   or a relationship we can mine? This is the single largest demand
   accretion event in the territory this decade.
4. **High Point Market capacity.** Can we handle a 4x April / October
   surge without losing tier-A DC accounts to the detour? If yes,
   furniture moves up. If no, clamp furniture to tier 2 accounts we can
   serve year-round.
5. **ISPM-15 certification and audit.** Are we a certified HT provider
   under ALSC / NHLA, and is our kiln throughput a bottleneck? Governs
   how aggressively we pursue vertical 6 / vertical 7-export.
6. **CHEP / PECO partnership posture.** Are we a CHEP-authorized repair
   depot? If yes, we have a different angle into CPG. If no, we sell
   exchange-pool alternatives instead.
7. **Buyback / core-recovery fleet.** Do we run trucks to retrieve cores
   from customer DCs, or buy cores through brokers? Governs our 3PL /
   DC stickiness story.
8. **Credit terms benchmark.** Net-30 standard, or can we offer net-45 /
   net-60 to win tier-1 3PL accounts from nationals? GTM leverage item.
9. **Minimum order quantity.** Below what MOQ do we lose money on a
   delivery? Governs tier-2 qualification threshold.
10. **Sales tax / interstate registration.** Are we registered to collect
    sales tax in SC / VA / GA / TN? Governs how aggressively we pursue
    tier-B accounts or whether we have to partner-ship.

These feed spec 02 (product) and spec 05 (agent architecture) — none of
them change the territory or vertical ranking above, but several change
how skill templates phrase qualification questions.
