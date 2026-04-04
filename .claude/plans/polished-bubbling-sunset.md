# Plan: Provision Full Stack Developer Agent Sandbox

## Context

Scaffold a Full Stack Developer agent workspace via the `/provision` skill. The agent builds Next.js + TypeScript + PostgreSQL + shadcn/ui applications with a professional development workflow including testing, linting, pre-commit hooks, CI pipeline, cloudflared tunnel for external access, and agent-browser for QA.

## Agent Identity

- **Name**: `next-postgres-shadcn`
- **Role**: Full Stack Developer — Next.js + TypeScript + PostgreSQL + shadcn/ui
- **Base branch**: `main`
- **Docker-in-Docker**: yes (Postgres via compose, potential service containers)
- **Heartbeat**: yes (build health checks)

## Stack & Tooling

### Core Stack
- Next.js 15+ (App Router, `src/` directory)
- TypeScript (strict mode)
- PostgreSQL 16 (via Docker compose)
- Prisma ORM (migrations, client generation, studio)
- shadcn/ui + Tailwind CSS

### Testing
- **Vitest** — unit/integration tests (frontend components + backend API routes)
- **React Testing Library** — component testing
- **Playwright** — E2E browser testing
- Test scripts: `npm test`, `npm run test:e2e`

### Linting & Formatting
- **ESLint** (Next.js config + strict TypeScript rules)
- **Prettier** (consistent formatting)
- **lint-staged** — run linters only on staged files

### Pre-commit Hooks (Husky)
- **Pre-commit**: `lint-staged` runs:
  - ESLint (`--fix`) on `*.{ts,tsx}`
  - Prettier (`--write`) on `*.{ts,tsx,css,json,md}`
  - `tsc --noEmit` (type-check)
- **Pre-push**: `npm test` (run full test suite)

### CI Pipeline (GitHub Actions)
Mirrors pre-commit steps — runs on every push:
1. **Lint** — `npm run lint`
2. **Format check** — `npm run format:check`
3. **Type check** — `npm run type-check` (`tsc --noEmit`)
4. **Build** — `npm run build`
5. **Test** — `npm test` (Vitest)
6. **E2E** — `npx playwright test` (with Postgres service container)

Workflow file: `.github/workflows/ci.yml` in the agent's worktree.

### Infrastructure
- **Cloudflared tunnel** — named tunnel exposing Next.js dev server at `next-postgres-shadcn.ruska.dev` (routes `https://next-postgres-shadcn.ruska.dev` → `http://localhost:3000`)
- **agent-browser + Chromium** — QA tests hit the public URL (`next-postgres-shadcn.ruska.dev`) and work backward to diagnose issues
- **PostgreSQL client** — `psql` for direct DB access

## Scaffolding Details

### Docker Infrastructure (`docker/` in worktree)

**docker-compose.nextjs.yml** (new compose override):
```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: ${NAME}-postgres
    environment:
      POSTGRES_USER: sandbox
      POSTGRES_PASSWORD: sandbox
      POSTGRES_DB: sandbox
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U sandbox"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - devnet

  sandbox:
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      - DATABASE_URL=postgresql://sandbox:sandbox@postgres:5432/sandbox
      - PGHOST=postgres
      - PGUSER=sandbox
      - PGPASSWORD=sandbox
      - PGDATABASE=sandbox
    ports:
      - "${PORT:-3000}:3000"
    networks:
      - devnet

networks:
  devnet:
    name: ${NAME}-devnet
    driver: bridge

volumes:
  pgdata:
```

**Network isolation**: Each agent's dev environment gets its own Docker bridge network (`${NAME}-devnet`). The sandbox and postgres containers communicate over this private network. Other agent sandboxes on the host cannot reach this agent's Postgres or dev server unless explicitly connected. The `devnet` network name is scoped by the agent name to prevent collisions.

### Workspace Files

**SOUL.md** — Full Stack Developer persona:
- Expert in Next.js App Router, TypeScript, PostgreSQL, Prisma, shadcn/ui, Tailwind
- Practices: type-safe code, tested features, accessible UI, clean Git history
- QA workflow: uses agent-browser to verify features via the public URL (`next-postgres-shadcn.ruska.dev`) and works backward from user-facing behavior to diagnose issues
- Quality bar: all code passes lint + type-check + tests before commit

**MEMORY.md** — Seeded context:
- Stack decisions: App Router, Prisma, shadcn/ui, Tailwind, Vitest + Playwright
- Dev workflow: lint-staged on commit, type-check on commit, tests on push, CI on every push
- Infrastructure: Postgres on `postgres:5432`, cloudflared for external access
- Component library: shadcn/ui (`npx shadcn@latest add <component>`)

**AGENTS.md** — Stack-specific section appended with:
- Services table (Postgres, Next.js dev server, Prisma Studio, cloudflared)
- Database commands (psql, prisma migrate, prisma studio)
- Testing commands (vitest, playwright)
- Linting/formatting commands
- shadcn component workflow
- Cloudflared tunnel usage
- agent-browser QA workflow
- CI pipeline description

### Project Initialization (inside container)

