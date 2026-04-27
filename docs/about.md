---
title: About
---

# About

Open Harness packages your AI agents into a Docker container called a **sandbox**, where you run them as one or more **harnesses**. Each harness is a git worktree with its own branch, SOUL identity, and cron schedule, so they can work independently without stepping on each other. The root harness is the **orchestrator**: it provisions and manages the rest. Cron-driven heartbeats wake harnesses to do real work autonomously while you sleep, and the only host dependency is Docker — no Node, no Python, no toolchain rot on your laptop. Composable infra lets you cherry-pick Postgres, Cloudflare tunnels, SSH, Slack, and the Caddy gateway as you need them.
