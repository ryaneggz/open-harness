# Plan: Consolidate `cli/` into `packages/sandbox/` + Clean Up pi-mono Clone

## Context

### How we got here — the causal chain

1. **`1c8a630` (Apr 1)** — `cli/` was created as a single monolithic package: Pi SDK wrapper + all sandbox tools (docker, heartbeat, worktree) + extension registration, all in one directory. At this point `cli/` made sense — it was the *only* package.

2. **`af96544` (Apr 1, same day)** — Immediate split: sandbox tools were extracted into `packages/sandbox/` as a separate Pi extension package. The commit message says `cli/` is now "a lean Pi agent" and sandbox tools are "installable via `openharness install @openharness/sandbox`." But **the `@openharness/sandbox` workspace dependency was never added to `cli/package.json`** — only `@sinclair/typebox` was *removed*. Instead, a manual `declare module` type shim (`cli/src/types/openharness-sandbox.d.ts`) was created to paper over the missing dep. This is the root bug.

3. **`8403da6` (Apr 11)** — The subcommand dispatch was rewritten to call `@openharness/sandbox` lib functions directly (bypass Pi SDK `tool.execute()` to avoid spurious AI model calls). This created the **dual dispatch problem**: `cli/src/index.ts` got a raw `switch` that imports from `@openharness/sandbox` directly, while `cli/src/cli.ts` still has `resolveSubcommand` that routes through tool abstractions. Tests cover `resolveSubcommand` — runtime uses the raw `switch`. They diverged.

4. **Meanwhile**, `.devcontainer/entrypoint.sh`, `install.sh`, and `package.json:setup` all hardcoded `cli/` paths (`cli/package.json`, `cli/dist/index.js`, `pnpm link --global ./cli`) because at the time of writing, `cli/` was the package that owned the binary. These were **never updated after the split** because the split didn't change the binary's location — it only moved tools out.

### Why it's broken now

`cli/src/index.ts` does `await import("@openharness/sandbox")` at runtime. This resolves only because pnpm workspace hoisting puts it in the root `node_modules/`. But:
- `cli/package.json` never declares the dependency — so `pnpm install --frozen-lockfile` in CI or a fresh clone can fail
- The pnpm global shim at `~/.local/share/pnpm/openharness` embeds `NODE_PATH` entries rooted at `cli/node_modules` and `cli/dist/node_modules` — neither contains `@openharness/sandbox`
- The `cli/src/extension.ts` is a 13-line no-op — the real extension registration lives in `packages/sandbox/extensions/sandbox.ts` and auto-loads via Pi SDK's `pi.extensions` manifest field

### Why consolidation, not just a dep fix

The AI council (Implementer, Critic, PM) unanimously recommends **full consolidation** because:
- The missing dependency is a *symptom*; the root cause is that `cli/` shouldn't exist as a separate package after the split — it's just a bin entrypoint with no unique code
- The empty `extension.ts` is architectural confusion that will keep producing bugs
- The dual dispatch paths (tested `resolveSubcommand` vs runtime raw `switch`) mean tests don't cover actual behavior
- All 9 hardcoded `cli/` references across entrypoint, install, CI, and root config exist only because the binary stayed in `cli/` after the tools moved out
- One fewer workspace package, tsconfig, and lint config to maintain

### What about `~/sandbox/2026/pi-mono`?

This is a full clone of the upstream `badlogic/pi-mono` SDK. Nothing in this repo references it — no `file:` deps, no `link:` protocol, no PATH entries. Both `cli/` and `packages/sandbox/` use the npm-published `@mariozechner/pi-coding-agent`. The clone is a reference copy from initial development; it can be safely removed.

---

## Phase 1: Minimal Fix (unbreak the CLI first)

**Task 1.1** — Add missing workspace dependency to `cli/package.json`
- Add `"@openharness/sandbox": "workspace:*"` to `dependencies`
- Run `pnpm install` to verify resolution
- **File:** `cli/package.json`

**Task 1.2** — Remove the manual type shim (now redundant with real dep)
- Delete `cli/src/types/openharness-sandbox.d.ts`
- Update `cli/tsconfig.json` if it explicitly references the types dir
- **File:** `cli/src/types/openharness-sandbox.d.ts`, `cli/tsconfig.json`

**Task 1.3** — Build and verify
- `pnpm -r run build` succeeds
- `openharness shell open-harness` works
- `pnpm -r run test` passes

---

## Phase 2: Consolidate `cli/` into `packages/sandbox/`

**Task 2.1** — Move CLI source files
- Create `packages/sandbox/src/cli/` directory
- Move `cli/src/index.ts` -> `packages/sandbox/src/cli/index.ts`
- Move `cli/src/cli.ts` -> `packages/sandbox/src/cli/cli.ts`
- Move `cli/src/__tests__/cli.test.ts` -> `packages/sandbox/src/__tests__/cli.test.ts`
- Update import paths in moved files (use relative `../` imports instead of `@openharness/sandbox`)
- **Files:** new `packages/sandbox/src/cli/index.ts`, `packages/sandbox/src/cli/cli.ts`, `packages/sandbox/src/__tests__/cli.test.ts`

