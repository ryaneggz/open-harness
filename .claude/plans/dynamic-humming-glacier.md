# Plan: Provision `coding-agent` Sandbox

## Context

The user wants to set up a new coding agent focused on frontend development (React, UI/UX). No Docker-in-Docker or heartbeat features needed. No active sandboxes or worktrees currently exist.

## Steps

### 1. Create GitHub Issue

Create a tracking issue using the `[AGENT]` template:
- **Name:** `coding-agent`
- **Role:** Frontend developer — React, UI/UX, and frontend work
- **Branch:** `agent/coding-agent`
- **Worktree:** `.worktrees/agent/coding-agent`

```bash
gh issue create --title "[AGENT] coding-agent — Frontend development agent" \
  --body "..."
```

### 2. Provision the Sandbox

Run the quickstart target with `BASE_BRANCH=main` (required for root Makefile layout):

```bash
make NAME=coding-agent BASE_BRANCH=main quickstart
```

This will:
- Create git worktree at `.worktrees/agent/coding-agent` on branch `agent/coding-agent` (from `main`)
- Build Docker image `ghcr.io/ryaneggz/coding-agent:latest`
- Start container with workspace bind mount
- Run `setup.sh --non-interactive` (install Node.js, Bun, uv, Claude Code, etc.)

**Note:** Per prior feedback, `chmod +x install/*.sh` may be needed before setup runs successfully.

### 3. Verify Health

```bash
make list                          # confirm container is running
make NAME=coding-agent shell       # enter sandbox
```

Inside the sandbox, verify:
- `AGENTS.md`, `SOUL.md`, `MEMORY.md` exist in workspace
- `claude --version` works
- `node --version` returns v22.x
- `bun --version` works

### 4. Report Access

Provide the user with commands to enter and use the agent:

```bash
make NAME=coding-agent shell
claude
```

## Critical Files

- `Makefile` — orchestrates all provisioning targets
- `docker/Dockerfile` — base image definition
- `docker/docker-compose.yml` — container service config
- `install/setup.sh` — package and tool installation
- `install/entrypoint.sh` — container startup
- `workspace/AGENTS.md` — agent environment reference
- `workspace/SOUL.md` — agent persona template
- `.github/ISSUE_TEMPLATE/agent.md` — issue template

## Verification

1. `make list` shows `coding-agent` container running
2. `make NAME=coding-agent shell` drops into the sandbox
3. Inside sandbox: `claude --version`, `node --version`, `bun --version` all succeed
4. Workspace files (`SOUL.md`, `MEMORY.md`, `AGENTS.md`) are present
5. `git branch` inside worktree shows `agent/coding-agent`
