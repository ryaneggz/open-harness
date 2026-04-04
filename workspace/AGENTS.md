# OpenHarness Agent Sandbox

You are running inside an isolated Docker container provisioned for AI coding agents.

## Environment

- **OS**: Debian Bookworm (slim)
- **User**: `sandbox` (passwordless sudo)
- **Working directory**: `/home/sandbox/workspace` (persisted via bind mount)
- **Docker**: CLI + Compose available; host Docker socket mounted for container management
- **Permissions**: `--dangerously-skip-permissions` is the default for Claude Code (aliased in `.bashrc`)

## Installed Tools

All tools are installed system-wide in `/usr/local/bin` or via apt:

| Tool | Version | Usage |
|------|---------|-------|
| Node.js | 22.x | `node`, `npm`, `npx` |
| Bun | latest | `bun` |
| uv | latest | `uv` (Python package manager) |
| GitHub CLI | latest | `gh` |
| Docker | latest | `docker`, `docker compose` |
| tmux | latest | `tmux` |
| nano | latest | `nano` |
| ripgrep | latest | `rg` |
| git | latest | `git` |
| jq | latest | `jq` |
| psql | 15.x | `psql` (PostgreSQL client) |
| cloudflared | latest | `cloudflared` |

### Optional Agents (installed if selected)

| Agent | Command | Docs |
|-------|---------|------|
| Claude Code | `claude` | https://docs.anthropic.com/en/docs/claude-code |
| OpenAI Codex | `codex` | https://github.com/openai/codex |
| Pi Agent | `pi` | https://shittycodingagent.ai |
| AgentMail | `agentmail` | https://docs.agentmail.to/integrations/cli |

## Guidelines

- Work within this `workspace/` directory -- it is bind-mounted and persists across container restarts
- The Next.js project lives in `workspace/next-app/` -- run all npm commands from there
- `.openharness/` is available in the workspace root as a symlink to the project-level Open Harness config
- The `install/` directory at `~/install/` contains the provisioning script -- do not modify it
- You have full sudo access if you need to install additional system packages
- Use `docker compose` to manage services; the sandbox can reach host containers via `host.docker.internal`
- `CLAUDE.md` and `AGENTS.md` are symlinked -- editing either updates both
- Agent config directories (`.openharness/`, `.claude/`, `.codex/`) are in the workspace root

## Soul

`SOUL.md` defines your persona, tone, and behavioral boundaries. Read it to understand who you are. You may update it over time, but always tell the user when you do.

## Memory

Your long-term memory lives in two places:

- **`MEMORY.md`** -- curated, durable memories (decisions, preferences, lessons learned). Read this at session start.
- **`memory/YYYY-MM-DD.md`** -- daily append-only logs. Write notable events, decisions, and learnings here during work.

