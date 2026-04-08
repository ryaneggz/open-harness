# OpenHarness: Next + Postgres + shadcn

A fully-provisioned Next.js + PostgreSQL + shadcn/ui harness for AI coding agents, built on [Open Harness](https://github.com/ryaneggz/open-harness).

**Live Demo:** [next-postgres-shadcn.ruska.dev](https://next-postgres-shadcn.ruska.dev)

## Quick Start

```bash
# Clone the harness
git clone https://github.com/ryaneggz/next-postgres-shadcn.git
cd next-postgres-shadcn

# Install dependencies and link the openharness CLI
npm run setup

# Provision — the agent handles everything
claude "/provision"
```

> **Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [Node.js](https://nodejs.org/) (v20+).

The agent will:
1. Build the Docker image with Node.js 22, agent CLIs, and dev tools
2. Start PostgreSQL + sandbox container with compose overlays
3. Install dependencies, generate Prisma client, and run migrations
4. Launch dev server + Cloudflare tunnel, then run test:setup to validate

## Stack

- **Next.js 16** (App Router, TypeScript strict, Turbopack)
- **PostgreSQL 16** (Docker Compose, isolated network)
- **Prisma 7** ORM (schema-first, auto-generated types)
- **shadcn/ui** + Tailwind CSS v4
- **next-themes** (dark mode default)
- **next-pwa** (Progressive Web App)
- **Cloudflared** tunnel → `next-postgres-shadcn.ruska.dev`

## Development

```bash
cd workspace/next-app
npm run dev                    # Dev server on 0.0.0.0:3000
npm test                       # Vitest (unit/integration)
npm run test:e2e               # Playwright E2E
npm run lint                   # ESLint
npm run format                 # Prettier
npm run type-check             # tsc --noEmit
npx prisma studio              # Browse data (port 5555)
```

## Learn More

- [Open Harness](https://github.com/ryaneggz/open-harness) — the framework for building agent harnesses
- [Next.js Documentation](https://nextjs.org/docs) — Next.js features and API
- [shadcn/ui](https://ui.shadcn.com) — component library
- [Prisma](https://www.prisma.io/docs) — database ORM
