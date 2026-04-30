---
sidebar_position: 2
title: "Heartbeat Examples"
---

# Heartbeat Examples

The following examples cover common recurring task patterns. Each shows a complete heartbeat file — frontmatter and body — ready to place in `workspace/heartbeats/`.

## Daily Wiki Lint

Runs every morning at 6am UTC. Checks the wiki for structural issues — orphan pages, broken cross-references, stale content, and index corruption — and reports a summary or `HEARTBEAT_OK` if clean.

```markdown
---
schedule: "0 6 * * *"
agent: claude
---

# Daily Wiki Lint

Run a health check on the wiki to catch structural issues early.

## Tasks

1. Run the `/wiki-lint audit` skill — it handles all detection logic.
2. If the wiki is healthy (0 issues), reply `HEARTBEAT_OK`.
3. If issues are found, report the lint summary table with issue count.
4. If recurring issues are detected, consider running `/wiki-lint fix`.
5. Append summary to `memory/YYYY-MM-DD.md`.

## Reporting

- Healthy: `HEARTBEAT_OK`
- Issues found: lint summary table
- Auto-fixed: list of fixes applied
```

## Hourly CI Status Check

Polls the CI pipeline status for the current branch every hour during working hours (9am–6pm UTC). Reports failures immediately so they are caught before end of day.

```markdown
---
schedule: "0 * * * *"
agent: claude
active: 9-18
---

# Hourly CI Status Check

Check whether the current branch's CI pipeline is green.

## Tasks

1. Run `/ci-status` to poll the pipeline.
2. If all checks pass, reply `HEARTBEAT_OK`.
3. If any check fails, report:
   - Failed job names
   - First 50 lines of failure output
   - Link to the run

## Reporting

- Green: `HEARTBEAT_OK`
- Red: job names + failure excerpt
```

## Weekly Skill Audit

Runs every Monday at 9am UTC. Scores all skills for staleness and reports which are `CURRENT`, `STALE`, or `BROKEN` so the team can prioritize updates.

```markdown
---
schedule: "0 9 * * 1"
agent: claude
---

# Weekly Skill Audit

Score all workspace skills for staleness using the `/skill-lint` skill.

## Tasks

1. Run `/skill-lint` to evaluate all skills in `.claude/skills/`.
2. If all skills are `CURRENT`, reply `HEARTBEAT_OK`.
3. If any skill is `STALE` or `BROKEN`, report:
   - Skill name and verdict
   - Specific recommendation (update frontmatter, fix broken ref, etc.)
4. Append summary to `memory/YYYY-MM-DD.md`.

## Reporting

- All current: `HEARTBEAT_OK`
- Issues: verdict table with recommendations
```

## Nightly Release Check

Runs at 11:50pm UTC. Cuts a CalVer release if there are new commits since the last tag. Skips cleanly if there is nothing to release.

```markdown
---
schedule: "50 23 * * *"
agent: claude
---

# Nightly Release

Cut a CalVer release if there are new commits since the last tag.

## Tasks

1. Check for commits since the last tag:

   ```bash
   LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
   if [ -z "$LAST_TAG" ]; then
     echo "No tags exist — proceeding with release"
   else
     NEW_COMMITS=$(git rev-list "${LAST_TAG}..HEAD" --count)
     [ "$NEW_COMMITS" -eq 0 ] && echo "SKIP" || echo "RELEASE"
   fi
   ```

2. If no new commits, reply `HEARTBEAT_OK`.
3. If new commits exist, run `/release` to tag and push.
4. Report version tagged, CI status, or reason for skip.

## Reporting

- No new commits: `HEARTBEAT_OK`
- Released: version number + CI link
- Failed: error output
```

## Tips

- Keep task bodies short and deterministic. The runner has a 300-second timeout.
- If a heartbeat body is empty (only headers or comments), the runner skips the API call to avoid waste.
- A response under 300 characters that contains `HEARTBEAT_OK` is counted as success.
- Use the `active` field to restrict noisy checks to business hours instead of running them at 3am.
