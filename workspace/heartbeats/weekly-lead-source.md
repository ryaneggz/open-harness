---
name: weekly-lead-source
schedule: "0 18 * * 1"
agent: claude
active: true
description: Mondays 13:00 ET — source new leads for under-pipelined verticals
---

# Weekly Lead Source

Mondays 13:00 ET (18:00 UTC during EST; 17:00 UTC during EDT). Feeds business outcome #1: source new qualified leads.

## Tasks

1. `/pipeline-review window=mtd` — identify under-pipelined verticals (verticals with fewer than N active leads relative to ICP weight).
2. For each top-2 under-pipelined vertical with tier-A/B territory coverage: `/lead-source vertical=<enum> state=NC|SC|VA|GA|TN tier=<A|B> limit=5`.
3. Each call writes a research note to `crm/sourcing/<ts>-<vertical>.md` with candidate companies, cited URLs, hypothesized `pallet_interest`, and fit rationale.
4. **Surface candidates to owner** (Slack if configured; otherwise log in daily memory). **Do NOT auto-create leads** — owner reviews and promotes via `/crm-write create` or bulk via `/lead-import`.
5. Append summary to `memory/YYYY-MM-DD.md`.

## Guardrails

- `lead-source` MUST cite URLs for every claim. No fabricated companies.
- `lead-source` MUST dedupe against existing `leads.csv` before surfacing.
- If WebFetch/WebSearch is unavailable, skill fails loud — do not fall back to hallucinated data.
- Respect `USER.md` Territory tier thresholds — no sourcing tier-D cities.

## Output format

```
## Weekly Lead Source — YYYY-MM-DD

### Under-pipelined verticals (top 2)
- vertical_brewery (5 active, target 15)
- vertical_industrial_mfg (3 active, target 20)

### Candidates surfaced
| vertical | company | city | state | hypothesized_interest | source_url |
| vertical_brewery | ... | Asheville | NC | gma_48x40_new | https://... |

### Awaiting owner approval
<list of candidate IDs with promote command>
```
