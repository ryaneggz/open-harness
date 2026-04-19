---
title: Pallet Industry Primer
source: condensed from .claude/specs/sdr/02-pallet-domain.md
ingested: 2026-04-18
tags: [pallet, product-taxonomy, standards, ispm15]
---

# Pallet Industry Primer

Reference for the sdr-pallet agent. Canonical spec: `.claude/specs/sdr/02-pallet-domain.md` (orchestrator branch, 485 lines).

## What a Pallet Is

Atomic unit of unit-load logistics — flat transport structure lifted by forklift / pallet jack / conveyor. Buyer is never buying "a pallet" — they're buying a **repeatable specification** that fits: (1) product, (2) handling equipment, (3) trading-partner requirements, (4) cost/loss tolerance. The SDR's credibility = recognizing which dominates the conversation.

Industry scale: ~500M+ new pallets/yr in North America (NWPCA). ~90% wood, ~10% plastic/other. GMA 48×40 footprint = ~30-35% of new wood. Recycled trip-basis volume is ~2× new units because cycles repeat. Price tracks softwood lumber indices (SPF/SYP).

## Product Taxonomy — `pallet_interest` Enum (12 frozen values)

| Key | Product | Material | Use | Price band | Lead time |
|-----|---------|----------|-----|------------|-----------|
| `gma_48x40_new` | GMA 48×40 New Wood | SPF/SYP/mixed hardwood | Grocery, CPG, retail DC inbound | $14-$24 A-grade; $20-$30 premium | 1-3 wk |
| `gma_48x40_recycled` | GMA 48×40 Recycled (#1/#2/Combo) | Reclaimed wood | 3PL commodity, internal handling | #1 ~$10-$12; #2 ~$6-$9 | 1-7 days |
| `heat_treated_ispm15` | Heat-Treated ISPM-15 Export | Wood treated 56°C core / 30 min | International export (any ISPM-15 country) | +$1-$3 over untreated | 1-2 wk (kiln-bound) |
| `block_pallet` | Block Pallet (4-way entry) | Wood or plastic block | Automated warehouses, rack, pool systems | Wood $18-$35; plastic $55-$120 | 2-4 wk |
| `stringer_pallet` | Stringer (non-GMA / custom sizes) | Wood | General freight, 40×48, 36×36, 42×42 | $12-$22 | 1-3 wk |
| `custom_wood` | Custom-Dimensioned Wood | Wood (spec-by-customer) | OEM machinery, furniture, crating, military | $18-$80+ quoted | 2-6 wk first run; 1-2 wk reorder |
| `plastic_pallet` | Plastic (HDPE / PP) | HDPE or PP | Pharma, food GMP, cleanroom, cold chain | Nestable $40-$90; rackable $90-$220 | 4-12 wk (tooled) |
| `cp_series` | CP1-CP9 Chemical Industry | Wood (CP-specific block/stringer) | Chemical / petrochemical export (APME/CEFIC) | $18-$35; CP3/CP9 premium | 2-4 wk |
| `presswood_molded` | Presswood / Molded Fiber | Compressed wood + resin | ISPM-15-exempt, nestable, one-way air/ocean | $8-$18 | 2-6 wk |
| `eur_epal` | EUR / EPAL (1200×800 mm) | Wood block, licensed EPAL | Europe-bound, EU retailer mandates | New $15-$28; used $8-$14 | 2-4 wk |
| `pallet_recycling_service` | Take-back / recycling service | — | Large receivers with surplus cores | Net-zero or pays customer | Recurring route |
| `pallet_management_program` | Onsite pallet management | — | High-volume shippers wanting turnkey | $9-$16 / trip equivalent | 30-90 day implementation |

## Standards & Compliance

### NWPCA (National Wooden Pallet & Container Association)
US industry body. Publishes **Uniform Standard for Wood Pallets** (component dims, fastener counts, MIBANT strength, PDS engineering software). SDR talking points: PDS modeling for custom heavy/unbalanced loads; Pallet Safe Handling Council credibility for safety-sensitive verticals; CPR certification for sustainability buyers.

### GMA 48×40 Spec
GMA (now Consumer Brands Association) de-facto grocery spec. Voluntary but universal vocabulary.
- Dimensions: 48" × 40" (1219 × 1016 mm); height 6¼" (~159 mm)
- Deckboards: 7 top / 5 bottom (chamfered top for pallet-jack entry common)
- Stringers: 3, notched for partial 4-way fork entry
- Fasteners: helically-threaded or stiff-stock MIBANT-qualified nails

### ISPM-15 (IPPC)
Mandatory for ANY wood-packaging export to enforcing countries. Two treatments:
- **HT** — heat-treated to 56°C core for 30 min (most common)
- **MB** — methyl bromide (declining; banned in EU since 2011)
- **DH** — dielectric heating (niche)
- **KD-HT** — kiln-dried + heat-treated

Stamped with IPPC logo, country code, producer number, treatment code. Fine exposure per missed-compliance is real — major talking point with exporters.

### CP Series (CEFIC / APME, European Chemical)
CP1 (1000×1200 mm), CP2 (800×1200), CP3 (1140×1140 square), CP4, CP5, CP6, CP7, CP8, CP9. NC exporters most often hit CP3 or CP9 in conversations.

### EPAL (EUR-Pallet)
Licensed European pooled pallet. 1200×800 mm block construction. EPAL-marked means repairable/exchangeable in the pool. Often required by European retailers.

## Construction Types

- **Block vs Stringer**: block pallets have 9 (sometimes more) solid wood/plastic blocks between deckboards; stringers use 3 long parallel boards. Block allows full 4-way fork entry + better rack/conveyor behavior. Stringers are cheaper but partial 4-way only.
- **2-way vs 4-way entry**: fork-entry sides. Automated warehouses require 4-way.
- **Deck configs**: single-face, double-face, reversible, winged.

## Pool/Rental vs Purchase

- **CHEP / PECO / iGPS**: rented pool pallets. Issuer owns, user pays per trip + audit fees. Pro: predictable spec, no disposal. Con: audit fees, availability squeeze during peaks, return logistics.
- **Whitewood (purchased/owned)**: one-way or limited-return. Cheaper per trip but user bears sort/repair.
- **Hybrid**: keep pool for brand-facing / retailer-mandated lanes; whitewood for internal.

## Freight & Truckload Math (sales-critical)

- 53' dry van: ~500 GMA 48×40 stacked (20-high × 2 × 25). Block / HT reduces to 400-440.
- 48' dry van: ~450 GMA.
- 40' ocean container: ~240 GMA or 360 EUR-pallets.
- Delivered freight cost: ~$0.010-$0.012 / pallet / loaded mile at SE dry-van rates ($2.50-$3.00/mi).
- 300-mile one-way haul on a $6 recycled GMA = $3-$3.60/pallet freight = 50%+ of product cost. Past ~300 mi, nationals win on scale.

## Buyer Pain Points by Vertical

- **3PL / DC**: commodity squeeze, surge capacity, broken-pallet-per-load rate, dock turn time.
- **Manufacturer**: spec consistency, custom-size lead time, engineering support (PDS), returnable programs.
- **Brewery / beverage**: CHEP audit fees, brand-facing consistency, peak-season spike coverage.
- **Agriculture**: seasonal volume (sweet potato Aug-Nov, Christmas trees Oct-Nov), bin-box vs pallet decisions.
- **Exporter**: ISPM-15 compliance proof, stamp traceability, customs-fine exposure.

## Objection Bank

Detailed in `.slack/MEMORY.md` (seeded from spec § 9). Every rebuttal grounded in a standard, a number, or a logistic reality — not sales fluff.

## Glossary (selected)

- **MIBANT** — Montreal Impact Bending Angle Nail Test (fastener strength)
- **PDS** — Pallet Design System (NWPCA engineering software)
- **HT** — Heat Treated (ISPM-15)
- **IPPC** — International Plant Protection Convention (ISPM-15 governing body)
- **TEU** — Twenty-foot Equivalent Unit (container shipping)
- **Pinwheel** — alternating-orientation loading pattern for stability
- **#1 / #2 grade** — recycled pallet grade (#1 repaired + painted; #2 minor repair; combo = mixed)
