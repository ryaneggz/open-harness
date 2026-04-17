# Operating Procedures

## Rules

1. Read IDENTITY.md, USER.md, and MEMORY.md at session start
2. Work within `workspace/` — it persists across container restarts
3. The Next.js project lives in `projects/next-app/` — run all pnpm commands from there
4. Do not modify `~/install/` — those are provisioning scripts
5. Coding standards live in `.claude/rules/` — they load automatically
6. After every `git push`, run `/ci-status` to confirm CI is green
7. Never push to `main` or `development` directly — use feature branches and PRs
8. Never skip pre-commit hooks (`--no-verify`)
9. Memory protocol runs at the end of every task (see below)
10. `CLAUDE.md` and `AGENTS.md` are symlinked; `MEMORY.md` symlinks to `.slack/MEMORY.md` — editing either updates both
11. Run `/repair` at the end of every session to verify the stack is healthy (dev server, tunnel, DB, public URL)

## File Responsibilities

| File | Owns | Does NOT contain |
|------|------|-----------------|
| IDENTITY.md | Name, role, mission, stack, URLs | Procedures, personality |
| USER.md | Owner prefs, constraints, goals | Stack details, procedures |
| SOUL.md | Personality, tone, values, guardrails | Coding standards, procedures |
| AGENTS.md | Operating procedures, decision rules | Environment details, tool reference |
| TOOLS.md | Environment, tools, services, workflows | Personality, procedures |
| HEARTBEAT.md | Meta-maintenance routines | Task heartbeats (those are in `heartbeats/`) |
| MEMORY.md | Learned decisions, lessons, triage history (symlinked to .slack/MEMORY.md) | Static stack info (that's in IDENTITY.md) |

## Decision Rules

- New personality/tone insight -> SOUL.md
- New user preference or constraint -> USER.md
- New tool, service, or workflow -> TOOLS.md
- New operating rule or procedure -> AGENTS.md
- New learned fact or recurring pattern -> MEMORY.md
- New maintenance check -> HEARTBEAT.md
- New coding standard -> `.claude/rules/`

## Response Style

- Lead with working code, not explanations
- Direct and concise
- Commit messages: `<type>(#<issue>): <description>`
- PR targets `development` branch

## Memory Protocol

At the end of every task (heartbeat, skill, or interactive session):

1. **Log**: Append a structured entry to `memory/YYYY-MM-DD.md` with result, action, and one observation
2. **Qualify**: Ask — did I learn something durable? Is there a recurring pattern? Can I improve a skill?
3. **Improve**: If yes, update `MEMORY.md` (Lessons Learned or relevant section). If no, move on.
4. **Never skip**: Even no-ops get logged. The log IS the training data for self-improvement.

Log format:
```markdown
## [Activity] — HH:MM UTC
- **Result**: OP | NO-OP | SKIP
- **Item**: #<N> "<description>" (or "none")
- **Action**: [what was done]
- **Duration**: ~Xs
- **Observation**: [one sentence]
```

## Skills

Available as slash commands (`.claude/skills/`):

| Skill | When to Use |
|-------|-------------|
| `/ci-status` | After `git push` — poll CI, report pass/fail, fetch failure logs |
| `/repair` | Repair the full stack — detect environment, run tests, auto-remediate, re-verify (`pnpm run test:setup`) |
| `/release` | Cut a CalVer release — branch `release/YYYY.M.D-N`, tag, push, CI builds + pushes to GHCR |
| `/destroy` | Tear down sandbox — stop containers, remove volumes, optionally prune image |
| `/delegate` | Decompose plan into tasks, spawn parallel worker agents in waves |
| `/agent-browser` | QA features, take screenshots, debug UI at `next-postgres-shadcn.ruska.dev` |
| `/prd` | Plan a feature — generate a Product Requirements Document |
| `/ralph` | Convert a PRD to `.ralph/prd.json` for the autonomous agent loop |
| `/quality-gate` | Template: validate decisions against thresholds before acting |
| `/strategy-review` | Template: measure decision quality over time |
| `/backlog-rank` | Rank open issues by PM criteria, update pinned backlog |
| `/strategic-proposal` | Spawn 5 experts + AI council, produce signal-validated product roadmap |
| `/implement` | Pick top validated roadmap item, run Ralph loop in tmux, submit draft PR |
| `/issue-triage` | Triage unassigned GitHub issues with parallel sub-agents + council |

**Important:** After every `git push`, run `/ci-status` to confirm CI is green. Work is not done until CI passes.

## Heartbeats

- **Schedule**: `heartbeats.conf` — maps `.md` files to cron expressions
- **Task files**: `heartbeats/` directory
- **Logs**: `heartbeats/heartbeat.log`
- If nothing needs attention, reply `HEARTBEAT_OK`

## Sub-Agents

Parallel planning agents in `.claude/agents/`:

| Agent | Perspective |
|-------|------------|
| Implementer | "Here's how I'd build this" |
| Critic | "Here's what could go wrong" |
| PM | "Here's how to break it down" |
| Council | Synthesizes all three (opus) |
| Expert: Product | "What data models + features does this SaaS need?" |
| Expert: Docs | "How should Open Harness docs + fork showcase work?" |
| Expert: Security | "What auth + access control foundation is needed?" |
| Expert: Registry | "How should Docker registry curation + licensing work?" |
| Expert: Agent Systems | "What agent capability accelerates building this?" |
| Strategic Critic | Challenges council's draft roadmap — signal, feasibility, phase rigor |
| Strategic Council | Synthesizes 5 expert proposals into signal-validated roadmap (opus) |

## Slack Interface

The Slack bot runs as a tmux session (`tmux attach -t slack`) providing Slack-based access to this workspace.
Shares the same skills (`.claude/skills/`), memory (`.slack/MEMORY.md`), and agent config as claude/codex/pi.
Auto-starts on container boot when `SLACK_APP_TOKEN` and `SLACK_BOT_TOKEN` are set.
