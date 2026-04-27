---
sidebar_position: 5
title: "Sandbox Lifecycle"
---

# Sandbox Lifecycle

A sandbox is a Docker container built from the Open Harness devcontainer image. This page covers every `oh` command for creating, inspecting, connecting to, and tearing down sandboxes. All lifecycle commands run from the host machine, not inside a container.

`oh` is an alias for `openharness`. Both names refer to the same binary.

## Create

### `oh sandbox [name]`

Build the image and start the container. This is the primary provisioning command.

```bash
oh sandbox my-agent
```

What happens under the hood:
1. Reads compose files from `.devcontainer/` (plus any overlays in `.openharness/config.json`).
2. Runs `docker compose up -d --build`.
3. Waits for the container to reach a running state.
4. Prints the connection commands once healthy.

If you omit the name, `oh sandbox` uses the `SANDBOX_NAME` value from `.devcontainer/.env`. On a cold Docker cache the build takes around ten minutes; subsequent starts are a few seconds.

### `oh run [name]`

Start a container that has already been built but is not running. Unlike `oh sandbox`, `oh run` does not rebuild the image.

```bash
oh run my-agent
```

## Inspect

### `oh list`

List all running sandboxes managed by Open Harness.

```bash
oh list
```

Output is a table of container names, status, and port mappings. Sandboxes that were stopped with `oh stop` do not appear.

### `oh ports [name]`

Show every TCP port being listened on inside the sandbox and map each listener back to the tmux session that owns it. Useful for checking which dev servers are running.

```bash
oh ports my-agent
```

## Connect

### `oh shell <name>`

Open an interactive bash login shell inside the named sandbox as the `orchestrator` user. The working directory is `/home/orchestrator/harness`.

```bash
oh shell my-agent
```

This is the primary way to interact with a sandbox from the command line. For VS Code and SSH alternatives, see [Connecting](./connecting).

## Expose

### `oh expose <name> <port>`

Route a port inside the sandbox through the Caddy gateway so it is accessible from your browser.

```bash
oh expose docs 8080
```

On a laptop (no `PUBLIC_DOMAIN` set), this creates a local HTTPS route:

```
https://docs.my-agent.localhost:8443
```

On a remote host (with `PUBLIC_DOMAIN` set in `.devcontainer/.env`), the route uses your public domain:

```
https://docs.my-agent.example.com
```

### `oh unexpose <name>`

Remove a Caddy route created by `oh expose`.

```bash
oh unexpose docs
```

### `oh open <name|port>`

Open a route's URL in the default browser.

```bash
oh open docs
oh open 8080   # resolves port to route name automatically
```

## Stop and clean up

### `oh stop [name]`

Stop and remove the container but preserve named Docker volumes. Auth credentials (Claude Code, GitHub CLI, Cloudflare) survive in their volumes and are available when you start the sandbox again.

```bash
oh stop my-agent
```

### `oh clean [name]`

Full teardown: stop the container and remove all associated volumes.

```bash
oh clean my-agent
```

Use `oh clean` when you want a completely fresh environment. Use `oh stop` when you plan to restart soon and want to keep your credentials.

## Summary

| Command | When to use |
|---|---|
| `oh sandbox [name]` | First start or after changing the image |
| `oh run [name]` | Restart a stopped container without rebuilding |
| `oh list` | See what is running |
| `oh ports [name]` | Check which ports and sessions are active |
| `oh shell <name>` | Open an interactive shell |
| `oh expose <name> <port>` | Make a port accessible via HTTPS |
| `oh unexpose <name>` | Remove a port route |
| `oh stop [name]` | Stop, keep volumes |
| `oh clean [name]` | Stop and remove everything |

## Next steps

- [Connecting](./connecting) — VS Code Attach and Remote SSH alternatives to `oh shell`.
- [Onboarding](./onboarding) — run after your first `oh sandbox` to authenticate services.
