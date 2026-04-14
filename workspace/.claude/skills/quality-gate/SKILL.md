---
name: quality-gate
description: |
  Validate findings report quality before publishing.
  Checks that all findings have required fields, valid severity,
  screenshot evidence, user story format, and dedup compliance.
  TRIGGER when: before publishing findings.md, before sharing results
  with stakeholders, or when asked to validate findings quality.
argument-hint: "<project-slug>"
---

# Findings Quality Gate

Validate that the findings report for a project meets all quality standards before it is shared with stakeholders.

## Instructions

1. Load `uat/<slug>/findings.json`
2. For each finding, check all gates
3. Report PASS/FAIL for each gate and overall
4. If any gate fails, list the specific findings that need correction

## Gates

| Gate | Threshold | Check |
|------|-----------|-------|
| **Schema completeness** | 100% | Every finding has: id, title, severity, category, status, user_story, steps_to_reproduce, screenshot, viewport, page_url, found_date |
| **Evidence attached** | 100% | Every finding's screenshot path points to an existing file |
| **User story format** | 100% | Every user_story matches: `As a [type], I [action], but [observed] instead of [expected].` |
| **Severity valid** | 100% | Every severity is one of: critical, high, medium, low |
| **No duplicates** | 0 dupes | No two findings share the same page_url + category + similar title |
| **Top-20 cap** | <= 20 | Active findings count does not exceed 20 |
| **Steps reproducible** | 100% | Every steps_to_reproduce has >= 2 numbered steps |
| **Findings sorted** | Yes | Findings are sorted by severity (critical first), then by occurrences |

## Output Format

```
FINDINGS QUALITY GATE — <slug> (YYYY-MM-DD)
=============================================
Schema completeness:  20/20  [PASS]
Evidence attached:    19/20  [FAIL — UAT-012 screenshot missing]
User story format:    20/20  [PASS]
Severity valid:       20/20  [PASS]
No duplicates:        0      [PASS]
Top-20 cap:           20     [PASS]
Steps reproducible:   20/20  [PASS]
Findings sorted:      Yes    [PASS]

Overall Gate: FAIL — 1 issue to fix
```

## Gate Logic

- If any gate FAILS, list the specific findings that need correction
- Do NOT publish findings.md until all gates pass
- After fixing issues, re-run the quality gate to confirm

## Self-Improvement

After each gate check:
- If a gate consistently fails on the same field, the skill that produces findings may need its output template updated
- If a gate never fails, consider tightening the threshold or adding a new check
