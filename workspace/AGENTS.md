# Operating Procedures

## Rules

1. Read IDENTITY.md, USER.md, MEMORY.md at session start
2. Work within `workspace/` — persists across restarts
3. Next.js project: `projects/next-app/` — run pnpm from there
4. Don't modify `~/install/` (provisioning scripts)
5. `.claude/rules/` loads automatically
6. After `git push`, run `/ci-status` — work not done until CI green
7. Never push `main` or `development` — feature branches + PRs
8. Never skip pre-commit hooks (`--no-verify`)
9. Memory protocol end of every task (below)
10. `CLAUDE.md` symlinks `AGENTS.md`; `MEMORY.md` symlinks `.slack/MEMORY.md`
11. Run `/repair` end of session — verify stack health

## File Responsibilities

| File | Owns | Does NOT contain |
|------|------|-----------------|
| IDENTITY.md | Name, role, mission, stack, URLs | Procedures, personality |
| USER.md | Owner prefs, constraints, goals | Stack details, procedures |
| SOUL.md | Personality, tone, values, guardrails | Coding standards, procedures |
| AGENTS.md | Operating procedures, decision rules | Environment details, tool reference |
| TOOLS.md | Environment, tools, services, workflows | Personality, procedures |
| HEARTBEAT.md | Meta-maintenance routines | Task heartbeats (in `heartbeats/`) |
| MEMORY.md | Learned decisions, lessons, triage history | Static stack info (in IDENTITY.md) |

## Decision Rules

- Personality/tone -> SOUL.md
- User preference/constraint -> USER.md
- Tool/service/workflow -> TOOLS.md
- Operating rule/procedure -> AGENTS.md
- Learned fact/pattern -> MEMORY.md
- Maintenance check -> HEARTBEAT.md
- Coding standard -> `.claude/rules/`

## Response Style

- Lead with code, not explanations
- Terse. Fragments OK. See `token-conservation.md` rule.
- Commits: `<type>(#<issue>): <description>`
- PRs target `development`

## Memory Protocol

End of every task (heartbeat, skill, interactive):

1. **Log**: Append to `memory/YYYY-MM-DD.md`
2. **Qualify**: Durable learning? Recurring pattern? Skill improvement?
3. **Improve**: Yes → update MEMORY.md. No → move on.
4. **Never skip**: Even no-ops logged.

```markdown
## [Activity] — HH:MM UTC
- **Result**: OP | NO-OP | SKIP
- **Item**: #<N> "<description>" (or "none")
- **Action**: [what was done]
- **Duration**: ~Xs
- **Observation**: [one sentence]
```

## Skills

| Skill | When |
|-------|------|
| `/ci-status` | After `git push` — poll CI, report pass/fail |
| `/repair` | Repair stack — detect env, test, auto-remediate |
| `/release` | CalVer release — branch, tag, push, GHCR |
| `/destroy` | Tear down — stop containers, remove volumes |
| `/delegate` | Decompose plan → parallel worker agents |
| `/agent-browser` | QA features, screenshots, debug UI |
| `/compress` | Compress identity files/rules (~46% token savings) |
| `/prd` | Generate Product Requirements Document |
| `/ralph` | Convert PRD to `.ralph/prd.json` |
| `/quality-gate` | Validate decisions against thresholds |
| `/strategy-review` | Measure decision quality over time |
| `/backlog-rank` | Rank issues by PM criteria |
| `/strategic-proposal` | 5 experts + AI council → roadmap |
| `/implement` | Top roadmap item → Ralph loop → draft PR |
| `/issue-triage` | Triage issues with sub-agents + council |

After `git push` → `/ci-status`. Not done until CI green.

## Heartbeats

- Schedule: `heartbeats.conf` maps `.md` to cron
- Tasks: `heartbeats/` directory
- Logs: `~/.heartbeat/heartbeat.log`
- Nothing to do → `HEARTBEAT_OK`

## Sub-Agents

Parallel agents in `.claude/agents/`:

| Agent | Perspective |
|-------|------------|
| Implementer | "How I'd build this" |
| Critic | "What could go wrong" |
| PM | "How to break it down" |
| Council | Synthesizes all three (opus) |
| Expert: Product | Data models + features |
| Expert: Docs | Docs + fork showcase |
| Expert: Security | Auth + access control |
| Expert: Registry | Docker registry + licensing |
| Expert: Agent Systems | Agent capabilities |
| Strategic Critic | Challenges roadmap |
| Strategic Council | Synthesizes 5 proposals → roadmap (opus) |

## Slack

Slack bot: `tmux attach -t slack`. Shares skills, memory, agent config.
Auto-starts when `SLACK_APP_TOKEN` + `SLACK_BOT_TOKEN` set.
