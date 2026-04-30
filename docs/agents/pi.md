---
sidebar_position: 5
title: "Pi Agent"
---

# Pi Agent

Pi Agent (`pi`) is a coding and automation agent that powers three key Open Harness capabilities: Slack integration, heartbeat scheduling, and extensibility via plugins. While Claude Code and Codex focus on interactive and autonomous code tasks, Pi is the automation backbone — it keeps running between tasks, responds to Slack messages, and drives scheduled work.

## Purpose

Pi Agent serves a different role than the other agents in Open Harness. It is always-on infrastructure rather than a task runner you invoke manually. Use Pi for:

- **Slack** — Pi connects to your workspace via Socket Mode and responds to messages in configured channels, routing them to the underlying LLM and posting replies in threads.
- **Heartbeats** — Pi reads `workspace/heartbeats/*.md` files on a cron schedule and runs the tasks defined in their frontmatter, waking agents to do real work autonomously.
- **Extensions** — Pi's plugin system lets you add custom tools, integrations, and behaviors without modifying the core agent.

## Install

Pi Agent is installed by default during sandbox provisioning. The package is `@mariozechner/pi-coding-agent`, installed globally via pnpm:

```bash
pnpm add -g @mariozechner/pi-coding-agent
```

Verify the install:

```bash
pi --version
```

The Slack bot component (`@mariozechner/pi-mom`) is installed separately and is optional. It is available in `packages/slack/` as a vendored fork with Open Harness-specific features.

## Authentication

Pi Agent authenticates via OAuth on first launch. Run it once to complete the flow:

```bash
pi
```

Follow the browser prompt. This is a one-time step per sandbox. CLAUDE.md documents this as part of the onboarding sequence:

```bash
gh auth login && gh auth setup-git
pi    # authenticate Pi Agent (OAuth) — powers Slack, heartbeats, and extensions
```

## Common usage

```bash
# Start Pi Agent (interactive session + automation daemon)
pi

# Start the Slack bot (Mom) — connects via Socket Mode
mom --sandbox=host ~/harness/workspace/.slack
```

Run inside dedicated tmux sessions:

```bash
tmux new-session -d -s agent-pi       'pi'
tmux new-session -d -s agent-pi-slack 'mom --sandbox=host ~/harness/workspace/.slack'
```

### Heartbeats

Create a heartbeat file to schedule autonomous tasks:

```bash
# workspace/heartbeats/daily-summary.md
```

With YAML frontmatter specifying `cron`, `active: true`, and the task prompt. Pi's daemon picks up changes and starts firing on the next cron tick.

## Tips

- Pi and Claude Code can run in parallel in separate tmux sessions — Pi handles automation while Claude Code handles interactive coding.
- The Slack bot in `packages/slack/` is a vendored fork; do not replace it with the upstream npm package as it has Open Harness-specific features (configurable LLM provider, thread replies, tool suppression).
- Pi reads its LLM provider and model from the agent's `settings.json`, making it provider-agnostic.

## Upstream documentation

- [pi-monorepo on GitHub](https://github.com/mariozechner/pi-monorepo)
- [pi-mom (Slack bot) source](https://github.com/badlogic/pi-mono/tree/main/packages/mom)
