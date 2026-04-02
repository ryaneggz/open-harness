# Plan: Replace Makefile with `openharness` CLI built on Pi SDK (Issue #17)

## Context

The root Makefile manages sandbox lifecycle via `make NAME=x target`. Replacing it with `openharness` — a custom agent CLI built on Pi's SDK (`@mariozechner/pi-coding-agent`). Sandbox management tools (quickstart, build, shell, list, heartbeat, etc.) are registered as **first-class built-in tools**, not extensions. Users get both direct CLI commands and conversational AI orchestration in a single binary.

GitHub Issue: #17

## Architecture

```
openharness = Pi Agent SDK + sandbox management tools (built-in)

┌─────────────────────────────────────────────────────────┐
│  openharness CLI                                        │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Pi SDK (@mariozechner/pi-coding-agent)           │  │
│  │  Agent loop, TUI, sessions, read/write/edit/bash  │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Sandbox Tools (built-in, first-class)            │  │
│  │  quickstart, build, shell, stop, clean, list,     │  │
│  │  push, heartbeat sync/stop/status/migrate         │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Custom Config (SOUL.md, skills, extensions)      │  │
│  │  Orchestrator persona, provisioning skill         │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Usage:**
```bash
# Launch openharness (interactive TUI — like pi, but with sandbox tools)
openharness

# Inside openharness:
> /quickstart my-agent --base-branch main    # slash command (direct, no LLM)
> /list                                       # slash command
> /shell my-agent                             # slash command
> "set up a blog writer with heartbeats"      # conversational (LLM orchestrates tools)
```

## File Structure

```
cli/                                # NEW — openharness CLI
  package.json                      # name: openharness, deps: pi-coding-agent, commander, vitest, etc.
  tsconfig.json                     # TypeScript config
  eslint.config.js                  # ESLint flat config with @typescript-eslint
  .prettierrc                       # Prettier config
  vitest.config.ts                  # Vitest config
  src/
    index.ts                        # Entry point: parse args, launch Pi session with custom tools
    tools/
      quickstart.ts                 # Tool: create worktree + build + run + setup
      build.ts                      # Tool: docker build
      rebuild.ts                    # Tool: down + no-cache build + up
      run.ts                        # Tool: compose up -d
      shell.ts                      # Tool: docker exec -it (interactive)
      stop.ts                       # Tool: compose down
      clean.ts                      # Tool: compose down --rmi + worktree remove
      push.ts                       # Tool: docker push
      list.ts                       # Tool: docker ps + git worktree list
      heartbeat.ts                  # Tool: heartbeat sync|stop|status|migrate
      index.ts                      # Exports all tools array
    lib/
      config.ts                     # SandboxConfig: name → image, worktree, project_root, compose cmd
      docker.ts                     # Docker/compose command builders
      exec.ts                       # subprocess runner (spawnSync with stdio inherit)
    __tests__/
      config.test.ts                # Unit tests for SandboxConfig resolution
      docker.test.ts                # Unit tests for command builders
      tools.test.ts                 # Tests for tool parameter schemas and execution logic
.husky/
  pre-commit                        # NEW — runs lint-staged in cli/
.gitignore                          # EDIT — add node_modules, dist
```

## Key Design Decisions

### Pi SDK integration

`openharness` uses `createAgentSession()` from `@mariozechner/pi-coding-agent` to create a custom agent session with sandbox tools registered alongside Pi's default tools (read, write, edit, bash):

```typescript
import { createAgentSession, SessionManager, DefaultResourceLoader } from "@mariozechner/pi-coding-agent";
import { sandboxTools } from "./tools/index.js";

const { session } = await createAgentSession({
  cwd: process.cwd(),
  sessionManager: SessionManager.create({ baseDir: "~/.openharness/sessions" }),
  tools: [...sandboxTools],  // quickstart, build, shell, list, etc.
  resourceLoader: new DefaultResourceLoader({
    agentDir: "~/.openharness",
    extensions: [],   // can still load .pi/extensions/ if desired
  }),
});
```

### Tool registration pattern

Each tool uses Pi's TypeBox-based schema system:

```typescript
import { Type } from "@sinclair/typebox";

export const quickstartTool = {
  name: "sandbox_quickstart",
  label: "Quickstart",
  description: "Create git worktree, build Docker image, start container, run setup",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    baseBranch: Type.Optional(Type.String({ default: "main", description: "Base branch for worktree" })),
    tag: Type.Optional(Type.String({ default: "latest", description: "Image tag" })),
    docker: Type.Optional(Type.Boolean({ default: false, description: "Enable Docker-in-Docker" })),
  }),
  async execute(toolCallId, params, signal, onUpdate, ctx) {
    const config = new SandboxConfig(params);
    // 1. Create worktree
    // 2. docker build
    // 3. compose up -d
    // 4. docker exec setup.sh --non-interactive
    return { type: "text", text: `Sandbox '${params.name}' is ready!` };
  },
};
```

### Slash commands (direct, no LLM)

Register `/quickstart`, `/list`, `/shell`, etc. as Pi commands for direct execution without LLM involvement. These are registered via the extension API that `createAgentSession` exposes, or via a custom extension loaded at startup.

### Tool ↔ Makefile mapping

| Makefile target | Pi Tool | Slash Command |
|---|---|---|
| `make NAME=x quickstart` | `sandbox_quickstart` | `/quickstart x` |
| `make NAME=x build` | `sandbox_build` | `/build x` |
| `make NAME=x rebuild` | `sandbox_rebuild` | `/rebuild x` |
| `make NAME=x run` | `sandbox_run` | `/run x` |
| `make NAME=x shell` | `sandbox_shell` | `/shell x` |
| `make NAME=x stop` | `sandbox_stop` | `/stop x` |
| `make NAME=x clean` | `sandbox_clean` | `/clean x` |
| `make NAME=x push` | `sandbox_push` | `/push x` |
| `make list` | `sandbox_list` | `/list` |
| `make NAME=x heartbeat` | `sandbox_heartbeat` | `/heartbeat sync x` |
| `make NAME=x heartbeat-stop` | `sandbox_heartbeat` | `/heartbeat stop x` |
| `make NAME=x heartbeat-status` | `sandbox_heartbeat` | `/heartbeat status x` |
| `make NAME=x heartbeat-migrate` | `sandbox_heartbeat` | `/heartbeat migrate x` |

### Core library (`cli/src/lib/`)

**`config.ts`** — SandboxConfig (same as before):
```typescript
class SandboxConfig {
  name: string;
  branch: string;        // default: agent/{name}
  baseBranch: string;    // default: development
  tag: string;           // default: latest
  docker: boolean;       // default: false
  registry: string;      // ghcr.io/ryaneggz

