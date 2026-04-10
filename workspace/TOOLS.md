# Tools & Environment

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Working directory**: `/home/sandbox/harness/workspace` (persisted via bind mount)
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

## Tool Use Principles

- Check `.claude/rules/` for coding-specific standards before writing code
- Use `npx shadcn@latest add <component>` for UI components — don't copy from docs
- Use Prisma for all database access — no raw SQL unless absolutely necessary
- Use `agent-browser` for QA verification at the public URL
- Use `uv` for any Python tooling, `npm` for JavaScript/TypeScript

## Common Workflows

```bash
cd projects/next-app

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
| `.ralph/prompt.md` | Agent instructions per iteration (amp) |
| `.ralph/CLAUDE.md` | Agent instructions per iteration (claude) |
| `.ralph/archives/` | Archived prd.json + progress.txt from completed runs (YYYY-MM-DD/feature/) |

**Triggered by `/implement` skill**: The implementer heartbeat picks the top validated roadmap item, generates a PRD via `/prd`, converts to prd.json via `/ralph`, injects execution rules (1:1 story iterations, browser QA, US-FINAL with draft PR + CI green), and launches `ralph.sh` in a tmux session.

**Slack notifications**: hooks send updates via `.claude/hooks/notify_slack.sh`. Configure webhook URL in `.claude/.env.claude`.
