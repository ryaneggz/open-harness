# Strip Database Default, Add Nextra Docs, Slim README

## Context

Three changes requested after the CLI simplification was completed:
1. **Remove database from default** — PostgreSQL/Prisma is baked into the next-app template, startup scripts, CI, and skills. It should remain an *available* compose overlay but not be part of the default sandbox path.
2. **Nextra docs site** — Replace the bloated README (~294 lines) with a proper documentation site deployed to GitHub Pages. Detailed content (architecture, heartbeats, memory, overlays) moves there.
3. **Slim README** — Becomes a ~120-line landing page pointing to the docs site.

Threads 1 and 2 are independent. Thread 3 depends on Thread 2.

---

## Thread 1: Strip Database from Default

### A1. Delete Prisma config, schema, generated code, rules

**Delete these files/directories:**
- `workspace/projects/next-app/prisma.config.ts`
- `workspace/projects/next-app/prisma/schema.prisma`
- `workspace/projects/next-app/src/generated/prisma/` (entire directory)
- `workspace/projects/next-app/src/lib/prisma.ts`
- `workspace/.claude/rules/prisma.md`

### A2. Remove Prisma deps from package.json

**File:** `workspace/projects/next-app/package.json`
- Remove dependencies: `prisma`, `@prisma/client`, `@prisma/adapter-pg`
- Remove scripts: `predev` (prisma generate), `prebuild` (prisma generate), `prisma:generate`
- Run `pnpm install` in `workspace/projects/next-app/` to regenerate lockfile

### A3. Refactor health endpoint

**File:** `workspace/projects/next-app/src/app/api/health/route.ts`
- Remove `import { prisma }` and database service check
- Simplify HealthResponse to remove `database` field
- Keep: uptime, timestamp, status

**File:** `workspace/projects/next-app/src/app/api/health/__tests__/route.test.ts`
- Remove prisma mock, database reachability test, degraded status test
- Keep: basic health response tests

### A4. Remove database tests from setup-check

**File:** `workspace/projects/next-app/src/test/setup-check.test.ts`
- Remove 3 tests: `has DATABASE_URL set`, `has Prisma client generated`, `PostgreSQL TCP`
- Remove `DB_HOST`, `DB_PORT` constants
- Keep remaining tests (Node.js version, node_modules, pnpm-lock sync, Next.js port, public URL)

### A5. Strip prisma from startup/onboard scripts

**File:** `workspace/startup.sh`
- Remove `pnpm prisma generate` lines (~line 21, ~line 34)
- Remove prisma migration block (~lines 37-42)

**File:** `install/onboard.sh`
- Remove `pnpm prisma generate` (~line 169)
- Remove conditional `prisma migrate deploy` (~lines 171-173)

### A6. Strip postgres from CI workflow

**File:** `.github/workflows/ci.yml`
- Remove postgres service block (~lines 33-46)
- Remove `DATABASE_URL` env var (~line 49)
- Remove `prisma generate` step (~lines 75-77)
- Remove `prisma migrate deploy` step (~lines 79-81)

### A7. Update provision + repair skills

**File:** `.claude/skills/provision/SKILL.md`
- Remove postgres from the default overlay checklist (keep as unchecked option)
- Remove prisma generate/migrate from Build startup.sh section
- Remove `DATABASE_URL set`, `Prisma client generated`, `PostgreSQL TCP` from test validation table
- Update test count (8 → 5)

**File:** `.claude/skills/repair/SKILL.md`
- Remove DATABASE_URL, Prisma, PostgreSQL remediation cases

**Keep untouched:** `.devcontainer/docker-compose.postgres.yml` (remains an available overlay)

---

## Thread 2: Nextra Docs Site (GitHub Pages)

### B1. Scaffold docs/ workspace package

Create `docs/` directory with:
- `package.json` (nextra, nextra-theme-docs, next, react, react-dom)
- `next.config.mjs` (with Nextra plugin, `output: 'export'` for GitHub Pages static export)
- `theme.config.tsx` (project title, logo, links, footer)
- `tsconfig.json`
- `pages/` directory with `_meta.json` for navigation
- `.gitignore` (next build artifacts)

Update root:
- Add `docs` to `pnpm-workspace.yaml`
- Add `docs:dev` and `docs:build` scripts to root `package.json`

Add `.github/workflows/docs.yml`:
- Trigger on push to main
- Build with `pnpm --filter docs build`
- Deploy to GitHub Pages via `actions/deploy-pages`

### B2. Create page structure

```
docs/pages/
├── _meta.json              # Top-level nav order
├── index.mdx               # Home — project overview + quickstart
├── getting-started/
│   ├── _meta.json
│   ├── installation.mdx    # CLI install, prerequisites
│   ├── quickstart.mdx      # 3 options (VS Code, CLI, manual)
│   └── onboarding.mdx      # 4-step wizard details + troubleshooting
├── guide/
│   ├── _meta.json
│   ├── overlays.mdx        # Compose overlays table + config.json example
│   ├── heartbeats.mdx      # Schedule format, CLI commands, examples
│   ├── identity.mdx        # SOUL.md, MEMORY.md, daily logs
│   └── releases.mdx        # CalVer format, tag + push workflow
├── cli/
│   ├── _meta.json
│   └── commands.mdx        # Full CLI reference table
└── architecture/
    ├── _meta.json
    ├── overview.mdx         # Why Open Harness, key benefits
    ├── structure.mdx        # Directory tree, component layout
    └── how-it-works.mdx     # Boot sequence, entrypoint, startup
```

### B3. Extract README content into pages

Map current README sections → Nextra pages:
- `## Why Open Harness?` → `architecture/overview.mdx`
- `## Sandbox Infrastructure` → `guide/overlays.mdx`
- `## CLI Commands` → `cli/commands.mdx`
- `## Structure` → `architecture/structure.mdx`
- `## How It Works` → `architecture/how-it-works.mdx`
- `## Heartbeat, Soul & Memory` → `guide/heartbeats.mdx` + `guide/identity.mdx`
- `## Releases` → `guide/releases.mdx`

Add new content:
- `guide/overlays.mdx`: config.json example with all available overlays
- `getting-started/onboarding.mdx`: 4-step wizard breakdown with troubleshooting
- Credentials + SSH config in quickstart page

---

## Thread 3: Slim README

### C1. Rewrite README as landing page (~120 lines)

Keep:
- Title + one-liner tagline
- Prerequisites
- 3 quickstart options (VS Code / CLI / Manual) 
- Onboard one-liner + 4-step bullet summary
- Credentials table
- CLI commands table (compact)
- Cleanup commands
- config.json 5-line snippet in overlays mention

Add:
- Link to full docs: `📖 [Full documentation](https://ryaneggz.github.io/open-harness/)`

Remove (moved to docs):
- Why Open Harness section
- How It Works section
- Heartbeat/Soul/Memory details
- Structure tree
- Releases section
- VS Code Remote-SSH config (→ docs quickstart)

---

## Verification

1. **Build:** `pnpm -r run build` — TypeScript compiles
2. **Tests:** `pnpm -r run test` — all tests pass (setup-check drops from 8 to 5)
3. **Lint:** `pnpm -r run lint` — clean
4. **Docs build:** `pnpm --filter docs build` — static export succeeds
5. **Dangling refs:** grep for `prisma`, `DATABASE_URL`, `@prisma` in non-docs source files — only in `docker-compose.postgres.yml` (the optional overlay)
6. **README:** under 130 lines, links to docs site
