# Plan: Daily PM Backlog Curation Heartbeat

## Context

The orchestrator needs a daily heartbeat that acts as a PM — querying all open GitHub issues, ranking them by strategic value, and maintaining a curated "Top 10 Feature Backlog" visible in the repo. Currently, issue-triage runs hourly to process individual unassigned issues, but there's no holistic backlog prioritization. This heartbeat fills that gap by producing a daily ranked snapshot tracked as a pinned GitHub issue.

## Architecture

Follows the exact pattern of issue-triage: **heartbeat .md delegates to a skill**.

- Single-pass Claude prompt (no sub-agents) — ranking requires holistic cross-issue comparison in one context window
- Tracking via a **pinned GitHub issue** with label `backlog` — no commits needed, visible to all stakeholders
- Idempotent — if ranking is unchanged, returns `HEARTBEAT_OK` without mutation

## Files to Create

### 1. `workspace/.claude/skills/backlog-rank/SKILL.md`

The core skill with this flow:

```
Query all open issues (gh api) → Find/create pinned tracking issue → 
Rank by weighted PM criteria → Compare with current ranking → 
Update if changed → Memory protocol
```

**Ranking criteria (weighted score 0–100):**

| Criterion | Weight | Signal |
|-----------|--------|--------|
| Strategic value | 25% | Labels (`enhancement` highest), title/body analysis |
| Community signal | 20% | Reactions + comment count |
| Feasibility | 20% | Spec completeness, has acceptance criteria |
| Dependencies | 15% | Cross-references, blocked/blocking status |
| Age | 10% | Older issues get modest boost (prevent starvation) |
| Staleness | 10% | Recently active issues score higher |

**Pinned issue output format:**
```markdown
# Feature Backlog — Top 10
> Last updated: YYYY-MM-DD HH:MM UTC

| Rank | Issue | Score | Strategic | Community | Feasibility | Deps | Age | Fresh |
|------|-------|-------|-----------|-----------|-------------|------|-----|-------|
| 1    | #N: Title | 85 | 25 | 18 | 20 | 15 | 4 | 3 |

## Changes Since Last Ranking
- [position changes, new/dropped entries]

## Gaps Observed
- [up to 3 pattern observations, e.g. "multiple auth issues but no session mgmt proposal"]
```

**Guards:**
- If `gh` CLI not authenticated → SKIP
- If zero open issues → update pinned issue to "Backlog empty", HEARTBEAT_OK
- If ranking unchanged (same issues, same order) → HEARTBEAT_OK without mutation
- If <10 enhancements → fill remaining slots with top issues of other types, marked clearly

**One-time setup within skill:**
- Create `backlog` label if missing: `gh label create backlog ...`
- Create + pin tracking issue if none exists with `backlog` label

### 2. `workspace/heartbeats/backlog-rank.md`

Thin heartbeat file (follows `issue-triage.md` pattern exactly):

```markdown
# Daily Feature Backlog Ranking

Curate and rank open issues by PM criteria, updating the pinned backlog
tracking issue with a prioritized top-10 list.

## Tasks

1. Run the `/backlog-rank` skill — it handles all logic
2. If ranking unchanged or no issues, reply `HEARTBEAT_OK`
3. If ranking updated, report top-3 position changes
4. Run the Memory Improvement Protocol (AGENTS.md)

## Reporting

- Unchanged/empty: `HEARTBEAT_OK`
- Updated: pinned issue number + top-3 changes
- Append summary to `memory/YYYY-MM-DD.md`
```

## Files to Edit

### 3. `workspace/heartbeats.conf` — append one line

```
0 8 * * * | heartbeats/backlog-rank.md | claude
```

Schedule: **08:00 UTC daily** — after overnight triage cycles, before US workday.

### 4. `workspace/IDENTITY.md` — update Heartbeats line

```
- **Heartbeats**: Build health (every 30m, 9am-9pm), Issue triage (every hour, 24/7), Backlog ranking (daily 08:00 UTC)
```

### 5. `workspace/AGENTS.md` (symlinked to `workspace/CLAUDE.md`) — add to Skills table

```
| `/backlog-rank` | Rank open issues by PM criteria, update pinned backlog |
```

## Post-implementation: Sync heartbeat cron

```bash
# Inside the sandbox container
heartbeat.sh sync
```

This reads the updated `heartbeats.conf` and installs the new crontab entry.

## Verification

1. **Skill smoke test**: Run `/backlog-rank` manually — confirm it queries issues, creates the label + pinned issue, and produces the ranked table
2. **Idempotency**: Run `/backlog-rank` again immediately — confirm it returns `HEARTBEAT_OK` (no change)
3. **Heartbeat integration**: Verify `heartbeat.sh sync` picks up the new entry: `heartbeat.sh status` should show the `0 8 * * *` schedule
4. **Memory protocol**: Check `memory/YYYY-MM-DD.md` for the structured log entry after each run
