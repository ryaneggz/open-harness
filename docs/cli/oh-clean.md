---
sidebar_position: 5
title: "oh clean"
---

# oh clean

The canonical binary is `openharness`; `oh` is the alias used in all examples below.

## Purpose

`oh clean` performs a full teardown of a sandbox: it stops the running container and removes its associated Docker volumes. This is the counterpart to `oh sandbox`. Use it when you want to fully reset a sandbox, reclaim disk space, or remove a sandbox you no longer need. If no container with the given name is found, the command exits cleanly with an informational message rather than an error.

## Usage

```bash
oh clean [name]
```

`name` is optional. If omitted, the sandbox name is auto-resolved from `.devcontainer/.env` (`SANDBOX_NAME`) or the git remote, using the same resolution logic as `oh sandbox`.

## Examples

```bash
# Clean the default sandbox
oh clean

# Clean a named sandbox
oh clean my-agent

# Full reset cycle: tear down, then re-provision
oh clean my-agent && oh sandbox my-agent
```

After a successful clean:

```
Sandbox 'my-agent' cleaned (containers stopped, volumes removed).
```

If no matching sandbox was found:

```
No running sandbox 'my-agent' found.
```

## Flags

`oh clean` accepts no flags beyond the optional positional `name`.

## Related Commands

- [oh sandbox](./oh-sandbox.md) — provision and start a new sandbox after cleaning
- [oh shell](./oh-shell.md) — connect to a running sandbox before deciding to clean
- [oh onboard](./oh-onboard.md) — re-run setup after reprovisioning
- [CLI Overview](./overview.md) — full command list

See [Sandbox Lifecycle](../sandbox-lifecycle.md) for the full teardown procedure and when to use `oh stop` versus `oh clean`.

## Troubleshooting

**Volumes are not removed**
`oh clean` passes `--volumes` to `docker compose down`. If volumes are still present after the command, verify that the compose project name matches the sandbox name. Run `docker volume ls` and remove orphan volumes manually with `docker volume rm <volume>`.

**Command reports success but the container is still listed by `docker ps`**
The container may belong to a different compose project or was started outside of `oh sandbox`. Remove it manually with `docker rm -f <container>`.

**Permissions error when removing volumes**
Volumes owned by root require elevated permissions to remove. Run `sudo docker volume rm <volume>` or add your user to the `docker` group and retry.

**Need to preserve data before cleaning**
Copy workspace data out of the container first: `docker cp <name>:/home/orchestrator/workspace ./backup`. Then run `oh clean`.
