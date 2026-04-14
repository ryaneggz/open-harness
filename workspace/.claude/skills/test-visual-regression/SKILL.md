---
name: test-visual-regression
description: |
  Compare before/after screenshots to detect visual regressions.
  Layout shift detection, missing/broken images, font rendering changes.
  TRIGGER when: comparing screenshots, checking regressions, or visual diff.
argument-hint: "<project-slug> <finding-id>"
---

# Test Visual Regression

Compare baseline screenshots against current state to detect visual regressions.

## Inputs

- **Project slug**: from parent context or `$ARGUMENTS`
- **Finding ID**: the UAT-NNN finding to compare against
- **Login state**: from parent context (if page requires auth)

## Steps

1. Load the finding from `uat/<slug>/findings.json` by ID
2. Get the baseline screenshot path from the finding's `screenshot` field
3. Get the page URL and viewport from the finding

### Capture Current State
4. Set viewport to match the original: `agent-browser set viewport <width> <height>`
5. Navigate to the same page: `agent-browser open <url>`
6. Wait for page load
7. Take a new screenshot: `uat/<slug>/screenshots/YYYY-MM-DD/regression-<finding-id>-<viewport>.png`

### Visual Comparison
8. Compare the baseline and current screenshots visually
9. Check for:
   - Layout shifts — elements moved from their original positions
   - Missing elements — something present before is now gone
   - New elements — something appeared that wasn't there before
   - Color/font changes — text rendering or styling differences
   - Broken images — images that loaded before but don't now
   - Size changes — elements that grew or shrunk significantly

### Assessment
10. If the page has been redesigned (substantially different layout), report as "CHANGED" not "regression"
11. If the specific finding is fixed but something else broke, report both the fix and the new issue
12. If nothing changed visually, the finding likely persists — report as "FAIL"

## Outputs

Return a single result object:
```json
{
  "finding_id": "UAT-NNN",
  "result": "pass|fail|changed",
  "baseline_screenshot": "original/path.png",
  "current_screenshot": "new/path.png",
  "regressions_found": [],
  "notes": "..."
}
```

Plus any new findings discovered during comparison (in standard JSON schema).

## Guards

- `findings-management.md`: dedup against existing findings
- `agent-browser.md`: match original viewport exactly

## Self-Improvement

After execution:
- Log regression detection accuracy — did visual comparison catch real issues?
- Track which types of changes are most common (layout shift vs. missing elements vs. style changes)
- If redesigns are frequent, this project is under active development — adjust expectations
