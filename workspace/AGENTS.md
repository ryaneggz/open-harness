# OpenHarness Agent Sandbox

You are running inside an isolated Docker container provisioned for AI coding agents.

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Working directory**: `/home/sandbox/workspace` (persisted via bind mount)
- **Docker**: CLI + Compose available; host Docker socket mounted for container management
- **Node.js**: 22.x required (enforced via `.nvmrc` and `engines`)
- **Permissions**: `--dangerously-skip-permissions` is the default for Claude Code (aliased in `.bashrc`)

## Installed Tools

| Tool | Usage |
|------|-------|
| Node.js 22.x | `node`, `npm`, `npx` |
| uv | `uv` (Python package manager) |
| GitHub CLI | `gh` |
| Docker | `docker`, `docker compose` |
| tmux | `tmux` |
| ripgrep | `rg` |
| git | `git` |
| jq | `jq` |
| psql | `psql` (PostgreSQL client) |
| cloudflared | `cloudflared` |
| Claude Code | `claude` |
| Codex | `codex` |
| Pi Agent | `pi` |

## Guidelines

- Work within `workspace/` -- it persists across container restarts
- The Next.js project lives in `next-app/` -- run all npm commands from there
- Do not modify `~/install/` -- those are provisioning scripts
- `CLAUDE.md` and `AGENTS.md` are symlinked -- editing either updates both
- Coding standards and patterns are in `.claude/rules/` -- they load automatically

## Skills

Available as slash commands (`.claude/skills/`):

| Skill | When to Use |
|-------|-------------|
| `/ci-status` | After `git push` -- poll CI, report pass/fail, fetch failure logs |
| `/agent-browser` | QA features, take screenshots, debug UI at `next-postgres-shadcn.ruska.dev` |
| `/prd` | Plan a feature -- generate a Product Requirements Document |
| `/ralph` | Convert a PRD to `.ralph/prd.json` for the autonomous agent loop |
| `/quality-gate` | Template: validate decisions against thresholds before acting |
| `/strategy-review` | Template: measure decision quality over time |

**Important:** After every `git push`, run `/ci-status` to confirm CI is green. Work is not done until CI passes.

## Soul & Memory

- **`SOUL.md`** -- your persona, practices, and boundaries. Read it to understand who you are.
- **`MEMORY.md`** -- curated long-term memory. Read at session start.
- **`memory/YYYY-MM-DD.md`** -- daily append-only logs. Write notable events during work.

## Services

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL 16 | `postgres` | 5432 | `sandbox` / `sandbox` / `sandbox` |
| Next.js Dev Server | `localhost` | 3000 | -- |
| Prisma Studio | `localhost` | 5555 | -- |
| Cloudflared Tunnel | `next-postgres-shadcn.ruska.dev` | 443 | -- |

## Cloudflared Tunnel

- **Public URL**: `https://next-postgres-shadcn.ruska.dev`
- **Config**: `~/.cloudflared/config-next-postgres-shadcn.yml`
- **Start**: `cloudflared tunnel --config ~/.cloudflared/config-next-postgres-shadcn.yml run next-postgres-shadcn`
- Dev server must be running (`npm run dev`) for the tunnel to serve content
- **First-time setup**: `cloudflared login` then `~/install/cloudflared-tunnel.sh next-postgres-shadcn next-postgres-shadcn.ruska.dev 3000`

## Heartbeat

- **Schedule config**: `heartbeats.conf` -- maps files to cron expressions
- **Format**: `<cron> | <file> | [agent] | [active_start-active_end]`
- **Heartbeat files**: `heartbeats/*.md`
- **Logs**: `~/.heartbeat/heartbeat.log`
- If nothing needs attention, reply `HEARTBEAT_OK`

## Common Workflows

```bash
cd next-app

npm run dev                                   # Dev server (port 3000, 0.0.0.0)
npx shadcn@latest add button                  # Add shadcn component
npx prisma migrate dev --name add-users       # Create migration
npx prisma generate                           # Regenerate client
npx prisma studio                             # Browse data (port 5555)
psql -c "SELECT * FROM users"                 # Direct SQL
npm test                                      # Vitest
npm run test:e2e                              # Playwright E2E
npm run lint && npm run format                # Lint + format
cloudflared tunnel --config ~/.cloudflared/config-next-postgres-shadcn.yml run next-postgres-shadcn
```

## Ralph (Autonomous Agent Loop)

Works through a PRD, implementing user stories one at a time in a loop.

| File | Purpose |
|------|---------|
| `.ralph/prd.json` | User stories with `passes: true/false` |
| `.ralph/progress.txt` | Append-only log + Codebase Patterns section |
| `.ralph/prompt.md` | Agent instructions per iteration |

**Slack notifications**: hooks send updates via `.claude/hooks/notify_slack.sh`. Configure webhook URL in `.claude/.env.claude`.
