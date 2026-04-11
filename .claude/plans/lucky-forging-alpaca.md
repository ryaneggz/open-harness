# Plan: Add CI Workflow for Tests, Lint, and Build

## Context

The repo has two TypeScript packages (`cli/` and `packages/sandbox/`) with full tooling (ESLint, Prettier, Vitest, TypeScript) but no CI workflow to run them. The only existing workflow (`.github/workflows/build.yml`) handles Docker image publishing on tag push. PRs and branch pushes have zero automated quality checks.

## Approach

Create a single new workflow file `.github/workflows/ci.yml` using a matrix strategy to run both packages in parallel.

## New File: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:

permissions:
  contents: read

jobs:
  ci:
    name: CI — ${{ matrix.package.name }}
    runs-on: ubuntu-latest

    strategy:
      fail-fast: true
      matrix:
        package:
          - name: cli
            path: cli
          - name: sandbox
            path: packages/sandbox

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node 22.x
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Cache node_modules
        uses: actions/cache@v4
        with:
          path: ${{ matrix.package.path }}/node_modules
          key: node-modules-${{ matrix.package.name }}-${{ hashFiles(format('{0}/package-lock.json', matrix.package.path)) }}
          restore-keys: |
            node-modules-${{ matrix.package.name }}-

      - name: Install dependencies
        working-directory: ${{ matrix.package.path }}
        run: npm ci

      - name: Lint
        working-directory: ${{ matrix.package.path }}
        run: npm run lint

      - name: Format check
        working-directory: ${{ matrix.package.path }}
        run: npm run format:check

      - name: Build
        working-directory: ${{ matrix.package.path }}
        run: npm run build

      - name: Test
        working-directory: ${{ matrix.package.path }}
        run: npm run test
```

## Key Decisions

- **Matrix over separate jobs** — one place to maintain steps; adding a 3rd package = one matrix entry
- **Separate steps instead of `npm run ci`** — per-step pass/fail visibility in the Actions UI
- **`npm ci`** — deterministic installs from lock file, faster than `npm install`
- **Cache `node_modules` directly** — skips extraction step vs. `setup-node`'s `~/.npm` cache
- **`fail-fast: true`** — if one package fails, cancel the other to save runner minutes
- **Step order**: lint → format → build → test (fast static checks first, fail early)
- **No changes to `build.yml`** — it handles Docker image release on tags, no overlap

## Verification

1. Push to any branch — the push trigger fires on all branches
2. Check Actions tab for two parallel jobs: "CI — cli" and "CI — sandbox"
3. Confirm each step (lint, format, build, test) shows independently
4. The `cli` package has no tests yet — Vitest exits 0 with no test files, which is correct

## Files

| File | Action |
|------|--------|
| `.github/workflows/ci.yml` | **Create** |
| `.github/workflows/build.yml` | No changes |
