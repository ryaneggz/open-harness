# 🏗️ OpenHarness: Next + Postgres + shadcn

A fully-provisioned Next.js + PostgreSQL + shadcn/ui development environment running inside an isolated [Open Harness](https://github.com/ryaneggz/open-harness) Docker sandbox for AI coding agents.

**Live Demo:** [next-postgres-shadcn.ruska.dev](https://next-postgres-shadcn.ruska.dev)

## 🧱 Stack

- **Next.js 16** (App Router, TypeScript strict, Turbopack)
- **PostgreSQL 16** (Docker Compose, isolated network)
- **Prisma 7** ORM (schema-first, auto-generated types)
- **shadcn/ui** + Tailwind CSS v4
- **next-themes** (dark mode default)
- **next-pwa** (Progressive Web App)
- **Cloudflared** tunnel → `next-postgres-shadcn.ruska.dev`
- **Ralph** (autonomous agent loop)

---

## ⚡ Quick Start

```bash
# Clone the harness
git clone https://github.com/ryaneggz/next-postgres-shadcn.git
cd next-postgres-shadcn

# Install the CLI
npm run setup

# Provision — the agent handles everything
claude --permission-mode plan -p "Provision this harness"
```

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Node.js](https://nodejs.org/) (v20+).

The agent will:
1. Build the Docker image and start PostgreSQL + sandbox container
2. Generate an SSH key — gives you the public key to add to GitHub
3. Pause for auth: `cloudflared login`, `gh auth login`
4. After you confirm, configure the tunnel and start the dev server

### 🖥️ Dev Container (Optional)

This repo can also be used as a standalone Dev Container without the orchestrator:

1. **Clone the repo**:

```bash
git clone https://github.com/ryaneggz/next-postgres-shadcn.git
cd next-postgres-shadcn
```

2. **Open in VS Code** and select **"Reopen in Container"** (`Ctrl+Shift+P` → `Dev Containers: Reopen in Container`).

   **Or run manually**:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d
ssh orchestrator@localhost -p 2222   # password: test1234
```

| Field | Value |
|-------|-------|
| User | `orchestrator` |
| Password (SSH + sudo) | `test1234` |
| SSH Port | `2222` |

> Requires VS Code with the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers).

---

## 📁 Project Structure

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

## 🔧 Post-Provisioning Setup (One-Time)

These steps require manual authentication regardless of how you started the environment:

### ☁️ Cloudflare Tunnel

Exposes the dev server at `next-postgres-shadcn.ruska.dev`:

```bash
cloudflared login                                                         # Opens browser for Cloudflare auth (one-time)
~/install/cloudflared-tunnel.sh next-postgres-shadcn next-postgres-shadcn.ruska.dev 3000  # Creates tunnel, config, DNS route
cloudflared tunnel --config ~/.cloudflared/config-next-postgres-shadcn.yml run next-postgres-shadcn  # Start the tunnel
```

### 🔑 GitHub CLI

```bash
gh auth login
```

### ⚙️ Environment Variables

Set in `next-app/.env` or container env:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://sandbox:sandbox@postgres:5432/sandbox` | PostgreSQL connection (set via compose) |
| `CLOUDFLARE_TUNNEL_TOKEN` | _(unset)_ | From `cloudflared tunnel create` output (optional) |

---

## 🐳 Services

| Service | Host | Port | Credentials |
|---------|------|------|-------------|
| PostgreSQL 16 | `postgres` | 5432 | `sandbox` / `sandbox` / `sandbox` |
| Next.js Dev Server | `localhost` | 3000 | — |
| Prisma Studio | `localhost` | 5555 | — |
| Cloudflared Tunnel | `next-postgres-shadcn.ruska.dev` | 443 | — |

---

## 💻 Development

### 🚀 Start Developing

```bash
cd workspace/next-app
npm run dev                                           # Dev server on port 3000
cloudflared tunnel --config ~/.cloudflared/config-next-postgres-shadcn.yml run next-postgres-shadcn  # Expose publicly (optional)
claude                                                # Start AI agent
```

### 🛠️ Common Commands

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

### 🔄 Development Workflow

| Step | Command | When |
|------|---------|------|
| Lint + Format + Type-check + Test | automatic | On every `git commit` (Husky pre-commit) |
| CI pipeline | automatic | On every `git push` (GitHub Actions) |
| QA | agent-browser | Navigate to `https://next-postgres-shadcn.ruska.dev` |
| Build health | heartbeat | Every 30 min during 9am–9pm |

---

## 🤖 Ralph (Autonomous Agent Loop)

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

## 🧠 Agent Identity & Memory

| File | Purpose | Authored by |
|------|---------|-------------|
| `SOUL.md` | Agent persona, tone, boundaries | User (seeded), agent evolves |
| `MEMORY.md` | Curated long-term memory | Agent (distilled from daily logs) |
| `heartbeats.conf` | Heartbeat schedule config | User |
| `heartbeats/*.md` | Heartbeat task files | User |
| `memory/YYYY-MM-DD.md` | Daily append-only logs | Agent |

---

## 🔒 Sandbox Management

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

### Dev Container Teardown (if using Dev Container)

```bash
docker compose -f .devcontainer/docker-compose.yml down
```

---

## 📦 Versioning

This project uses **calendar versioning** (`YYYY.M.D`), matching the [Open Harness](https://github.com/ryaneggz/open-harness) convention.

| Branch | Purpose |
|--------|---------|
| `development` | Active development (default branch) |
| `master` | Stable releases |

### 🏷️ Creating a release

```bash
# Tag from master after merging stable changes
git tag 2026.4.6
git push origin 2026.4.6
```

Pushing a calver tag triggers the release workflow which:
1. Runs the full CI pipeline (lint, format, type-check, build, test, E2E)
2. Builds and pushes a Docker image to `ghcr.io/ryaneggz/next-postgres-shadcn:<version>`
3. Creates a GitHub Release with auto-generated release notes
