# MEMORY.md — Long-Term Memory

<!--
  This file stores curated, durable memories across sessions.
  The agent reads it at session start and updates it as needed.

  Daily logs go to memory/YYYY-MM-DD.md (append-only).
  Periodically distill daily logs into this file during heartbeats.
-->

## Decisions & Preferences

- **Framework**: Next.js 15+ with App Router (not Pages Router)
- **Language**: TypeScript with strict mode enabled
- **Database**: PostgreSQL 16 via Docker Compose on isolated network (`next-postgres-shadcn-devnet`)
- **ORM**: Prisma — schema-first, auto-generated types, migrations via `prisma migrate dev`
- **UI**: shadcn/ui components with Tailwind CSS — add via `npx shadcn@latest add <component>`
- **Testing**: Vitest for unit/integration, React Testing Library for components, Playwright for E2E
- **Linting**: ESLint (Next.js config) + Prettier, enforced via lint-staged on pre-commit
- **Hooks**: Husky — pre-commit: lint-staged (ESLint, Prettier, tsc --noEmit); pre-push: npm test
- **CI**: GitHub Actions mirrors pre-commit checks (lint, format, type-check, build, test, E2E) on every push
- **Package manager**: npm (not yarn, not pnpm, not bun for this project)
- **Project location**: `next-app/` subdirectory within workspace (agent files stay at workspace root)
- **Project structure**: `next-app/src/app/` for routes, `next-app/src/components/` for UI, `next-app/src/lib/` for utilities, `next-app/prisma/` for schema

## Lessons Learned

<!-- Populated by the agent over time -->

## Project Context

- **Public URL**: `https://next-postgres-shadcn.ruska.dev` (via cloudflared tunnel)
- **Database connection**: `DATABASE_URL=postgresql://sandbox:sandbox@postgres:5432/sandbox` (set in environment)
- **PostgreSQL access**: `psql` available (uses PG* env vars, no args needed)
- **QA**: Use agent-browser to verify features at the public URL, work backward from user-facing behavior
- **Dev server**: `npm run dev` on port 3000 (exposed to host and via tunnel)
- **Prisma Studio**: `npx prisma studio` on port 5555 (local only)
