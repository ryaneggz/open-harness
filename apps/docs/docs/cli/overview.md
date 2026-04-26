---
sidebar_position: 1
title: "CLI Overview"
---

# CLI Overview

`openharness` is the command-line interface for the Open Harness orchestrator. The binary is installed as `openharness`; `oh` is a shorter alias that resolves to the same executable. Both names work identically. The examples on this page use `oh`.

## All Top-Level Commands

| Command | Description |
|---------|-------------|
| `sandbox [name]` | Build and start the sandbox (.devcontainer) |
| `run [name]` | Start an already-built container |
| `stop [name]` | Stop and remove the container |
| `clean [name]` | Full cleanup: stop containers and remove volumes |
| `list` | List all running sandboxes |
| `shell <name>` | Open an interactive shell inside a running sandbox |
| `onboard [name\|step] [--force]` | First-time setup wizard, or run a single step |
| `heartbeat <action> <name>` | Manage heartbeat daemons (`sync`, `stop`, `status`, `migrate`) |
| `worktree <name> [--base-branch <branch>]` | Create a git worktree for branch isolation |
| `ports [name]` | Inspect listening ports and active Caddy routes |
| `expose <name> <port>` | Route a sandbox app through the Caddy gateway |
| `unexpose <name>` | Remove a Caddy route |
| `open <name\|port>` | Open a route's URL in the default browser |

Commands that manage containers (`sandbox`, `run`, `stop`, `clean`, `list`, `shell`) are host-only. Running them from inside a container prints a warning and exits.

## Quick-Reference

```bash
# Provision and start
oh sandbox my-agent

# One-time setup inside the container
oh onboard my-agent

# Open an interactive shell
oh shell my-agent

# Expose a dev server running on port 3000
oh expose docs 3000

# Check what is listening and routed
oh ports my-agent

# Tear everything down
oh clean my-agent
```

## Argument Parsing

All commands accept positional arguments. Two flags are recognised globally:

| Flag | Type | Commands |
|------|------|----------|
| `--force` | boolean | `onboard` |
| `--base-branch <branch>` | string | `worktree` |

Flags not listed for a command are ignored.

## Agent Mode

Running `openharness` (or `oh`) with no subcommand launches the interactive AI agent. The agent accepts all standard pi-agent options:

```bash
oh                               # interactive agent
oh --provider google --model gemini-2.5-pro
oh --print "list my sandboxes"   # non-interactive
oh --continue                    # resume previous session
```

Agent-mode flags (`--provider`, `--model`, `--api-key`, `--thinking`, `--print/-p`, `--continue/-c`, `--help/-h`, `--version/-v`) are passed through to the underlying pi agent and are not subcommands.

## Per-Command Pages

Detailed reference for the four most frequently used lifecycle commands:

- [oh onboard](./oh-onboard.md)
- [oh sandbox](./oh-sandbox.md)
- [oh shell](./oh-shell.md)
- [oh clean](./oh-clean.md)

For sandbox lifecycle concepts (build, connect, teardown), see [Sandbox Lifecycle](../sandbox-lifecycle.md).
