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
curl -fsSL https://oh.mifune.dev/install.sh | bash -s -- --with-cli
```

This installs Docker-only by default. Adding `--with-cli` also builds and links the `oh` binary on your host (requires Node 20+). After the installer finishes, skip to [Step 3](#step-3-onboard).

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

### Step 3: Onboard

Run the one-time authentication wizard from the host:

```bash
oh onboard
```

`oh onboard` detects which services are already configured and skips completed steps. It walks you through:

- GitHub CLI (`gh auth login`) so the agent can open PRs and issues.
- LLM provider authentication for Claude Code or Pi.
- Optional Slack tokens if you want the Mom bot.

See [Onboarding](./onboarding) for the full step-by-step breakdown.

### Step 4: Open a shell

```bash
oh shell my-agent
```

You are now inside the sandbox as the `sandbox` user. The working directory is `/home/sandbox/harness`.

### Step 5: Start an agent

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
