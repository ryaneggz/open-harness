---
name: Agent
about: Provision a new agent workspace
title: "[AGENT] "
labels: agent
assignees: ""
---

## Identity

- **Name**: <!-- e.g. researcher, builder, alice -->
- **Role**: <!-- What is this agent responsible for? -->

## Context

<!-- What should this agent know? What projects, docs, or repos should it have access to? -->

---

## Workspace Setup

> An agent is a persistent, isolated workspace with its own branch, memory, and context. Agents are long-lived — they accumulate knowledge and work on multiple issues across their lifetime.

### Metadata

> **IMPORTANT**: The very first step should _ALWAYS_ be validating this metadata section to maintain a **CLEAN** development workflow.

```yml
agent: "<agent-name>"
branch: "agent/<agent-name>"
worktree_path: ".worktrees/<agent-name>"
```

### 1. Provision the agent

```bash
make NAME=<agent-name> quickstart
```

This will:
- Create a git worktree at `.worktrees/<agent-name>` on branch `agent/<agent-name>`, branched from `development`
- Build the Docker image from the worktree's context
- Start the container with the worktree's workspace mounted
- Run the setup script

### 2. Enter the sandbox

```bash
make NAME=<agent-name> shell
claude
```

### 3. Verify

- [ ] Container is running (`make list`)
- [ ] Agent can access workspace (`ls ~/harness/workspace`)
- [ ] SOUL.md and MEMORY.md are present