**Task 2.2** — Add bin entry to `packages/sandbox/package.json`
- Add `"bin": { "openharness": "./dist/src/cli/index.js" }`
- Ensure `@mariozechner/pi-coding-agent` is in `dependencies` (needed for `main()` and `ExtensionAPI` type)
- **File:** `packages/sandbox/package.json`

**Task 2.3** — Update workspace and root config
- Remove `- cli` from `pnpm-workspace.yaml`
- Update root `package.json` setup script: `pnpm link --global ./packages/sandbox` (was `./cli`)
- **Files:** `pnpm-workspace.yaml`, `package.json`

**Task 2.4** — Update CI workflow
- In `.github/workflows/ci-harness.yml`: remove `- "cli/**"` path trigger (already covered by `- "packages/**"`)
- **File:** `.github/workflows/ci-harness.yml`

**Task 2.5** — Update container entrypoint
- In `.devcontainer/entrypoint.sh`: change the cli package check and symlink:
  - `if [ -f "$HARNESS/cli/package.json" ]` -> `if [ -f "$HARNESS/packages/sandbox/package.json" ]`
  - `ln -sf "$HARNESS/cli/dist/index.js"` -> `ln -sf "$HARNESS/packages/sandbox/dist/src/cli/index.js"`
  - Update `pnpm --filter openharness` to `pnpm --filter @openharness/sandbox`
- **File:** `.devcontainer/entrypoint.sh`

**Task 2.6** — Update install script
- In `install.sh`: change `cli/package.json` existence check and `pnpm link --global ./cli` -> `./packages/sandbox`
- **File:** `install.sh`

**Task 2.7** — Update CLAUDE.md project structure
- Remove `cli/` entry, note that `openharness` binary lives in `packages/sandbox/`
- **File:** `CLAUDE.md`

**Task 2.8** — Delete `cli/` directory

**Task 2.9** — Rebuild and re-link
- `pnpm install && pnpm -r run build`
- `pnpm link --global ./packages/sandbox`
- Verify `openharness --version` works
- Verify `openharness shell open-harness` works

---

## Phase 3: Clean Up `~/sandbox/2026/pi-mono`

**Task 3.1** — Verify no references exist
- Grep this repo and `~/.local/share/pnpm/` for any path references to `~/sandbox/2026/pi-mono`
- Confirm no `file:` or `link:` dependencies point to it

**Task 3.2** — Remove the clone
- `rm -rf ~/sandbox/2026/pi-mono` (after user confirmation)
- This is outside the repo, so no git changes needed

---

## Hardcoded References That Must Be Updated (Critic checklist)

| Location | Current Reference | New Reference |
|---|---|---|
| `package.json:8` (setup script) | `pnpm link --global ./cli` | `pnpm link --global ./packages/sandbox` |
| `pnpm-workspace.yaml:2` | `- cli` | (remove line) |
| `.devcontainer/entrypoint.sh:45` | `$HARNESS/cli/package.json` | `$HARNESS/packages/sandbox/package.json` |
| `.devcontainer/entrypoint.sh:49` | `pnpm --filter openharness` | `pnpm --filter @openharness/sandbox` |
| `.devcontainer/entrypoint.sh:50` | `$HARNESS/cli/dist/index.js` | `$HARNESS/packages/sandbox/dist/src/cli/index.js` |
| `install.sh:51` | `cli/package.json` | `packages/sandbox/package.json` |
| `install.sh:73` | `pnpm link --global ./cli` | `pnpm link --global ./packages/sandbox` |
| `.github/workflows/ci-harness.yml:6` | `- "cli/**"` | (remove — covered by `packages/**`) |
| `~/.local/share/pnpm/openharness` | hardcoded to `cli/dist/` | regenerated by `pnpm link --global` |

---

## Known Risks

1. **Worktree divergence:** `.worktrees/agent/dc-designer/` has its own `cli/` with extra subcommands (`quickstart`, `build`, `rebuild`). That worktree will need rebasing after this lands. Not blocking — it's a separate branch.
2. **Global shim stale:** The pnpm shim at `~/.local/share/pnpm/openharness` embeds absolute paths. Must re-run `pnpm link --global` after consolidation to regenerate it.
3. **Extension path resolution:** After moving the entry point, `import.meta.url`-based extension path must resolve to `packages/sandbox/extensions/` not the old `cli/dist/`. The Pi SDK auto-discovers extensions via the `pi.extensions` field in package.json, so this should work without manual `--extension` flags.

---

## Verification

1. `pnpm install && pnpm -r run build` — clean build
2. `pnpm -r run test` — all tests pass (cli tests now in packages/sandbox)
3. `pnpm link --global ./packages/sandbox` — re-link binary
4. `openharness --version` — prints version
5. `openharness --help` — shows help with subcommands
6. `openharness list` — lists running containers
7. `openharness shell open-harness` — opens interactive shell (the original failing command)
8. Verify no references to `cli/` remain: `grep -r "cli/" pnpm-workspace.yaml package.json install.sh .devcontainer/ .github/`
