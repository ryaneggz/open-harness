# Plan: Split openharness into Core Agent + Sandbox Package

## Context

`openharness` currently bundles all 11 sandbox management tools directly into the CLI. Users who just want the agent (no Docker, no sandboxing) get sandbox code they don't need. Splitting into a core agent and a separate sandbox package lets `openharness` be installed standalone, with sandboxing added via `openharness install @openharness/sandbox`.

## Architecture

```
BEFORE:                              AFTER:
┌──────────────────────┐             ┌──────────────────────┐
│  openharness CLI     │             │  openharness CLI     │
│  ├─ Pi SDK           │             │  ├─ Pi SDK           │
│  ├─ 11 sandbox tools │             │  ├─ banner extension │
│  ├─ banner extension │             │  └─ (no sandbox)     │
│  └─ slash commands   │             └──────────────────────┘
└──────────────────────┘                      +
                                     ┌──────────────────────┐
                                     │  @openharness/sandbox │  ← Pi package
                                     │  ├─ 11 sandbox tools │
                                     │  ├─ slash commands   │
                                     │  ├─ lib/ (config,    │
                                     │  │   docker, exec)   │
                                     │  └─ CLI subcommands  │
                                     └──────────────────────┘
```

**User flow:**
```bash
# Install core agent
npm install -g openharness
openharness                          # AI agent, no sandbox tools

# Add sandboxing
openharness install @openharness/sandbox
openharness list                     # now works
openharness quickstart my-agent      # now works
```

## File Structure (after split)

```
cli/                                 # openharness core agent
  package.json                       # name: openharness, NO sandbox deps
  src/
    index.ts                         # entry point: subcommand dispatch → package, else Pi main()
    extension.ts                     # core extension: banner only (no sandbox tools)
  # tests, config files stay

packages/
  sandbox/                           # @openharness/sandbox — Pi package
    package.json                     # name: @openharness/sandbox, keywords: ["pi-package"]
    tsconfig.json
    extensions/
      sandbox.ts                     # Pi extension: registers tools + slash commands
    src/
      tools/                         # MOVED from cli/src/tools/
        list.ts
        quickstart.ts
        build.ts
        rebuild.ts
        run.ts
        shell.ts
        stop.ts
        clean.ts
        push.ts
        heartbeat.ts
        worktree.ts
        index.ts
      lib/                           # MOVED from cli/src/lib/
        config.ts
        docker.ts
        exec.ts
      __tests__/                     # MOVED from cli/src/__tests__/
        config.test.ts
        docker.test.ts
        tools.test.ts
```

## Key Design Decisions

### Sandbox package as a Pi package

`packages/sandbox/package.json`:
```json
{
  "name": "@openharness/sandbox",
  "version": "0.1.0",
  "keywords": ["pi-package"],
  "pi": {
    "extensions": ["./extensions"]
  },
  "dependencies": {
    "@mariozechner/pi-coding-agent": "latest",
    "@sinclair/typebox": "^0.34.0"
  }
}
```

Pi auto-discovers `extensions/sandbox.ts` and loads it. The extension registers all 11 tools + slash commands — identical to current `cli/src/extension.ts`.

### CLI subcommand dispatch with optional package

The core `cli/src/index.ts` changes:
- Subcommands (`list`, `quickstart`, etc.) try to dynamically import from the sandbox package
- If the package isn't installed, print a helpful error: `"Sandbox tools not installed. Run: openharness install @openharness/sandbox"`
- Agent mode (no subcommand) just forwards to Pi `main()` — sandbox tools appear automatically if the package is installed

```typescript
// cli/src/index.ts — subcommand dispatch
async function runSubcommand(command: string, args: string[]) {
  try {
    const sandbox = await import("@openharness/sandbox");
    // execute tool...
  } catch {
    console.error(`Sandbox tools not installed. Run: openharness install @openharness/sandbox`);
    process.exit(1);
  }
}
```

### Core extension (banner only)

`cli/src/extension.ts` becomes lean — just the banner extension (or loads it from `workspace/.openharness/extensions/`). No sandbox tool registration.

### Sandbox package exports

`packages/sandbox/src/index.ts` exports everything needed for CLI subcommand dispatch:

```typescript
export { sandboxTools } from "./tools/index.js";
export { listTool, quickstartTool, buildTool, ... } from "./tools/index.js";
export { SandboxConfig } from "./lib/config.js";
```

## Branch Strategy

All work continues on `feat/cli` (current branch) — it's the only branch with CLI changes. No new branch needed. PR #18 (`feat/cli` → `development`) will include the full split.

## Implementation Order

