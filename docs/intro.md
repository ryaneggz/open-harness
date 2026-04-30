---
slug: /
sidebar_position: 1
title: "Introduction"
---

# Open Harness

Open Harness is a local-first orchestration platform that runs Claude, Codex, Gemini, and Pi side-by-side from a single Docker-powered agent harness. Each agent gets its own isolated sandbox, its own git branch, its own identity, and its own cron schedule so agents can work independently without stepping on each other.

## What is Open Harness?

Open Harness packages each AI agent in its own Docker container called a sandbox. A single CLI called `oh` (alias for `openharness`) lets you create, inspect, connect to, and destroy those sandboxes without touching Docker directly.

Key capabilities:

- **Worktree-per-agent.** Each sandbox maps to a dedicated git branch, keeping agent work isolated from your main branch and from other agents.
- **Cron-driven heartbeats.** Agents can wake on a schedule and perform real work autonomously while you focus on other things.
- **One container, every agent.** Claude Code, Codex, Pi, and Gemini CLI share the same sandbox image and toolchain.
- **Only host dependency: Docker.** No Node, no Python, and no toolchain maintenance required on your laptop. The `oh` CLI on the host is optional — most users only need it for the `oh sandbox`, `oh shell`, and `oh clean` commands.
- **Composable infra.** Postgres, Cloudflare tunnels, SSH, Slack, and the Caddy gateway are all opt-in Docker Compose overlays.

## How it works

The harness uses Docker Compose to build a sandbox image from `.devcontainer/`. When you run `oh sandbox`, it builds and starts the container. You connect with `oh shell` (or VS Code), complete a one-time `oh onboard` wizard to authenticate GitHub and your chosen LLM provider, then launch an agent with `claude` or `pi` inside the sandbox. When you are done, `oh clean` tears everything down.

## How to read these docs

If you are new, follow this order:

1. [Installation](/docs/installation) — install Docker and the `oh` CLI.
2. [Quickstart](/docs/quickstart) — go from zero to a running sandbox in under five minutes.
3. [Onboarding](/docs/onboarding) — authenticate GitHub, your LLM provider, and optional Slack integration.
4. [Sandbox Lifecycle](/docs/sandbox-lifecycle) — create, inspect, connect, and clean up sandboxes.
5. [Connecting](/docs/connecting) — three ways to open a shell inside a running sandbox.

If you already have a sandbox running, jump directly to the page you need.

## Where to get help

- Source code and issues: [github.com/ryaneggz/open-harness](https://github.com/ryaneggz/open-harness)
- CLI reference: see the CLI section in the sidebar.
- Architecture deep-dive: see the Architecture section.
