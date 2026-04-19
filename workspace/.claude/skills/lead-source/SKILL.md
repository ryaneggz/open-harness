---
name: lead-source
description: |
  LLM + WebFetch/WebSearch lead sourcing against ICP. Input: vertical + state + tier + limit.
  Produces candidate list at crm/sourcing/<ts>-<vertical>.md with citations and fit rationale.
  Dedupes against existing leads. Does NOT auto-create — owner approves before promote.
  TRIGGER when: weekly-lead-source heartbeat; owner asks for new leads in a vertical; pipeline under-coverage surfaces.
argument-hint: "vertical=<enum> state=<NC|SC|VA|GA|TN> [tier=<A|B|C>] [limit=<N>]"
---

# lead-source — Candidate List Builder

## Contract

- **Type**: LLM + WebFetch/WebSearch.
- **Input**: `vertical=<enum>` (required), `state=<enum>` (required), `tier=<A|B|C>` (default A), `limit=<int>` (default 5).
- **Output**: Markdown file at `crm/sourcing/<YYYY-MM-DD>-<vertical>.md` with candidate table + rationale per candidate.
- **Side effects**:
  - Writes sourcing note.
  - Does **NOT** create leads. Owner reviews and promotes.
- **Determinism**: None.

## Flow

1. Read `USER.md § Territory` + `USER.md § ICP` + `wiki/sources/nc-logistics-context.md` for the named anchors, concentration cities, and per-vertical decision-maker titles.
2. Build 3-5 search queries combining vertical + geography (e.g., "breweries Asheville NC", "craft brewery western NC 2025", "NC brewery hiring operations manager").
3. WebFetch / WebSearch each query. Extract candidate company names with URL citations.
4. For each candidate:
   - Fetch company website (or LinkedIn company page) for location, size-band, recent news
   - Cross-reference against existing `leads.csv` (match `company + state`) — skip dupes
   - Hypothesize `pallet_interest` from vertical + observable facts
   - Hypothesize `est_volume_weekly` from size-band + vertical norms
   - Rate `confidence`: high / medium / low
5. Rank candidates by tier fit + trigger-event presence.
6. Write the sourcing note with `limit` top candidates.

## Output format

```markdown
---
skill: lead-source
created_at: 2026-04-19T18:00Z
query: vertical=vertical_brewery state=NC tier=A limit=5
existing_leads_deduped: 3
new_candidates: 5
---

# Lead Source — vertical_brewery NC tier=A (2026-04-19)

## Candidates (awaiting owner approval)

| # | company | city | website | confidence | hypothesized_interest | rationale |
| 1 | Blind Spot Brewing | Asheville | blindspotbrewing.com | high | gma_48x40_new|heat_treated_ispm15 | Expanding to Canada ([news](URL)); ~150 bbl/wk |
| 2 | Hillman Beer | Asheville | hillmanbeer.com | medium | gma_48x40_new | Recently opened second location ([news](URL)) |
...

## To promote (copy-paste into crm-write):

```
/crm-write create company="Blind Spot Brewing" website=blindspotbrewing.com city=Asheville state=NC vertical=vertical_brewery tier=A source=research
/crm-write create company="Hillman Beer" website=hillmanbeer.com city=Asheville state=NC vertical=vertical_brewery tier=A source=research
...
```

## Searches performed
1. "craft brewery Asheville NC hiring ops" → [SERP URL]
2. "NC brewery expansion 2026" → [SERP URL]
...

## Deduped against existing
- "Sierra Nevada Mills River" (already L-000015)
- "Oskar Blues Brevard" (already L-000022)
- "Wicked Weed Asheville" (already L-000033)
```

## Guardrails

- **Cite every claim.** Every candidate must have at least one URL citation for its existence + fit.
- **No auto-create.** Owner reviews the sourcing note and runs the promote commands manually (or calls `/lead-import` on a CSV).
- **Dedupe first.** Companies already in `leads.csv` are skipped, not rewritten.
- **Respect territory.** Tier-D / out-of-region candidates are excluded.
- **Fail loud** if WebFetch/WebSearch unavailable — do NOT hallucinate candidates.
