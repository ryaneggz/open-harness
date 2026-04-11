# Plan: Add `npm run setup` to quickstart flow

## Context

The open-harness framework defines `npm run setup` in its root `package.json` to install workspace dependencies, build the CLI + sandbox packages, and `npm link` the `openharness` binary globally. The next-postgres-shadcn repo has the same `cli/` and `packages/sandbox/` directories but lacks a root `package.json`, so `npm run setup` doesn't exist yet. The quickstart docs jump straight to `claude "/provision"` without setting up the host-side CLI first.

**Goal:** Add `npm run setup` as a prerequisite step before `claude "/provision"` across all quickstart documentation, and create the root `package.json` that makes it work.

---

## Changes

### 1. Create root `package.json` (new file)

**Path:** `package.json`

```json
{
  "name": "next-postgres-shadcn",
  "version": "0.1.0",
  "private": true,
  "description": "OpenHarness: Next + Postgres + shadcn — AI Agent Sandbox",
  "workspaces": ["cli", "packages/sandbox"],
  "scripts": {
    "setup": "npm install && npm run build && npm link --workspace=cli",
    "build": "npm run build --workspaces",
    "test": "npm run test --workspaces",
    "lint": "npm run lint --workspaces",
    "format": "npm run format --workspaces"
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

Mirrors the open-harness root package.json. Both `cli/package.json` and `packages/sandbox/package.json` already have `build: tsc` scripts.

### 2. Update root `README.md` (lines 22-28)

**Path:** `README.md`

Add `npm run setup` between `cd` and `claude "/provision"`:

```bash
# Clone the harness
git clone https://github.com/ryaneggz/next-postgres-shadcn.git
cd next-postgres-shadcn

# Install dependencies and link the openharness CLI
npm run setup

# Provision — the agent handles everything
claude "/provision"
```

### 3. Update landing page `quick-start.tsx`

**Path:** `workspace/next-app/src/components/landing/quick-start.tsx`

- **Lines 4-9:** Add `npm run setup` to the `setupCode` template string (same as README)
- **Line 11:** Add `"npm"` to the `COMMANDS` set for syntax highlighting

Do NOT modify the `steps` array — it describes what `/provision` does, not the host setup step.

### 4. Update workspace `README.md` (lines 9-15)

**Path:** `workspace/next-app/README.md`

Same quickstart block update as root README.

### 5. Update provision skill report

**Path:** `.claude/skills/provision/SKILL.md` (lines 122-138)

Add an `openharness` CLI section to the report output between Access and Validate:

```
  CLI (openharness):
    openharness list                            # list running sandboxes
    openharness shell next-postgres-shadcn      # enter sandbox shell
    openharness stop next-postgres-shadcn       # stop container
    openharness run next-postgres-shadcn        # start/restart container
    openharness clean next-postgres-shadcn      # full teardown
    openharness quickstart next-postgres-shadcn # one-shot provision
    openharness heartbeat sync next-postgres-shadcn   # install heartbeat crons
    openharness heartbeat status next-postgres-shadcn # check heartbeat logs
```

---

## Verification

1. Run `npm run setup` from repo root — should install deps, build both workspaces, link CLI
2. Run `which openharness` — should resolve to the linked binary
3. Run `openharness --version` — should print version
4. Build Next.js to verify quick-start.tsx compiles: `docker exec -u sandbox next-postgres-shadcn bash -c 'cd ~/workspace/next-app && npx next build'` (or just `npm run type-check`)
5. Visual check: confirm landing page terminal block shows the 3-step flow
