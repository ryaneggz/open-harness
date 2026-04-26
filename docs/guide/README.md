# Guide

How-to guides for configuring, operating, and extending Open Harness sandboxes.

- [Configuration](./configuration.md) — environment variables and `.devcontainer/.env` setup
- [Compose Overlays](./overlays.md) — optional services (postgres, sshd, slack, claude-host, gateway)
- [Permissions & Security](./permissions.md) — sandbox user, isolation model, agent permission flags
- [Workspace](./workspace.md) — directory layout for identity, memory, heartbeats, projects
- [Multi-Sandbox SSH](./multi-sandbox-ssh.md) — running multiple sandboxes with unique SSH ports
- [Exposing Apps](./exposure.md) — `openharness expose` and Caddy routing for laptop and remote modes
- [Heartbeats](./heartbeats.md) — cron-scheduled agent tasks via the heartbeat daemon
- [Identity & Memory](./identity.md) — SOUL.md, MEMORY.md, and the daily log protocol
- [Wiki](./wiki.md) — LLM-maintained knowledge base with ingest, query, and lint
- [UAT Testing](./uat-testing.md) — visual acceptance testing with the uat-tester agent
- [Token Conservation](./token-conservation.md) — Caveman compression for identity files and rules
- [Releases](./releases.md) — CalVer tagging and the `/release` skill
