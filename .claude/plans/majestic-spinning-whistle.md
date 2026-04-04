# Plan: Wrap agent CLI aliases in tmux sessions

## Context

When a user enters a sandbox (`openharness shell <name>`) and runs `claude`, `codex`, or `pi`, the session is tied to their terminal. If the terminal disconnects, the agent dies. The user wants these commands to automatically run inside a tmux session so they can detach (`Ctrl+B D`) and leave the agent running, then reattach later.

tmux is already installed in the sandbox via `install/setup.sh`. The CLI (`openharness`) has replaced the old Makefile — users clone the repo and `npm link` to install it.

## Changes

### `docker/Dockerfile` (lines 10-12)

Replace the simple aliases with a helper script + updated aliases that route through tmux.

**Helper script** (`/home/sandbox/tmux-agent.sh`):

```bash
#!/usr/bin/env bash
# Wraps an agent CLI in a new, incrementing tmux session.
# Usage: tmux-agent.sh <prefix> <command> [args...]
PREFIX="$1"; shift
if [ -n "$TMUX" ]; then
  exec "$@"
fi
# Find next available session number
N=1
while tmux has-session -t "${PREFIX}-${N}" 2>/dev/null; do
  N=$((N + 1))
done
exec tmux new-session -s "${PREFIX}-${N}" -- "$@"
```

**Behavior:**
- First `claude` → creates tmux session `claude-1`
- Second `claude` (while `claude-1` still running) → creates `claude-2`
- If `claude-1` exited, next `claude` → reuses `claude-1`
- Already inside tmux → runs command directly (no nesting)
- Users reattach with `tmux attach -t claude-1`, list with `tmux ls`

**Aliases stay the same shape**, just pointing at the script:
```
alias claude='/home/sandbox/tmux-agent.sh claude claude --dangerously-skip-permissions'
alias codex='/home/sandbox/tmux-agent.sh codex codex --full-auto'
alias pi='/home/sandbox/tmux-agent.sh pi pi'
```

## Files to modify

- `docker/Dockerfile` — replace alias lines (10-12) with helper script creation + updated aliases

## Verification

1. Rebuild a sandbox: `openharness rebuild <name>`
2. Enter: `openharness shell <name>`
3. Run `claude` → opens in tmux session `claude-1`
4. Detach (`Ctrl+B D`), run `claude` again → opens `claude-2`
5. `tmux ls` → shows both sessions
6. `tmux attach -t claude-1` → reattaches to first session
7. Inside tmux, run `claude` → runs directly (no nesting)
