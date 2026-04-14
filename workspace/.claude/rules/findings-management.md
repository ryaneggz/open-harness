# Findings Management

## Source of Truth

- `uat/<slug>/findings.json` is the ONLY source of truth for findings
- `uat/<slug>/findings.md` is ALWAYS regenerated from JSON — never edit it manually
- Changes to findings MUST go through findings.json first

## Deduplication

- Dedup key: `page_url` + `category` + title similarity
- If a finding matches an existing one: increment `occurrences`, add new screenshot, do NOT create a duplicate
- When in doubt, err on the side of creating a separate finding — humans can merge later

## Severity Classification

| Level | Score | Threshold |
|-------|-------|-----------|
| Critical | 4 | App crash, data loss, auth bypass, complete blocker |
| High | 3 | Broken flow, wrong data, missing critical feature |
| Medium | 2 | Visual glitch, poor UX, a11y violation (WCAG A) |
| Low | 1 | Cosmetic, alignment, nice-to-have |

## Top-20 Cap

- Active findings list capped at 20 per project
- When exceeded, move lowest-severity items to `findings-archive.json`
- When items are fixed during recheck, promote archived items back if they outrank the new 20th item
- Archive retains full finding data — nothing is lost

## Recheck Protocol

- MUST replay exact `steps_to_reproduce` from the original finding — no improvisation
- Results: PASS (fixed), FAIL (still broken), CHANGED (different bug)
- All results get a `recheck_history` entry with date, result, screenshot, notes
- PASS updates status to "fixed"; FAIL/CHANGED keep status "open"

## Self-Improvement

After each enforcement:
- If the dedup key produces false matches (different bugs marked as duplicate), tighten the similarity threshold
- If severity classification is inconsistent, add more examples to the criteria
- Log enforcement events to tune the protocol
