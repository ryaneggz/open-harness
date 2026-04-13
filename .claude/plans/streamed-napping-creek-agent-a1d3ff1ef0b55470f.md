# Plan: Merge CLI Layer and Sandbox Package sections in overview.mdx

## File
`/home/ryaneggz/ruska-ai/sandboxes/docs/pages/architecture/overview.mdx`

## Problem
- Line 5: `## CLI Layer (\`cli/\`)` — references `cli/` which no longer exists (consolidated into `packages/sandbox/src/cli/`)
- Lines 7-8: CLI described as a separate layer that delegates to the sandbox package
- Lines 9-13: Sandbox package described as a separate section
- Two sections describe what is now a single package

## Section count after merge
Still three sections total (CLI & Sandbox Package, Container Infrastructure, Workspace Template), so the intro phrase "three main layers" remains accurate — no change needed there.

## Edit: replace lines 5-13 with merged section

### Remove (old):
```
## CLI Layer (`cli/`)

The `openharness` TypeScript CLI handles all user-facing commands: starting, stopping, entering, and cleaning up sandboxes. It delegates to the sandbox package for container lifecycle operations.

## Sandbox Package (`packages/sandbox/`)

`@openharness/sandbox` contains the Docker Compose command builders and tool definitions. Each tool (sandbox, run, stop, clean, shell, etc.) constructs and executes Docker commands against the `.devcontainer/` configuration.

The package also serves as a Pi Agent extension, registering all tools as both LLM-callable functions and slash commands.
```

### Replace with (new):
```
## CLI & Sandbox Package (`packages/sandbox/`)

`@openharness/sandbox` is the core of the system. The `openharness` binary lives in `src/cli/` and handles all user-facing commands: starting, stopping, entering, and cleaning up sandboxes. Container lifecycle operations — Docker Compose command builders and tool definitions — live in `src/tools/` and `src/lib/`. Each tool (sandbox, run, stop, clean, shell, etc.) constructs and executes Docker commands against the `.devcontainer/` configuration.

The package also serves as a Pi Agent extension, registering all tools as both LLM-callable functions and slash commands.
```

## Lines left unchanged
- Line 3 intro (count stays at three)
- Lines 15-27 (Container Infrastructure and Workspace Template sections)
