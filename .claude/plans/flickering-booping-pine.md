# Plan: `openharness onboard` command

## Context

On fresh container setup, `workspace/startup.sh` immediately tries to start the dev server and cloudflared tunnel, which fails because services aren't authenticated (cloudflared, GitHub CLI, Claude Code). The user must go through one-time onboarding first. This change adds an `openharness onboard` CLI command and makes startup conditional on onboarding completion.

## Design

**State marker**: `~/.claude/.onboarded` (inside the `claude-auth` named volume — persists across restarts, lost on `openharness clean`)

**Behavior change**:
- On boot: `startup.sh` checks marker. If missing → install deps only, print instructions, skip dev server/tunnel.
- User runs `openharness onboard <name>` (from host) or `openharness onboard` (inside container) → interactive wizard walks through setup steps → writes marker → starts app.
- Subsequent boots: marker exists → full startup as before.

## Files to Create

### 1. `install/onboard.sh` — Interactive onboarding wizard

Shell script (same style as `install/setup.sh`). Steps:
1. **SSH key** — display public key, verify with `ssh -T git@github.com`
2. **GitHub CLI** — check `gh auth status`, run `gh auth login` if needed
3. **Cloudflare tunnel** — `cloudflared login` + `~/install/cloudflared-tunnel.sh`
4. **Claude Code** — run `claude` to trigger OAuth
5. **Start app** — run the startup portions (dev server + tunnel)
6. **Write marker** — `~/.claude/.onboarded` (JSON with step statuses + timestamps)

Supports `--force` flag to re-verify all steps even if already onboarded.
If already onboarded (marker exists), does a quick health check and exits.

### 2. `packages/sandbox/src/tools/onboard.ts` — TypeScript tool wrapper

Follows `shell.ts` pattern. Uses `execCmd()` + `run()` for host-side docker exec:

```typescript
// name provided → host mode: docker exec -it <name> bash /home/sandbox/install/onboard.sh
// name absent → inside-container mode: spawnSync bash /home/sandbox/install/onboard.sh
```

Parameters: `name` (optional String), `force` (optional Boolean)

## Files to Modify

### 3. `workspace/startup.sh` — Add onboarding guard

Insert after `APP_DIR` definition, before step 1:
```bash
ONBOARD_MARKER="$HOME/.claude/.onboarded"
if [ ! -f "$ONBOARD_MARKER" ]; then
  log "Onboarding not complete — skipping app startup"
  log "  Run: openharness onboard"
  cd "$APP_DIR"
  pnpm install
  pnpm prisma generate || true
  log "Deps installed. Run 'openharness onboard' to complete setup."
  exit 0
fi
```

### 4. `cli/src/cli.ts`

- Add `"onboard"` to `SUBCOMMANDS` set
- Add `onboardTool: ToolDefinition` to `SandboxModule` interface
- Add `--force` handling to `parseToolArgs()`
- Add special case in `resolveSubcommand()` (like `list` — name optional):
  ```typescript
  if (command === "onboard") {
    const params = parseToolArgs(args);
    // name is optional for onboard
    return { tool: sandbox.onboardTool, params };
  }
  ```
- Add to `helpText()`:
  ```
  onboard [name] [--force]         Interactive first-time setup wizard
  ```

### 5. `packages/sandbox/src/tools/index.ts`

- Add import: `import { onboardTool } from "./onboard.js";`
- Add to `sandboxTools` array
- Add to named exports

### 6. `packages/sandbox/src/index.ts`

- Add `onboardTool` to re-exports

### 7. `packages/sandbox/extensions/sandbox.ts`

Register `/onboard` slash command (same pattern as other commands, name optional).

### 8. `cli/src/types/openharness-sandbox.d.ts`

Add `export const onboardTool: ToolDefinition;`

### 9. `.devcontainer/entrypoint.sh`

After the `startup.sh` call, add first-boot banner if marker is absent:
```bash
if [ ! -f "/home/sandbox/.claude/.onboarded" ]; then
  echo "  First boot — run: openharness onboard"
fi
```

### 10. `cli/src/__tests__/cli.test.ts`

- Add `"onboard"` to expected SUBCOMMANDS list + bump count
- Add `onboardTool` to `makeMockSandbox()`
- Add resolveSubcommand tests: resolves without name, with name, with `--force`

## Implementation Order

1. `install/onboard.sh` (core wizard — can test standalone)
2. `workspace/startup.sh` (guard — test by restarting container)
3. `packages/sandbox/src/tools/onboard.ts` (TypeScript tool)
4. `packages/sandbox/src/tools/index.ts` + `src/index.ts` (exports)
5. `cli/src/cli.ts` (subcommand registration)
6. `cli/src/types/openharness-sandbox.d.ts` (type declaration)
7. `packages/sandbox/extensions/sandbox.ts` (slash command)
8. `.devcontainer/entrypoint.sh` (banner)
9. `cli/src/__tests__/cli.test.ts` (tests)
10. Rebuild Docker image (`docker compose up -d --build`)

## Verification

1. `pnpm --filter openharness test` — CLI tests pass (including new onboard tests)
2. `pnpm --filter @openharness/sandbox build` — sandbox package compiles
3. Rebuild container → verify it does NOT start dev server (no marker)
4. `docker exec -it open-harness bash /home/sandbox/install/onboard.sh` → walkthrough completes
5. Verify `~/.claude/.onboarded` exists inside container
6. Restart container → verify dev server + tunnel start automatically
7. `openharness onboard open-harness` from host → execs into container and runs wizard
