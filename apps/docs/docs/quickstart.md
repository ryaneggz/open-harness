---
sidebar_position: 3
title: "Quickstart"
---

# Quickstart

This guide takes you from zero to a running sandbox with an interactive shell in under five minutes. The only host dependency is [Docker](https://docs.docker.com/get-docker/).

## Before you start

Install Docker with the Compose plugin: [docs.docker.com/get-docker](https://docs.docker.com/get-docker/). Everything else runs inside the container.

If you also want the `oh` CLI on your host machine (recommended), see [Installation](./installation) first.

## Option A — One-line install (recommended)

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

The installer detects whether Node.js 20+ is present. If found, it builds and links the `oh` binary on the host (CLI-first). If Node is missing or too old, it shows a 3-way prompt: install Node 22 via nvm and then the CLI (default), continue Docker-only, or abort. After the installer finishes, skip to [Step 3](#step-3-provision-your-sandbox).

## Option B — Manual setup

### Step 1: Clone and configure

```bash
git clone https://github.com/ryaneggz/open-harness.git
cd open-harness
cp .devcontainer/.example.env .devcontainer/.env
```

Open `.devcontainer/.env` and set at minimum:

```bash
SANDBOX_NAME=my-agent   # any name you like
GH_TOKEN=ghp_...        # optional but skips one onboard step
```

### Step 2: Build and start the sandbox

```bash
oh sandbox my-agent
```

`oh sandbox` is an alias for `openharness sandbox`. It runs `docker compose up -d --build` behind the scenes and waits until the container is healthy. On a cold Docker cache this takes around ten minutes; subsequent starts are a few seconds.

If you do not have the `oh` CLI, use Docker Compose directly:

```bash
docker compose -f .devcontainer/docker-compose.yml up -d --build
```

### Step 3: Provision your sandbox

From the directory where you cloned the repo (note: `oh sandbox` resolves
compose paths relative to the current working directory):

```bash
cd ~/.openharness   # or wherever the installer cloned the repo
oh sandbox my-agent
```

`oh sandbox` runs `docker compose up -d --build` behind the scenes and waits
until the container is healthy. On a cold Docker cache this takes around ten
minutes; subsequent starts are a few seconds.

### Step 4: Open a shell

```bash
oh shell my-agent
```

You are now inside the sandbox as the `orchestrator` user.

### Step 5: One-time setup (inside the sandbox)

Run these once, inside the shell you just opened:

```bash
gh auth login            # GitHub CLI — lets the agent open PRs and issues
gh auth setup-git        # git credential helper (no SSH keys needed)
pi                       # Pi Agent OAuth — powers Slack, heartbeats, extensions
```

These write credentials into the sandbox home directory, not your host home.

### Step 6: Start an agent

```bash
claude                   # Claude Code — terminal coding agent
# or
pi                       # Pi Agent — Slack, heartbeats, extensions
```

You now have a working sandbox with an active agent session.

## Tear down

When you are finished, exit the shell and clean up from the host:

```bash
oh clean my-agent
```

This stops the container and removes its volumes. To keep auth credentials across rebuilds, stop without removing volumes:

```bash
oh stop my-agent
```

## Next steps

- [Onboarding](./onboarding) — detailed walkthrough of each auth step.
- [Sandbox Lifecycle](./sandbox-lifecycle) — full reference for `oh sandbox`, `oh list`, `oh shell`, `oh stop`, and `oh clean`.
- [Connecting](./connecting) — VS Code and SSH alternatives to `oh shell`.
