# next-postgres-shadcn — Full Stack Developer Agent

Full Stack Developer agent building Next.js + TypeScript + PostgreSQL + shadcn/ui applications.

Forked from [Open Harness](https://github.com/ryaneggz/open-harness)

## Stack

- **Next.js 15+** (App Router, TypeScript strict, `src/` directory)
- **PostgreSQL 16** (Docker Compose, isolated network)
- **Prisma** ORM (schema-first, auto-generated types)
- **shadcn/ui** + Tailwind CSS
- **next-themes** (light / dark / system)
- **next-pwa** (Progressive Web App)
- **Ralph** (autonomous agent orchestrator)

## Project Structure

```
workspace/                    # Agent harness (SOUL.md, MEMORY.md, heartbeats)
  next-app/                   # Next.js project
    src/app/                  # App Router routes
    src/components/           # React components (ui/ for shadcn)
    src/lib/                  # Utilities
    prisma/                   # Database schema & migrations
    public/                   # Static assets + PWA manifest
  .claude/                    # Agent config + skills
  heartbeats/                 # Periodic task definitions
  memory/                     # Daily append-only logs
```

## Getting Started

### 1. Enter the sandbox

```bash
make NAME=next-postgres-shadcn shell
```

### 2. Post-provisioning setup (one-time, requires user auth)

These steps need manual authentication:

**Cloudflare tunnel** (exposes dev server at `next-postgres-shadcn.ruska.dev`):
```bash
cloudflared tunnel login                              # Opens browser for Cloudflare auth
cloudflared tunnel create next-postgres-shadcn        # Creates tunnel credentials
# Configure DNS: CNAME next-postgres-shadcn.ruska.dev -> <tunnel-id>.cfargotunnel.com
cloudflared tunnel route dns next-postgres-shadcn next-postgres-shadcn.ruska.dev
```

**GitHub CLI** (if not pre-configured):
```bash
gh auth login
```

**Environment variables** (set in `next-app/.env` or container env):
- `DATABASE_URL` -- already set via compose (`postgresql://sandbox:sandbox@postgres:5432/sandbox`)
- `CLOUDFLARE_TUNNEL_TOKEN` -- from `cloudflared tunnel create` output (optional, for automated tunnel start)

### 3. Start developing

```bash
cd next-app
npm run dev                   # Dev server on port 3000
cloudflared tunnel run next-postgres-shadcn  # Expose at next-postgres-shadcn.ruska.dev
```

### 4. Start the AI agent

```bash
claude                        # Claude Code
```

## Development Workflow

| Step | Command | When |
|------|---------|------|
| Lint + Format + Type-check + Test | automatic | On every `git commit` (Husky pre-commit) |
| CI pipeline | automatic | On every `git push` (GitHub Actions) |
| QA | agent-browser | Navigate to `https://next-postgres-shadcn.ruska.dev` |
| Build health | heartbeat | Every 30 min during 9am-9pm |

## Management

```bash
# From orchestrator
make NAME=next-postgres-shadcn shell     # Enter sandbox
make NAME=next-postgres-shadcn stop      # Stop
make NAME=next-postgres-shadcn run       # Restart
make NAME=next-postgres-shadcn clean     # Full teardown
```