  get image(): string { ... }
  get worktreePath(): string { ... }
  get projectRoot(): string { ... }
  composeCmd(): string[] { ... }
}
```

**`docker.ts`** — Docker/compose command builders (unchanged)

**`exec.ts`** — Subprocess runner:
- `run(cmd, opts?)` — `spawnSync` with `stdio: "inherit"`
- `runSafe(cmd)` — ignores errors
- `capture(cmd)` — returns stdout

### Installation
```bash
cd cli && npm install && npm run build && npm link
```
This makes `openharness` available globally. It's a standalone binary that bundles Pi's SDK.

## Testing, Linting & Pre-commit Hooks

### Testing: `vitest`
- **Unit tests** (`cli/src/__tests__/`):
  - `config.test.ts` — SandboxConfig defaults, branch resolution, projectRoot detection, env var overrides
  - `docker.test.ts` — command builder output (compose flags, build args, exec args, DinD overlay)
  - `tools.test.ts` — tool parameter schemas validate correctly, execute functions produce correct subprocess calls (mocked)
- Scripts: `npm test` → `vitest run`, `npm run test:watch` → `vitest`

### Linting: `eslint` + `prettier`
- ESLint flat config with `@typescript-eslint/parser` + `@typescript-eslint/eslint-plugin`
- Prettier for formatting
- Scripts: `npm run lint` → `eslint src/`, `npm run format` → `prettier --write src/`

### Pre-commit hooks: `husky` + `lint-staged`
- `.husky/pre-commit` runs `cd cli && npx lint-staged`
- lint-staged: `*.ts` → `eslint --fix` + `prettier --write`
- Also runs `vitest run --reporter=verbose`

### CI script
- `npm run ci` → `eslint src/ && prettier --check src/ && vitest run`

## Implementation Order

### Phase A: Scaffolding + toolchain
1. `cli/package.json` — deps: `@mariozechner/pi-coding-agent`, `@sinclair/typebox`, `commander`, dev deps: `typescript`, `vitest`, `eslint`, `@typescript-eslint/*`, `prettier`, `husky`, `lint-staged`
2. `cli/tsconfig.json` — target ES2022, module NodeNext
3. `cli/eslint.config.js` — flat config
4. `cli/.prettierrc`
5. `cli/vitest.config.ts`
6. `.husky/pre-commit`
7. `.gitignore` — add `node_modules/`, `dist/`, `cli/dist/`

### Phase B: Core library + tests
8. `cli/src/lib/config.ts` — SandboxConfig
9. `cli/src/lib/exec.ts` — subprocess runner
10. `cli/src/lib/docker.ts` — docker/compose command builders
11. `cli/src/__tests__/config.test.ts`
12. `cli/src/__tests__/docker.test.ts`

### Phase C: Tools
13. `cli/src/tools/list.ts` — simplest tool, validates Pi tool pattern
14. `cli/src/tools/shell.ts` — validates TTY/interactive handling
15. `cli/src/tools/quickstart.ts` — worktree + build + run + setup
16. `cli/src/tools/build.ts`, `rebuild.ts`, `run.ts`, `stop.ts`, `clean.ts`, `push.ts`
17. `cli/src/tools/heartbeat.ts`
18. `cli/src/tools/index.ts` — exports all tools array
19. `cli/src/__tests__/tools.test.ts`

### Phase D: Entry point + wiring
20. `cli/src/index.ts` — parse args, create Pi session with sandbox tools, launch TUI

## Migration Strategy (this PR = Phase 1)

- **Phase 1** (this PR): `openharness` CLI coexists alongside Makefile. Both work.
- **Phase 2** (follow-up): Update CLAUDE.md, AGENTS.md, `/provision` skill, README to reference `openharness`.
- **Phase 3** (follow-up): Remove Makefile.

## Verification

```bash
# Build and install
cd cli && npm install && npm run build && npm link

# Run quality checks
cd cli && npm run ci                          # lint + format check + tests

# Test pre-commit hook
git add cli/ && git commit -m "test: hooks"   # should trigger lint-staged

# Launch openharness
openharness

# Inside openharness TUI:
> /list                                        # direct slash command
> /quickstart test-cli --base-branch main      # direct slash command
> /shell test-cli                              # interactive shell
> /heartbeat status test-cli
> /stop test-cli
> /clean test-cli
> "please list all running sandboxes"          # conversational (LLM uses sandbox_list tool)
```

## Files Modified
- `.gitignore` — add `node_modules/`, `dist/`, `cli/dist/`
- `.husky/pre-commit` — NEW pre-commit hook
- All `cli/` files are NEW (package.json, tsconfig, eslint, prettier, vitest, src/)
