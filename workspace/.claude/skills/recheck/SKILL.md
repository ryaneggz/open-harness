---
name: recheck
description: |
  Re-verify specific UAT findings after fixes have been deployed.
  Accept a list of issue IDs or "all open", re-test those specific flows,
  report PASS/FAIL for each, update findings.json status.
  TRIGGER when: user says issues were fixed, asks to recheck, verify fixes,
  re-test specific UAT items, or "recheck".
argument-hint: "<project-slug> [UAT-NNN, ...] | <project-slug> all open"
---

# Recheck

Re-verify previously reported UAT findings after the user confirms fixes have been deployed.

## Instructions

### 1. Parse the recheck request

Arguments received: `$ARGUMENTS`

Accept input in these forms:
- Specific IDs: `my-app UAT-003 UAT-007 UAT-012`
- Severity filter: `my-app all critical` or `my-app all high`
- All open: `my-app all open`

Extract the project slug (first argument) and the filter (remaining arguments).

### 2. Validate project

Look up the slug in `uat/projects.json`. If not found, report error and stop.

### 3. Load findings

Read `uat/<slug>/findings.json`. Filter to requested findings where status = "open".

If no matching findings found, report "No open findings match the request" and run Memory Protocol.

### 4. For each finding, re-test

a. Open the app: `agent-browser --session recheck-<slug> open <app_url>`
b. Navigate to the finding's `page_url`
c. Follow the EXACT `steps_to_reproduce` from the finding — do not improvise
d. Take a new screenshot: `uat/<slug>/screenshots/YYYY-MM-DD/recheck-UAT-NNN-<viewport>.png`
e. Compare actual behavior to `expected_behavior`
f. Determine result:
   - **PASS**: The issue is fixed — actual behavior matches expected behavior
   - **FAIL**: The issue persists — same broken behavior observed
   - **CHANGED**: Different behavior than before, but still not correct (new bug)

### 5. Spawn Visual Diff agent (optional)

If baseline screenshots exist for the finding, spawn the Visual Diff agent to compare before/after screenshots and detect visual regressions beyond the specific fix.

### 6. Update findings.json

For each rechecked finding:

**PASS**:
- Set `status` to `"fixed"`
- Append to `recheck_history`: `{ "date": "YYYY-MM-DD", "result": "pass", "screenshot": "path", "notes": "Fixed" }`

**FAIL**:
- Keep `status` as `"open"`
- Append to `recheck_history`: `{ "date": "YYYY-MM-DD", "result": "fail", "screenshot": "path", "notes": "Still broken — [description]" }`

**CHANGED**:
- Keep `status` as `"open"`
- Update `actual_behavior` with the new broken behavior
- Add new screenshot
- Append to `recheck_history`: `{ "date": "YYYY-MM-DD", "result": "changed", "screenshot": "path", "notes": "Different bug — [description]" }`

### 7. Archive promotion

After marking items as fixed:
- Count remaining open findings in `findings.json`
- If count < 20, check `uat/<slug>/findings-archive.json`
- If archived items exist, promote the highest-severity archived items back into the active list until the list reaches 20 or the archive is empty
- Update meta block in findings.json

### 8. Regenerate report

Update `uat/<slug>/findings.md` from the updated `findings.json`.

### 9. Output summary

```
## Recheck Results — <slug>

| Finding | Title | Previous Status | Result | Notes |
|---------|-------|----------------|--------|-------|
| UAT-003 | ... | open | PASS | Fixed |
| UAT-007 | ... | open | FAIL | Still broken — same behavior |
| UAT-012 | ... | open | CHANGED | Different bug — now shows 500 error |

### Summary
- Rechecked: N findings
- Fixed (PASS): N
- Still broken (FAIL): N
- Changed: N
- Promoted from archive: N
```

### 10. Close browser

`agent-browser close`

### 11. Memory Protocol

Append to `memory/YYYY-MM-DD.md`:
```
## Recheck — HH:MM UTC
- **Result**: OP
- **Item**: uat/<slug>
- **Action**: Rechecked N findings — X fixed, Y still broken, Z changed
- **Duration**: ~Xs
- **Observation**: [one sentence]
```

Update MEMORY.md Skill Effectiveness table for `/test-visual-regression` if Visual Diff was spawned.

Qualify: did any CHANGED findings reveal a pattern? Should recheck steps be refined?

## Guidelines

- Always use the EXACT steps from the original finding — do not improvise
- If the page has changed substantially (redesigned), note "CHANGED" and describe the new state
- If the app is down or login fails, report immediately — do not mark as FAIL
- Take screenshots for BOTH pass and fail — evidence is mandatory
- Close browser sessions when done

## Self-Improvement

After each recheck:
- If CHANGED findings are frequent, the app may be under active development — note in MEMORY.md
- If specific finding types are always PASS on first recheck, the fix quality is high — note the pattern
- If FAIL findings persist across 3+ rechecks, escalate severity in the recommendation