Workflow:
- At session start, read `MEMORY.md` for context
- During work, append to `memory/YYYY-MM-DD.md` (today's date)
- Periodically (during heartbeats or when asked), distill daily logs into `MEMORY.md`
- If the user says "remember this", write it to `MEMORY.md` immediately

## Heartbeat

Heartbeats are periodic tasks executed on cron schedules. Each heartbeat is a `.md` file containing instructions for the agent.

- **Schedule config**: `heartbeats.conf` in workspace root -- maps files to cron expressions
- **Format**: `<cron> | <file> | [agent] | [active_start-active_end]` (pipe-delimited)
- **Heartbeat files**: `.md` files in `heartbeats/` (default: `heartbeats/default.md`)
- **Manage from host**: `openharness heartbeat sync next-postgres-shadcn`, `openharness heartbeat stop next-postgres-shadcn`, `openharness heartbeat status next-postgres-shadcn`
- **Logs**: `~/.heartbeat/heartbeat.log` inside the container
- Schedules auto-sync on container startup from `heartbeats.conf`
- If a heartbeat file is empty (only headers/comments), that execution is skipped to save API costs
- If nothing needs attention, reply `HEARTBEAT_OK`

## Stack: Next.js + TypeScript + PostgreSQL + shadcn/ui

This sandbox is configured as a Full Stack Developer harness. The project lives in `next-app/`.

### Services

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL 16 | `postgres` | 5432 | `sandbox` / `sandbox` / `sandbox` |
| Next.js Dev Server | `localhost` | 3000 | -- |
| Prisma Studio | `localhost` | 5555 | -- |
| Cloudflared Tunnel | `next-postgres-shadcn.ruska.dev` | 443 | -- |

### Database

- **Connection string**: `$DATABASE_URL` (set in environment)
- **CLI**: `psql` (no args needed -- uses `PG*` env vars)
- **ORM**: Prisma -- schema at `next-app/prisma/schema.prisma`
- **Migrations**: `npx prisma migrate dev --name <name>` (create), `npx prisma migrate deploy` (apply)
- **Generate client**: `npx prisma generate` (after schema changes)
- **Studio**: `npx prisma studio` (browse data on port 5555)

### Next.js

- **Dev server**: `npm run dev` (port 3000, exposed to host and via cloudflared)
- **Build**: `npm run build`
- **Project structure**: App Router in `next-app/src/app/`, components in `next-app/src/components/`, utilities in `next-app/src/lib/`
- **TypeScript**: Strict mode enabled

### shadcn/ui

- **Add components**: `npx shadcn@latest add <component>` (e.g., `button`, `card`, `dialog`, `table`)
- **Components directory**: `next-app/src/components/ui/`
- **Theming**: Tailwind CSS with CSS variables in `next-app/src/app/globals.css`

### Color Theme (Light / Dark / System)

- **Provider**: `next-themes` wraps the app in `next-app/src/app/layout.tsx`
- **Default**: `system` (follows OS preference)
- **Modes**: `light`, `dark`, `system`
- **Usage**: `import { useTheme } from "next-themes"` then `const { theme, setTheme } = useTheme()`
- **CSS**: Use Tailwind `dark:` variants for dark-mode styles (shadcn components support this automatically)

### PWA (Progressive Web App)

- **Config**: `next-pwa` in `next-app/next.config.ts` (disabled in development)
- **Manifest**: `next-app/public/manifest.json`
- **Icons**: Add `icon-192x192.png` and `icon-512x512.png` to `next-app/public/`
- **Service worker**: Auto-generated by next-pwa on production build

### Testing

- **Unit/integration**: `npm test` (Vitest + React Testing Library)
- **E2E**: `npm run test:e2e` (Playwright, hits `next-postgres-shadcn.ruska.dev`)
- **Config**: `next-app/vitest.config.ts`, `next-app/playwright.config.ts`

### Linting & Formatting

- **Lint**: `npm run lint` (ESLint with Next.js config)
- **Format**: `npm run format` (Prettier)
- **Check**: `npm run format:check` (CI-friendly, no writes)
- **Type check**: `npm run type-check` (`tsc --noEmit`)

### Pre-commit Hooks (Husky)

- **Pre-commit**: `lint-staged` runs ESLint (`--fix`), Prettier (`--write`), then `tsc --noEmit`, then `npm test`

### CI Pipeline

GitHub Actions runs on every push (mirrors pre-commit checks):
1. Lint -> Format check -> Type check -> Build -> Test -> E2E

### Cloudflared Tunnel

- **Public URL**: `https://next-postgres-shadcn.ruska.dev`
- **Start**: `cloudflared tunnel run next-postgres-shadcn`
- **Config**: `~/.cloudflared/config.yml`
- Dev server must be running (`npm run dev`) for the tunnel to serve content

### QA with agent-browser

Use agent-browser to verify features from the user's perspective:
1. Navigate to `https://next-postgres-shadcn.ruska.dev`
2. Verify the feature works as expected
3. If something is broken, work backward from the UI to diagnose (network tab, console errors, server logs, database state)

### Common Workflows

```bash
# Enter the project
cd next-app

# Start development
npm run dev

# Add a shadcn component
npx shadcn@latest add button

# Database operations
npx prisma migrate dev --name add-users-table
npx prisma generate
npx prisma studio

# Direct database access
psql
psql -c "SELECT * FROM users"

# Run tests
npm test                    # Vitest
npm run test:e2e            # Playwright E2E

# Lint and format
npm run lint
npm run format

# Start cloudflared tunnel
cloudflared tunnel run next-postgres-shadcn

# QA via browser
# (use agent-browser to navigate to https://next-postgres-shadcn.ruska.dev)
```
