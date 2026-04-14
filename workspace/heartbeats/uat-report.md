# UAT Status Report

Compile and report current UAT findings status across all projects.

## Tasks

1. Read `uat/projects.json` to get the list of registered projects
2. For each project:
   a. Read `uat/<slug>/findings.json`
   b. Count open findings by severity
   c. Check if any new pages/flows have been added to the app since last sweep:
      - Open the app root with `agent-browser open <url>`
      - Take an accessibility snapshot (`agent-browser snapshot -c`)
      - Compare discovered links against `uat/<slug>/test-plan.md`
      - Close browser session (`agent-browser close`)
   d. If new pages found, note them but do NOT run a full sweep (requires `/visual-uat`)
3. Regenerate `uat/<slug>/findings.md` from current `findings.json` for each project
4. Output a cross-project summary:

## Output Format

### Cross-Project Summary

| Project | URL | Open | Critical | High | Medium | Low | Last Sweep | New Pages? |
|---------|-----|------|----------|------|--------|-----|------------|------------|

### Per-Project Details

For each project with open findings, list the top 5 by severity.

### Recommendations

- "Run `/visual-uat <slug>`" if new pages were found
- "Run `/recheck <slug> all open`" if findings are stale (> 7 days since last recheck)
- "No action needed" if all projects are clean

## Reporting

- If no projects registered, reply `HEARTBEAT_OK — no projects registered`
- If all projects clean and no new pages, reply `HEARTBEAT_OK`
- Otherwise, output the summary table and recommendations

## Memory Protocol

Append to `memory/YYYY-MM-DD.md`:
- Result: OP (if changes) or NO-OP (if clean)
- Action: summary of what was checked
- Observation: one sentence
