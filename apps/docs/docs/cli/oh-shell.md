---
sidebar_position: 4
title: "oh shell"
---

# oh shell

The canonical binary is `openharness`; `oh` is the alias used in all examples below.

## Purpose

`oh shell` opens an interactive login shell inside a running sandbox container. It runs as the `orchestrator` user, starts in `/home/orchestrator/workspace`, and uses the shell configured in the container's `$SHELL` environment variable (zsh by default, falling back to bash). The session is equivalent to attaching directly with `docker exec -it -u orchestrator <container> zsh -l`.

Use this command whenever you need to inspect, debug, or work inside the sandbox from the host terminal.

## Usage

```bash
oh shell <name>
```

`name` is required. It must match the name of a running container.

## Examples

```bash
# Open a shell in the sandbox named "my-agent"
oh shell my-agent

# The shell starts in /home/orchestrator/workspace
# Exit with Ctrl+D or the "exit" command
exit
```

Common things to do after entering:

```bash
# Check the agent process
tmux ls

# Attach to a running agent session
tmux attach -t agent-claude

# Run a dev server in a named tmux session
tmux new-session -d -s app-docs 'pnpm dev 2>&1 | tee /tmp/app-docs.log'
```

## Flags

`oh shell` accepts no flags. Only the positional `name` argument is recognised.

## Related Commands

- [oh sandbox](./oh-sandbox.md) — build and start the container before shelling in
- [oh onboard](./oh-onboard.md) — first-time auth setup (runs inside the container)
- [oh clean](./oh-clean.md) — stop the container when done
- [CLI Overview](./overview.md) — full command list

For guidance on running long-lived processes inside the sandbox with tmux, see [Sandbox Lifecycle](../sandbox-lifecycle.md).

## Troubleshooting

**"container is not running" error**
The container must be started before you can shell into it. Run `oh sandbox <name>` to start it, then retry.

**Shell exits immediately**
If the container's entrypoint failed during startup, the container may be in a crash loop. Check `docker logs <name>` for startup errors, then rebuild with `oh sandbox <name>`.

**Permission denied inside the container**
`oh shell` always connects as the `sandbox` user. Files owned by root inside the container are not writable by `sandbox`. Avoid running `docker exec` as root and then writing files to workspace directories.

**zsh not available, falling back to bash**
The shell is chosen from `$SHELL` inside the container. If zsh was not included in the devcontainer image, the command falls back to `/bin/bash`. To fix permanently, rebuild the image with zsh added to the Dockerfile.
