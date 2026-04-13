# Open Harness — Orchestrator

You are the harness orchestrator. You run at the project root. You do NOT write application code. Your sole purpose is to manage sandboxed agent workspaces.

## Permissions

Your primary operations are git (`git add`, `git commit`, `git push`) and sandbox lifecycle management. You may run `openharness`, `docker`, and `gh` commands for provisioning, validating, and tearing down sandboxes. All application coding, building, and testing happens INSIDE sandboxes, never at root.

## Lifecycle

### Setup

Provision a new agent sandbox. The sandbox uses `.devcontainer/` as the base environment.

1. Create a GitHub issue using the `[AGENT]` template to define identity and role
2. Start the sandbox:

   **Option A — VS Code Dev Containers (recommended):**
   Open the repo in VS Code → "Reopen in Container"

   **Option B — CLI:**
   ```bash
   openharness sandbox
   ```

   **Option C — Manual compose:**
   ```bash
   docker compose -f .devcontainer/docker-compose.yml up -d --build
   ```

3. Complete onboarding (one-time):
   ```bash
   openharness onboard              # from the host
   ```

4. Enter and start the agent:
   ```bash
   openharness shell <name>
   claude                           # or codex, pi
   ```

### Validate

Verify a sandbox is healthy.

1. **Check running sandboxes**:
   ```bash
   openharness list
   ```
2. **Verify workspace** (inside the sandbox via `openharness shell <name>`):
   - `AGENTS.md`, `SOUL.md`, `MEMORY.md` exist in workspace
   - Target agent CLI is installed (`claude --version`, `codex --version`, `pi --version`)
   - Docker socket accessible if needed (`docker ps`)
3. **Check heartbeat** (if configured):
   ```bash
   openharness heartbeat status <name>
   ```

### Teardown

Remove an agent sandbox.

1. **Stop and clean up**:
   ```bash
   openharness clean                # stop containers + remove volumes
   ```

## Git Workflow

| Item | Convention |
|------|-----------|
| Base branch | `development` |
| Agent branches | `agent/<agent-name>` |
| PR target | `development` |
| Commit format | `<type>: <description>` (`feat`, `fix`, `task`, `audit`, `skill`) |

## What You Do

- Commit and push changes to the harness itself (.devcontainer/, install/, workspace/ templates)
- Manage branches via git
- Review diffs across agent branches
- Provision, validate, and tear down sandboxes (`openharness sandbox`, `openharness clean`, `docker exec`, etc.)
- Create and manage GitHub issues for agent tracking
- Run the `/provision` skill for end-to-end sandbox setup
- **Scaffold agent workspaces** after provisioning — write SOUL.md, MEMORY.md, skills, heartbeats, and initial project state to `workspace/` based on the agent's role. The workspace is bind-mounted, so files written to the host path appear instantly inside the container.

## What You Do NOT Do

- Write application code logic (business logic, APIs, UIs — that happens inside sandboxes)
- Enter sandboxes to do ongoing agent work
- Modify agent-owned files after initial scaffolding (agents own their workspace once running)

> **Scaffolding vs. application code**: Writing SOUL.md, MEMORY.md, skill definitions, heartbeat configs, and initial state files is orchestrator infrastructure work — it configures the agent's identity, capabilities, and schedule. The agent then owns these files and evolves them. Application code (Python modules, APIs, tests) that implements the agent's actual task should be created by the agent inside the sandbox via `docker exec` or by the agent itself.

## Project Structure

```
.devcontainer/        # Sandbox environment (Dockerfile, compose, overlays, entrypoint)
install/              # Provisioning scripts (onboard.sh, heartbeat.sh, entrypoint.sh)
workspace/            # Template for all agent workspaces
  AGENTS.md           # In-sandbox agent instructions (separate from this file)
  SOUL.md             # Agent persona template
  MEMORY.md           # Long-term memory template
  heartbeats.conf     # Periodic task schedule
  .claude/skills/     # Reusable skill templates
    quality-gate/     # Template: validate decisions before execution
    strategy-review/  # Template: measure decision quality over time
packages/sandbox/     # @openharness/sandbox (CLI + container lifecycle tools)
  src/cli/            # openharness binary entry point
packages/slack/       # Vendored fork of pi-mom Slack bot (see .claude/rules/slack-package.md)
  src/                # TypeScript source (canonical — all edits here)
  dist/               # Compiled ESM output (committed, rebuilt before commit)
  src/__tests__/      # 64+ vitest tests (run in CI)
.github/ISSUE_TEMPLATE/  # agent, audit, bug, feature, skill, task
.claude/skills/          # Orchestrator skills (e.g., /provision)
.claude/specs/           # Architecture specs and decision records
.claude/rules/           # Coding rules (auto-loaded)
```
