# Principal + Owner — NC Pallet Co

## Principal

Generic North Carolina-HQ'd shipping-pallet manufacturer / distributor. Blended manufacturing + recycling + brokered capacity. Real company profile TBD; scaffold ships with this archetype so the agent can learn and tailor.

## Products Offered

Full mix per `.claude/specs/sdr/02-pallet-domain.md`. `pallet_interest` enum (12 values, frozen):

| Enum key | Product | Typical use |
|----------|---------|-------------|
| `gma_48x40_new` | GMA 48×40 New Wood | Grocery, CPG, retail DC inbound |
| `gma_48x40_recycled` | GMA 48×40 Recycled (#1/#2/Combo) | Internal handling, 3PL commodity |
| `heat_treated_ispm15` | Heat-Treated ISPM-15 Export | International export (any ISPM-15 country) |
| `block_pallet` | Block Pallet (4-way entry) | Automated warehouses, rack storage, pool systems |
| `stringer_pallet` | Stringer (non-GMA / custom sizes) | General freight, 40×48, 36×36, 42×42 |
| `custom_wood` | Custom-Dimensioned Wood | OEM machinery, furniture, crating |
| `plastic_pallet` | Plastic (HDPE/PP) | Pharma, food GMP, cleanroom, cold chain |
| `cp_series` | CP1–CP9 Chemical Industry | Chemical/petrochemical export (APME/CEFIC) |
| `presswood_molded` | Presswood / Molded Fiber | ISPM-15-exempt, nestable, one-way |
| `eur_epal` | EUR / EPAL (1200×800 mm) | Europe-bound freight |
| `pallet_recycling_service` | Take-back / recycling service | Large receivers with surplus cores |
| `pallet_management_program` | Onsite pallet management | High-volume shippers wanting turnkey |

Full standards + construction detail in `wiki/sources/pallet-industry-primer.md`.

## Territory — Piedmont Crescent

Tier thresholds by drive-time / freight economics. ~150 mi = $1-2/pallet freight; ~300 mi = $2-4; beyond that freight kills recycled GMA commodity deals.

| Tier | Radius from Charlotte-Greensboro-Raleigh centroid | Strategy |
|------|---------------------------------------------------|----------|
| A | ~150 mi | Core revenue; same-day/next-day; full product mix |
| B | 150-300 mi | 2nd-day or weekly lanes; competitive on mid-spec + custom |
| C | 300-500 mi | Specialty only — heat-treated ISPM-15, custom block, staged-inventory |
| D | Beyond 500 mi | Disqualify unless customer has NC-area DC or >5 TL/week |

Named cities, corridors, Port of Wilmington dynamics: `wiki/sources/nc-logistics-context.md`.

## ICP — Verticals (ranked 1-8)

Per `.claude/specs/sdr/03-nc-gtm.md`. Snake_case enum values:

1. `vertical_3pl` — Third-party logistics & DCs (Charlotte / Triad corridor)
2. `vertical_food_bev` — Food & beverage processing (Smithfield, Butterball, Perdue, Campbell)
3. `vertical_furniture` — Furniture & case goods (High Point / Hickory / Lenoir)
4. `vertical_brewery` — Breweries, cideries, distilleries (Asheville, Raleigh)
5. `vertical_biotech_pharma` — Biotech / pharma / medical device (RTP)
6. `vertical_industrial_mfg` — Heavy industrial / automotive / aerospace (Liberty, Greensboro, Upstate SC)
7. `vertical_agriculture` — Sweet potato, tobacco, Christmas trees, apples, nursery
8. `vertical_textile` — Textiles, apparel, nonwovens (Winston-Salem, Gastonia, Mount Airy)

`vertical_other` = holding pen. Per-vertical decision-maker titles + out-of-scope list in the spec.

## Owner Preferences

- **Close ownership**: owner handles `qualified → quoted → closed_won`. Agent stops at `qualified` + handoff packet.
- **Commits**: small, focused, one logical change each. Conventional Commit prefix.
- **PRs**: target `development` from `agent/sdr-pallet`. `/ci-status` after every push.
- **Pricing**: agent never writes pricing. Owner generates all quotes manually.
- **Email sending**: agent never sends. Owner reviews `gate_status: PASS` draft and sends externally.
- **Slack**: heartbeat summaries and handoff packets surfaced in Slack when configured.

## Goals (owner to refine)

- Qualified → closed_won conversion is the success metric, not meetings booked
- Weekly `qualified` handoffs target: TBD
- Monthly pipeline velocity report via `/pipeline-review window=mtd`

## Constraints

- Branch: `agent/sdr-pallet` — never push to `main` or `development`
- Memory protocol at end of every task (even no-ops)
- Territory scope: `{NC, SC, VA, GA, TN}` primary; `other` = opportunistic only
- File-CRM is authoritative — no external CRM wiring in v1