1. `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes`
2. `npx shadcn@latest init -y --defaults`
3. `npm install prisma @prisma/client && npx prisma init`
4. Testing: `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom playwright @playwright/test`
5. Linting: `npm install -D prettier eslint-config-prettier lint-staged`
6. Hooks: `npx husky init && npm install -D husky`
   - `.husky/pre-commit`: `npx lint-staged`
   - `.husky/pre-push`: `npm test`
7. Config files:
   - `vitest.config.ts` — Vitest with React plugin, jsdom environment
   - `playwright.config.ts` — Playwright with webServer config
   - `.prettierrc` — Prettier config
   - `lint-staged` section in package.json
   - package.json scripts: `test`, `test:e2e`, `lint`, `format`, `format:check`, `type-check`
8. `sudo apt-get install -y cloudflared postgresql-client`
9. agent-browser enabled during setup.sh
10. Cloudflared tunnel config:
    - Create `~/.cloudflared/config.yml` with named tunnel routing `next-postgres-shadcn.ruska.dev` → `http://localhost:3000`
    - Tunnel credentials will need to be provided (CLOUDFLARE_TUNNEL_TOKEN env var or credentials file)
    - Start tunnel: `cloudflared tunnel run next-postgres-shadcn`
    - Or quick tunnel: `cloudflared tunnel --hostname next-postgres-shadcn.ruska.dev --url http://localhost:3000`

### CI Workflow (`.github/workflows/ci.yml` in worktree)

```yaml
name: CI

on:
  push:

permissions:
  contents: read

jobs:
  ci:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: sandbox
          POSTGRES_PASSWORD: sandbox
          POSTGRES_DB: sandbox
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U sandbox"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://sandbox:sandbox@localhost:5432/sandbox

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: node_modules
          key: node-modules-${{ hashFiles('package-lock.json') }}

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Format check
        run: npm run format:check

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build

      - name: Test
        run: npm test

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: E2E tests
        run: npm run test:e2e
```

### GitHub Issue Templates (`.github/ISSUE_TEMPLATE/` in worktree)

**feature.md** — Feature request template:
- Summary, motivation, proposed implementation
- Stack context: Next.js App Router, Prisma migrations, shadcn components
- Acceptance criteria: feature works, tests pass (Vitest + Playwright), lint/type-check clean, PR targets `development`

**bug.md** — Bug report template:
- Description, steps to reproduce, expected vs actual behavior
- Environment section: Node.js version, Next.js version, PostgreSQL version, browser
- Acceptance criteria: bug fixed, tests added, no regressions, PR targets `development`

Both templates include the agent assignment metadata block and workflow commands consistent with the harness conventions.

### Heartbeats

- `heartbeats/build-health.md` — periodic `npm run build && npm test` to catch regressions
- Schedule: every 30 minutes during active hours

### Setup README (`README.md` at worktree root)

A standalone `README.md` at `.worktrees/agent/next-postgres-shadcn/README.md` documenting any steps that require manual user authentication or configuration after initial provisioning. This includes:

- **Cloudflare tunnel auth**: `cloudflared tunnel login` (opens browser for Cloudflare account auth), then `cloudflared tunnel create next-postgres-shadcn` to generate credentials
- **GitHub CLI auth**: `gh auth login` if not pre-configured with a token
- **Prisma Studio**: No auth, but note that it runs on port 5555 and is only accessible locally
- **agent-browser**: May need `ANTHROPIC_API_KEY` or other API keys for browser automation services
- **Environment variables**: Document all required env vars (`DATABASE_URL`, `CLOUDFLARE_TUNNEL_TOKEN`, API keys) and where to set them (`.env.local`, container env, `.bashrc`)
- **DNS setup**: If `next-postgres-shadcn.ruska.dev` DNS record doesn't exist yet, document how to create the CNAME pointing to the tunnel

Any setup step that blocks on user interaction (OAuth flows, token generation, DNS configuration) gets documented here so the user knows what to do after provisioning.

## Execution

1. Run `/provision` skill with agent parameters
2. Scaffolding phase customizes workspace files for Full Stack Developer role
3. Modify docker-compose in worktree to add PostgreSQL service
4. Run project init commands inside container (Next.js, shadcn, Prisma, testing, linting, hooks)
5. Write CI workflow to `.github/workflows/ci.yml`
6. Write GitHub issue templates (feature.md, bug.md) to `.github/ISSUE_TEMPLATE/`
7. Install cloudflared, enable agent-browser
8. Verify everything works end-to-end

## Verification

- `docker ps` — sandbox + postgres containers running
- `psql -c "SELECT 1"` inside container — DB reachable
- `npm run build` — Next.js builds clean
- `npm run lint` — no lint errors
- `npm run format:check` — formatting consistent
- `npm run type-check` — TypeScript clean
- `npm test` — Vitest passes
- `npx playwright test` — E2E passes (with agent-browser/Chromium)
- `cloudflared tunnel run` — `next-postgres-shadcn.ruska.dev` resolves and serves the app
- agent-browser navigates to `https://next-postgres-shadcn.ruska.dev` — page loads correctly
- Git commit triggers lint-staged (lint + format + type-check)
- Git push triggers test suite
- GitHub Actions CI runs all checks on push