### Phase 1: Create sandbox package
1. Create `packages/sandbox/package.json` with Pi package manifest
2. Create `packages/sandbox/tsconfig.json`
3. Move `cli/src/tools/` → `packages/sandbox/src/tools/`
4. Move `cli/src/lib/` → `packages/sandbox/src/lib/`
5. Move `cli/src/__tests__/` → `packages/sandbox/src/__tests__/`
6. Create `packages/sandbox/extensions/sandbox.ts` — the Pi extension (from current `cli/src/extension.ts`)
7. Create `packages/sandbox/src/index.ts` — barrel exports
8. Add vitest, eslint, prettier configs to sandbox package

### Phase 2: Slim down core CLI
9. Update `cli/src/index.ts` — dynamic import for subcommands with fallback error
10. Update `cli/src/extension.ts` — remove sandbox tool registration, keep banner only
11. Remove `cli/src/tools/`, `cli/src/lib/` (moved to sandbox package)
12. Remove sandbox-related tests from `cli/src/__tests__/`
13. Update `cli/package.json` — remove `@sinclair/typebox` dep (only needed by sandbox)

### Phase 3: Wire up local development
14. Add `@openharness/sandbox` as optional dependency or use npm workspaces
15. For local dev: `cd packages/sandbox && npm link` then `openharness install ./packages/sandbox`
16. Update `.gitignore` for `packages/sandbox/dist/`, `packages/sandbox/node_modules/`

## AI Smoke Test (automated, run by Claude)

```
1. Build both packages
   cd packages/sandbox && npm install && npm run build
   cd cli && npm install && npm run build

2. CI checks — both packages
   cd packages/sandbox && npm run ci     # lint + format + vitest (42 tests)
   cd cli && npm run ci                  # lint + format + vitest (core tests)

3. Verify sandbox package structure
   - package.json has "keywords": ["pi-package"] and "pi" manifest
   - extensions/sandbox.ts exports default function
   - src/index.ts barrel-exports all tools
   - All 11 tools importable from @openharness/sandbox

4. Verify core CLI without sandbox
   node cli/dist/index.js --version      # prints openharness version
   node cli/dist/index.js --help         # shows Commands section
   node cli/dist/index.js list           # prints install prompt, exits 1

5. Install sandbox package locally
   openharness install ./packages/sandbox

6. Verify core CLI with sandbox
   node cli/dist/index.js list           # shows containers + worktrees
   node cli/dist/index.js --help         # same output

7. Verify extension module shape
   node -e "import('./packages/sandbox/dist/index.js').then(m => {
     console.log('Tools:', m.sandboxTools.length);
     console.log('All have execute:', m.sandboxTools.every(t => typeof t.execute === 'function'));
   })"

8. Pre-commit hook
   git add . && git commit -m "test"     # lint-staged runs
```

## Human Smoke Test (manual, requires Docker + interactive terminal)

### Without sandbox package

```bash
# 1. Fresh install
cd cli && npm install && npm run build && npm link

# 2. Verify standalone agent works
openharness --version                    # → openharness 0.1.0 (pi X.Y.Z)
openharness --help                       # → Commands section visible

# 3. Sandbox commands fail gracefully
openharness list                         # → "Sandbox tools not installed..."
openharness quickstart foo               # → same error

# 4. Agent mode works (TUI)
openharness                              # → Pi TUI launches
# Verify: no sandbox tools in tool list
# Verify: banner shows "Open Harness"
# Ctrl-C to exit
```

### With sandbox package

```bash
# 5. Install sandbox package
openharness install ./packages/sandbox

# 6. CLI subcommands work
openharness list                         # → shows containers + worktrees

# 7. Full lifecycle (requires Docker)
openharness quickstart test-smoke --base-branch main
openharness list                         # → test-smoke appears
openharness shell test-smoke             # → bash shell opens, exit
openharness heartbeat status test-smoke
openharness stop test-smoke
openharness clean test-smoke             # → container + worktree removed
openharness list                         # → test-smoke gone

# 8. Agent mode with sandbox tools
openharness
# Inside TUI:
#   /list                                → works
#   "list all running sandboxes"         → LLM calls sandbox_list tool
#   Ctrl-C to exit

# 9. Uninstall sandbox
openharness remove @openharness/sandbox
openharness list                         # → back to "not installed" error
```

## Files Modified
- `cli/src/index.ts` — dynamic import for subcommands
- `cli/src/extension.ts` — strip sandbox tools, keep banner
- `cli/package.json` — remove @sinclair/typebox
- `cli/src/tools/` — DELETE (moved)
- `cli/src/lib/` — DELETE (moved)
- `cli/src/__tests__/` — remove sandbox tests
- `packages/sandbox/` — ALL NEW
- `.gitignore` — add packages/sandbox artifacts
