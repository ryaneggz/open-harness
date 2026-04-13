# Plan: Align Documentation with cli/ Consolidation

## Context

After consolidating `cli/` into `packages/sandbox/src/cli/`, several documentation and config files still reference the old structure. One is a **breaking issue** (husky pre-commit hook `cd cli` will fail on every commit), the rest are stale docs.

---

## Critical (breaks workflow)

### 1. `.husky/pre-commit` — line 1 references deleted `cli/` directory
- **Current:** `cd cli && pnpm exec lint-staged && pnpm run build && pnpm run test`
- **Fix:** Remove line 1. Line 2 (`cd ../packages/sandbox && ...`) becomes the only hook, but needs its path fixed since there's no prior `cd cli` to be relative to.
- **New content:**
  ```
  cd packages/sandbox && pnpm exec lint-staged && pnpm run build && pnpm run test
  ```

---

## Important (user-facing docs)

### 2. `docs/pages/architecture/overview.mdx` — lines 5-11
- **Line 5:** `## CLI Layer (\`cli/\`)` — should be `## CLI & Sandbox Package (\`packages/sandbox/\`)`
- **Lines 7-11:** Description treats CLI and sandbox as separate layers. Merge into one section explaining that `packages/sandbox/` provides both the `openharness` binary and the container lifecycle tools.

### 3. `docs/pages/architecture/structure.mdx` — lines 11-15
- **Lines 11-15:** Shows old `cli/` directory tree that no longer exists
- **Fix:** Remove `cli/` block, update `packages/sandbox/` block (lines 16-24) to include `src/cli/` subdirectory

### 4. `packages/sandbox/package.json` — line 4 (description)
- **Current:** `"Sandbox management tools for Open Harness — Docker containers, git worktrees, heartbeats"`
- **Fix:** `"Open Harness CLI and sandbox tools — Docker containers, git worktrees, heartbeats"`

---

## Minor (dead code / stale constant)

### 5. `packages/sandbox/src/cli/cli.ts` — line 36 (INSTALL_HINT)
- **Current:** `"Sandbox tools not installed. Run: openharness install @openharness/sandbox"`
- **Issue:** This message references the old "installable package" model where sandbox was a separate `openharness install` target. Post-consolidation, the tools are always bundled — this hint is unreachable dead code.
- **Fix:** Remove the `INSTALL_HINT` constant and its test in `cli.test.ts` (lines 84-88)

---

## No changes needed

- `README.md` — clean, no `cli/` references
- `CLAUDE.md` — already updated in consolidation
- `workspace/AGENTS.md` — no CLI-specific references
- `.github/ISSUE_TEMPLATE/` — clean
- `.claude/rules/`, `.claude/specs/` — clean
- `.openharness/` — clean
- `.devcontainer/entrypoint.sh` — already updated
- `install.sh` — already updated
- `.claude/plans/` — historical docs, stale but harmless

---

## Verification

1. `git commit` on any file — husky hook runs successfully
2. `pnpm -r run test` — all tests pass after INSTALL_HINT removal
3. `pnpm -r run build` — docs site builds with updated .mdx files
4. Visual check of docs architecture pages
