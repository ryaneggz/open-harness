---
name: visual-uat
description: |
  Run a full visual UAT sweep of a deployed web application.
  Navigate all user flows via agent-browser, screenshot each state,
  identify bugs, deduplicate findings, rank by impact, output as user stories.
  Maintains a top-20 findings list per project.
  TRIGGER when: user asks to test the app, run UAT, check for bugs,
  do a visual review, start a new test cycle, or "visual-uat".
argument-hint: "<project-slug>"
---

# Visual UAT

Systematically test a deployed web application by navigating every user flow
through agent-browser, capturing screenshots, identifying issues, and producing
a deduplicated, impact-ranked top-20 findings report as user stories.

## Instructions

### Phase 1: Setup

1. Parse argument: `$ARGUMENTS` must be a project slug. If empty, list registered projects from `uat/projects.json` and ask which to test.
2. Look up the project in `uat/projects.json`. If not found, ask for: slug, name, URL, login instructions. Register it and create the directory structure (`uat/<slug>/findings.json`, `findings.md`, `findings-archive.json`, `test-plan.md`, `screenshots/`).
3. Read `MEMORY.md` for prior findings and learned patterns for this project.
4. Read `uat/<slug>/findings.json` for existing findings (to deduplicate against).
5. Read `uat/<slug>/test-plan.md` for known flows to cover.
6. Create today's screenshot directory: `uat/<slug>/screenshots/YYYY-MM-DD/`.

### Phase 2: Discovery

7. Open the app root URL: `agent-browser --session uat-<slug> open <url>`.
8. Take an accessibility snapshot: `agent-browser snapshot -i` to discover all interactive elements and navigation links.
9. Build/update `uat/<slug>/test-plan.md` with every discoverable page and flow.
10. Categorize flows: authentication, CRUD operations, navigation, forms, settings.

### Phase 3: Systematic Testing

Delegate to focused sub-agents for parallel testing. For each discovered page/flow:

11. **Spawn A11y Auditor** (per page): Run `/test-a11y` — WCAG compliance, keyboard nav, focus indicators, ARIA, alt text, heading hierarchy, color contrast, screen reader landmarks.

12. **Spawn Responsive Tester** (per page): Run `/test-responsive` — cycle through 3 viewports (1920x1080 desktop, 768x1024 tablet, 375x812 mobile), screenshot each, check layout breakage, text overflow, touch targets, image scaling.

13. **Spawn Flow Walker** (per flow): Based on flow type, invoke the matching skill:
    - Authentication flow -> `/test-auth`
    - Form flow -> `/test-forms`
    - Navigation flow -> `/test-nav`
    - CRUD flow -> `/test-crud`
    - Search flow -> `/test-search`

14. For each page/flow, also check manually:
    - All images load (no broken images)
    - Text is readable (no overflow, no truncation of critical info)
    - Loading states exist (not just blank screens)
    - Error states are user-friendly

### Phase 4: Finding Registration

15. Collect all findings from sub-agents and manual checks.
16. For each finding:
    a. Check `uat/<slug>/findings.json` for duplicates (same page_url + same category + similar title).
    b. If duplicate: increment `occurrences`, add new screenshot path, skip creating new entry.
    c. If new: assign next UAT-NNN id, classify severity, write to findings array.
    d. Compose user story:
       `As a [user type], I [action], but [observed behavior] instead of [expected behavior]. Impact: [severity].`
    e. Include: steps_to_reproduce, expected_behavior, actual_behavior, screenshot path, viewport, page_url, found_date.

### Phase 5: Report Generation

17. Sort findings by severity (critical first), then by occurrences (most frequent first).
18. **Enforce top-20 cap**: If findings exceed 20, move the lowest-ranked items to `uat/<slug>/findings-archive.json`. The active `findings.json` always has at most 20 entries.
19. Update the meta block in findings.json (total_findings, by_severity, last_full_sweep).
20. Regenerate `uat/<slug>/findings.md` from findings.json with:
    - Summary table (total, by severity)
    - Findings list sorted by severity, each with user story, steps, screenshots
    - Coverage stats (pages tested, flows tested, viewports tested)

### Phase 6: Memory Protocol

21. Append to `memory/YYYY-MM-DD.md`:
    ```
    ## Visual UAT — HH:MM UTC
    - **Result**: OP
    - **Item**: uat/<slug>
    - **Action**: Full sweep — N pages, M flows, P findings (X critical, Y high, Z medium, W low)
    - **Duration**: ~Xs
    - **Observation**: [one sentence]
    ```
22. Update MEMORY.md "Projects Under Test" table.
23. Update MEMORY.md "Skill Effectiveness" and "Agent Effectiveness" tables.
24. Qualify: did I discover a new testing pattern? Should I update a skill's steps? Should I refine an agent's workflow?
25. If yes, apply improvements directly to skill/agent/rule files.
26. Close the browser session: `agent-browser close`.

## Severity Classification

| Level | Score | Criteria | Examples |
|-------|-------|----------|---------|
| Critical | 4 | App crash, data loss, auth bypass, complete blocker | White screen of death, can't log in, data saved to wrong user |
| High | 3 | Broken flow, wrong data, missing critical feature | Form submits but data not saved, nav leads to 404, search returns wrong results |
| Medium | 2 | Visual glitch, poor UX, a11y violation (WCAG A) | Button overlaps text, no focus indicator, missing alt text, confusing layout |
| Low | 1 | Cosmetic, minor alignment, nice-to-have | 1px misalignment, inconsistent padding, could-be-better wording |

Tiebreaker: frequency (pages affected) then user-facing-ness (public page > admin page).

## Finding Schema

Each finding in findings.json:

```json
{
  "id": "UAT-001",
  "title": "Short description",
  "severity": "critical|high|medium|low",
  "category": "broken-flow|wrong-data|visual-glitch|accessibility|ux-issue|performance",
  "status": "open|fixed|wont-fix|duplicate",
  "occurrences": 1,
  "user_story": "As a [user type], I [action], but [observed] instead of [expected].",
  "steps_to_reproduce": ["Step 1", "Step 2"],
  "expected_behavior": "...",
  "actual_behavior": "...",
  "screenshot": "uat/<slug>/screenshots/YYYY-MM-DD/flow-step-viewport.png",
  "viewport": "1920x1080",
  "page_url": "/specific-page",
  "found_date": "YYYY-MM-DD",
  "recheck_history": []
}
```

## Guidelines

- Always close agent-browser sessions when done (`agent-browser close`)
- Never spend more than 5 minutes on a single page — move on and come back
- If login fails, STOP and ask the user for updated credentials
- Take screenshots BEFORE and AFTER interactions for comparison
- Use `--session uat-<slug>` for session isolation
- Sub-agents return findings in the same JSON schema — merge, don't reformat

## Self-Improvement

After each sweep:
- Log which skills/agents found the most issues
- If a skill consistently finds nothing on this project, skip it in future sweeps (note in MEMORY.md)
- If a new page type or flow pattern emerges, evaluate adding a new skill or agent
- Update MEMORY.md effectiveness tables
