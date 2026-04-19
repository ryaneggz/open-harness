---
name: lead-research
description: |
  LLM-generative one-pager on a target account. Reads public web (WebFetch/WebSearch) + USER.md ICP + spec 03 vertical heuristics to produce a crisp account profile with a proposed pallet-interest hypothesis. Cites sources.
  TRIGGER when: lead is in `new` stage; owner asks for research on a company.
argument-hint: "lead_id=L-NNNNNN | company=\"<name>\" state=<enum>"
---

# lead-research — Account One-Pager

## Contract

- **Type**: LLM + WebFetch/WebSearch.
- **Input**: EITHER `lead_id=L-NNNNNN` (existing lead), OR `company="<name>" state=<enum>` (creates a new lead).
- **Output**: Markdown file at `crm/drafts/<lead-id>/research.md`.
- **Side effects**:
  - If new company: `/crm-write create company=<name> state=<enum> source=research`.
  - Writes `research.md`.
  - Calls `/crm-write note <id> "research one-pager written" ref=<path>` — `event=research`.
  - May transition `new → researched` via `/crm-write transition` IF all researched-entry requirements met (contact_email, vertical, fit_score).
- **Determinism**: None (LLM + external data).

## Sections

### 1. Company Snapshot
- Legal entity name, HQ address, website, LinkedIn
- Size band (`employee_count_band`)
- Year founded, ownership (public / private / PE-backed)
- One-paragraph business description

### 2. Locations
- Primary NC-area facility/facilities (if any)
- Other relevant SE facilities
- Lane implications — distance from Piedmont Crescent centroid

### 3. Recent News / Triggers (last 6 months)
- Hiring, plant expansions, product launches, acquisitions, layoffs, audits, awards
- Each item cited with URL + date
- Flag any item that maps to a pallet trigger (new plant = new pallets needed, layoffs = budget pressure, audit = compliance urgency)

### 4. Likely Pallet Need
Per vertical heuristics from `wiki/sources/nc-logistics-context.md`:
- Hypothesized `pallet_interest` (pipe-delimited enum values)
- Hypothesized `est_volume_weekly` range
- Hypothesized `export_exposure`
- Confidence level: high / medium / low
- **Each hypothesis cited** — link to public evidence (press release about new plant, LinkedIn post about hiring, earnings call transcript)

### 5. Proposed Hook
- Which vertical-specific hook fits best (spec 03 vertical section)
- Which trigger event (if any) to lead with
- Which pallet-type angle (recycled commodity vs premium spec vs HT export)
- Which competitor (if known) to gently displace

### 6. Decision-Maker Candidates
Per spec 03, for this vertical:
- 1-3 candidate titles (Ops Manager, Warehouse Mgr, Purchasing Mgr, etc.)
- Named individuals if LinkedIn turned them up (with URL)
- Note: titles are hypothesis; discovery confirms

### 7. Citations
- Every non-obvious claim has a source URL
- Date retrieved

## Guardrails

- **Never fabricate**. If a fact can't be cited, flag as `[unverified]` and exclude from `cold-email` eligibility.
- **Never infer a contact_email** — phishing-style guessing is out of scope. Contact must come from LinkedIn / company website / reply.
- **Dedupe** against existing `leads.csv` before creating. If `company + state` exists, abort and suggest `update` instead.
- **Respect tier**: if research reveals the company is outside NC/SC/VA/GA/TN and >500 mi, flag `territory_out_of_bounds` as likely and note in the research file.

## Example Output Header

```markdown
---
lead_id: L-000042
skill: lead-research
created_at: 2026-04-19T09:00Z
---

# Acme Brewing — Asheville, NC

## Company Snapshot
- **Website**: acmebrewing.com
- **HQ**: 100 Biltmore Ave, Asheville NC 28801
- **Founded**: 2014, privately held
- **Size**: 51-200 employees (LinkedIn, 2026-03)
- **Description**: Craft brewery, ~150 bbl/week, distributes NC + SC + TN.

## Locations
- Asheville brewery + taproom
- No second production site

## Recent Triggers
- 2026-03-12: Announced Murphy NC expansion ([press release](https://...)) — new plant = pallet demand spike
- 2026-02-04: Hired Director of Operations from Oskar Blues ([LinkedIn](https://...)) — new decision-maker, window to land

## Likely Pallet Need
- Hypothesized `pallet_interest`: `gma_48x40_new|gma_48x40_recycled` (mixed; brand-facing + internal)
- Hypothesized `est_volume_weekly`: 100-300 during build phase → Q3 production ramp → 500+
- Hypothesized `export_exposure`: `none` currently; Canada expansion mentioned Jan 2026 = monitor
- Confidence: **high** (news-cited triggers, vertical fit)

## Proposed Hook
- Lead with Murphy expansion — "How are you planning pallet supply for the new site?"
- Offer: surge-capacity commitment in the Piedmont corridor (we can serve Murphy from Hickory-area stock)
- Competitive angle: likely on CHEP/PECO for main packaging; we open with exchange-pool alternatives + stenciled custom for taproom

## Decision-Maker Candidates
- Director of Operations (recent hire — Hannah Greene, [LinkedIn](https://...))
- Brewery Operations Manager (existing — Dana Reyes, [LinkedIn](https://...))

## Citations
- [1] Press release 2026-03-12 — Murphy expansion
- [2] LinkedIn profile of Hannah Greene (retrieved 2026-04-19)
- [3] Craft Brewers Assoc. 2025 NC market report
```
