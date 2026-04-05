# next-postgres-shadcn — Full Stack Developer Agent

Full Stack Developer agent building Next.js + TypeScript + PostgreSQL + shadcn/ui applications inside an isolated [Open Harness](https://github.com/ryaneggz/open-harness) sandbox.

> **Spin up a fully-provisioned full-stack development environment with AI coding agents, PostgreSQL, and a public tunnel — either as an Open Harness sandbox or a standalone Dev Container.**

## Stack

- **Next.js 15+** (App Router, TypeScript strict, `src/` directory)
- **PostgreSQL 16** (Docker Compose, isolated network)
- **Prisma** ORM (schema-first, auto-generated types)
- **shadcn/ui** + Tailwind CSS
- **next-themes** (light / dark / system)
- **next-pwa** (Progressive Web App)
- **Cloudflared** tunnel (public URL at `next-postgres-shadcn.ruska.dev`)
- **Ralph** (autonomous agent orchestrator)

---

## Quick Start

### Option A — Open Harness Sandbox (from orchestrator)

If you're running the Open Harness orchestrator, provision and enter this agent in one step:

```bash
openharness quickstart next-postgres-shadcn --base-branch development --docker
openharness shell next-postgres-shadcn
claude                                    # start the AI agent
```

### Option B — Standalone Dev Container

This branch can be used as a standalone project without the orchestrator. Clone the branch directly and open it as a Dev Container:

1. **Clone the branch**:

```bash
git clone -b agent/next-postgres-shadcn https://github.com/ryaneggz/open-harness.git next-postgres-shadcn
cd next-postgres-shadcn
```

2. **Open in VS Code** and select **"Reopen in Container"** from the Command Palette (`Ctrl+Shift+P` → `Dev Containers: Reopen in Container`). The Dev Containers extension handles everything automatically.

   **Or run manually**:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
ssh orchestrator@localhost -p 2222   # password: test1234
```

3. **Inside the container**, navigate to the workspace and start developing:

```bash
cd workspace/next-app
npm install
npm run dev                   # Dev server on port 3000
```

#### Dev Container Credentials

| Field | Value |
|-------|-------|
| User | `orchestrator` |
| Password (SSH + sudo) | `test1234` |
| SSH Port | `2222` |

#### VS Code Remote-SSH Config

Add to `~/.ssh/config` on your host:

```
Host next-postgres-shadcn
    HostName localhost
    Port 2222
    User orchestrator
```

Then connect via **Remote-SSH: Connect to Host...** → `next-postgres-shadcn`.

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Node.js](https://nodejs.org/) (v20+). VS Code with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for the Dev Container workflow.

---

## Project Structure

```
├── .devcontainer/                # Dev Container config (Dockerfile, compose, SSH)
├── docker/                       # Sandbox Docker config (Dockerfile, compose)
├── install/                      # Provisioning scripts (setup.sh, heartbeat.sh)
├── cli/                          # openharness CLI
├── packages/sandbox/             # @openharness/sandbox tools
└── workspace/                    # Agent harness (persisted via bind mount)
    ├── next-app/                 # Next.js project
    │   ├── src/app/              # App Router routes
    │   ├── src/components/       # React components (ui/ for shadcn)
    │   ├── src/lib/              # Utilities
    │   ├── prisma/               # Database schema & migrations
    │   └── public/               # Static assets + PWA manifest
    ├── .claude/                  # Agent config, skills, agents
    ├── .ralph/                   # Ralph autonomous loop (PRD, progress, prompts)
    ├── heartbeats/               # Periodic task definitions
    ├── memory/                   # Daily append-only logs
    ├── SOUL.md                   # Agent persona & boundaries
    ├── MEMORY.md                 # Curated long-term memory
    └── heartbeats.conf           # Heartbeat schedule config
```

---

## Post-Provisioning Setup (One-Time)

These steps require manual authentication regardless of how you started the environment:

### Cloudflare Tunnel

Exposes the dev server at `next-postgres-shadcn.ruska.dev`:

```bash
cloudflared tunnel login                              # Opens browser for Cloudflare auth
cloudflared tunnel create next-postgres-shadcn        # Creates tunnel credentials
cloudflared tunnel route dns next-postgres-shadcn next-postgres-shadcn.ruska.dev
cloudflared tunnel run next-postgres-shadcn           # Start the tunnel
```

### GitHub CLI

```bash
gh auth login
```

### Environment Variables

Set in `next-app/.env` or container env:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sandbox:sandbox@postgres:5432/sandbox` | PostgreSQL connection (set via compose) |
| `CLOUDFLARE_TUNNEL_TOKEN` | _(unset)_ | From `cloudflared tunnel create` output (optional) |

---

## Services

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL 16 | `postgres` | 5432 | `sandbox` / `sandbox` / `sandbox` |
| Next.js Dev Server | `localhost` | 3000 | — |
| Prisma Studio | `localhost` | 5555 | — |
| Cloudflared Tunnel | `next-postgres-shadcn.ruska.dev` | 443 | — |

---

## Development

### Start Developing

```bash
cd workspace/next-app
npm run dev                                           # Dev server on port 3000
cloudflared tunnel run next-postgres-shadcn           # Expose publicly (optional)
claude                                                # Start AI agent
```

### Common Commands

```bash
# shadcn components
npx shadcn@latest add button                          # Add a component

# Database
npx prisma migrate dev --name add-users-table         # Create migration
npx prisma generate                                   # Regenerate client
npx prisma studio                                     # Browse data (port 5555)
psql -c "SELECT * FROM users"                         # Direct SQL

# Testing
npm test                                              # Vitest (unit/integration)
npm run test:e2e                                      # Playwright E2E

# Linting & formatting
npm run lint                                          # ESLint
npm run format                                        # Prettier
npm run type-check                                    # tsc --noEmit
```

### Development Workflow

| Step | Command | When |
|------|---------|------|
| Lint + Format + Type-check + Test | automatic | On every `git commit` (Husky pre-commit) |
| CI pipeline | automatic | On every `git push` (GitHub Actions) |
| QA | agent-browser | Navigate to `https://next-postgres-shadcn.ruska.dev` |
| Build health | heartbeat | Every 30 min during 9am–9pm |

---

## Ralph (Autonomous Agent Loop)

Ralph works through a PRD, implementing user stories one at a time in a loop:

```bash
# Full workflow: plan → PRD → prd.json → loop → reflect → cleanup → PR
openharness ralph prd next-postgres-shadcn                    # Generate PRD from plan
openharness ralph setup next-postgres-shadcn                  # Convert PRD → prd.json + draft PR
openharness ralph run next-postgres-shadcn                    # Start loop in tmux (200 iterations)
openharness ralph status next-postgres-shadcn                 # Check progress
openharness ralph reflect next-postgres-shadcn                # Update MEMORY.md from session
openharness ralph cleanup next-postgres-shadcn                # Lint, format, type-check, test
openharness ralph pr next-postgres-shadcn                     # Archive run + undraft PR
```

---

## Agent Identity & Memory

| File | Purpose | Authored by |
|------|---------|-------------|
| `SOUL.md` | Agent persona, tone, boundaries | User (seeded), agent evolves |
| `MEMORY.md` | Curated long-term memory | Agent (distilled from daily logs) |
| `heartbeats.conf` | Heartbeat schedule config | User |
| `heartbeats/*.md` | Heartbeat task files | User |
| `memory/YYYY-MM-DD.md` | Daily append-only logs | Agent |

---

## Sandbox Management

```bash
# From the orchestrator
openharness shell next-postgres-shadcn     # Enter sandbox
openharness stop next-postgres-shadcn      # Stop
openharness run next-postgres-shadcn       # Restart
openharness clean next-postgres-shadcn     # Full teardown (container + image + worktree)
openharness list                           # See all running sandboxes

# Heartbeats
openharness heartbeat sync next-postgres-shadcn     # Sync schedules from heartbeats.conf
openharness heartbeat status next-postgres-shadcn   # Show schedules + recent logs
openharness heartbeat stop next-postgres-shadcn     # Remove all schedules
```

### Dev Container Teardown

```bash
docker compose -f .devcontainer/docker-compose.yml down
```
