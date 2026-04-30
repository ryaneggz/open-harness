---
sidebar_position: 3
title: "oh sandbox"
---

# oh sandbox

The canonical binary is `openharness`; `oh` is the alias used in all examples below.

## Purpose

`oh sandbox` builds the devcontainer image and starts the Docker container in one step. It reads compose files from `.devcontainer/` and merges any overlay files listed in `.openharness/config.json`, then runs `docker compose up -d --build`. Once the container is running, the command prints the next steps for connecting and onboarding. This is the primary provisioning command; run it whenever you want to create a new sandbox or restart one after a full cleanup.

## Usage

```bash
oh sandbox [name]
```

`name` is optional. If omitted, the sandbox name is auto-resolved from the `SANDBOX_NAME` value in `.devcontainer/.env` or from the git remote URL.

## Examples

```bash
# Start the default sandbox (name from .devcontainer/.env)
oh sandbox

# Start a named sandbox
oh sandbox my-agent

# Start with an explicit name on a cold Docker cache (first run takes ~10 minutes)
oh sandbox docs-agent
```

After the container starts, the output includes the recommended follow-up commands:

```
openharness onboard my-agent    # one-time auth setup
openharness shell my-agent      # enter the sandbox
```

## Flags

`oh sandbox` accepts no flags beyond the optional positional `name`. The `--force` flag used by `oh onboard` does not apply here.

## Related Commands

- [oh onboard](./oh-onboard.md) — first-time auth setup after the sandbox starts
- [oh shell](./oh-shell.md) — open an interactive shell inside the running sandbox
- [oh clean](./oh-clean.md) — stop and remove the container when done
- [CLI Overview](./overview.md) — full command list

For a full explanation of the sandbox lifecycle, see [Sandbox Lifecycle](../sandbox-lifecycle.md).

## Troubleshooting

**Docker build fails with a layer cache error**
Run `docker builder prune` to clear the build cache and retry.

**Container exits immediately after starting**
Inspect logs with `docker compose -f .devcontainer/docker-compose.yml logs`. A missing environment variable in `.devcontainer/.env` is the most common cause.

**Name conflict: a container with that name already exists**
Run `oh clean <name>` first to remove the existing container and its volumes, then re-provision with `oh sandbox <name>`.

**Overlay files not applied**
Check `.openharness/config.json` for syntax errors. The file must be valid JSON and the `overlays` array must contain paths relative to the project root.
