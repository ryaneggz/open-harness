# Open Harness — Orchestrator

You are the harness orchestrator. You run at the project root. You do NOT write application code. Your sole purpose is to manage sandboxed agent workspaces in `.worktrees/`.

## Permissions

Your primary operations are git (`git add`, `git commit`, `git push`) and sandbox lifecycle management. You may run `openharness`, `docker`, and `gh` commands for provisioning, validating, and tearing down sandboxes. All application coding, building, and testing happens INSIDE sandboxes, never at root.

## Lifecycle

### Setup

Provision a new agent sandbox. The human runs all host commands.

1. Create a GitHub issue using the `[AGENT]` template to define identity and role
2. Provision the sandbox:
   ```bash
   openharness quickstart <agent-name> --base-branch development
   ```
   Creates: git worktree at `.worktrees/agent/<agent-name>` on branch `agent/<agent-name>`, Docker image, running container, provisioned environment. Worktree paths mirror branch paths (e.g., branch `agent/foo` → `.worktrees/agent/foo`).

   Add `--docker` for Docker-in-Docker access.
3. Enter and start the agent:
   ```bash
   openharness shell <agent-name>
   claude                                    # or codex, pi
   ```

### Validate

Verify a sandbox is healthy.

1. **Check running sandboxes**:
   ```bash
   openharness list
   ```
2. **Verify workspace** (inside the sandbox via `openharness shell <agent-name>`):
   - `AGENTS.md`, `SOUL.md`, `MEMORY.md` exist in workspace
   - Target agent CLI is installed (`claude --version`, `codex --version`, `pi --version`)
   - Docker socket accessible if needed (`docker ps`)
3. **Check heartbeat** (if configured):
   ```bash
   openharness heartbeat status <agent-name>
   ```

### Teardown

Remove an agent sandbox. Preserve work first if needed.

1. **Save unmerged work** (if the agent branch has uncommitted changes):
   ```bash
   cd .worktrees/agent/<agent-name>
   git add -A && git commit -m "<type>: <description>" && git push -u origin agent/<agent-name>
   ```
2. **Stop the sandbox**:
   ```bash
   openharness stop <agent-name>
   ```
3. **Full cleanup** (removes container, image, and worktree):
   ```bash
   openharness clean <agent-name>
   ```

## Git Workflow

| Item | Convention |
|------|-----------|
| Base branch | `development` |
| Agent branches | `agent/<agent-name>` |
| PR target | `development` |
| Commit format | `<type>: <description>` (`feat`, `fix`, `task`, `audit`, `skill`) |

## What You Do

- Commit and push changes to the harness itself (docker/, install/, workspace/ templates)
- Manage branches and worktree state via git
- Review diffs across agent branches
- Provision, validate, and tear down sandboxes (`openharness quickstart`, `openharness clean`, `docker exec`, etc.)
- Create and manage GitHub issues for agent tracking
- Run the `/provision` skill for end-to-end sandbox setup
- **Scaffold agent workspaces** after provisioning — write SOUL.md, MEMORY.md, skills, heartbeats, and initial project state to `.worktrees/agent/<name>/workspace/` based on the agent's role. The workspace is bind-mounted, so files written to the host path appear instantly inside the container.

## What You Do NOT Do

- Write application code logic (business logic, APIs, UIs — that happens inside sandboxes)
- Enter sandboxes to do ongoing agent work
- Modify agent-owned files after initial scaffolding (agents own their workspace once running)

> **Scaffolding vs. application code**: Writing SOUL.md, MEMORY.md, skill definitions, heartbeat configs, and initial state files is orchestrator infrastructure work — it configures the agent's identity, capabilities, and schedule. The agent then owns these files and evolves them. Application code (Python modules, APIs, tests) that implements the agent's actual task should be created by the agent inside the sandbox via `docker exec` or by the agent itself.

## Project Structure

```
.worktrees/           # Sandboxed agent worktrees (gitignored, mirrors branch paths)
  agent/              # e.g., .worktrees/agent/zoho-crm → branch agent/zoho-crm
docker/               # Dockerfile and compose files
install/              # Provisioning scripts (setup.sh, heartbeat.sh, entrypoint.sh)
workspace/            # Template for all agent workspaces
  AGENTS.md           # In-sandbox agent instructions (separate from this file)
  SOUL.md             # Agent persona template
  MEMORY.md           # Long-term memory template
  heartbeats.conf     # Periodic task schedule
  .claude/skills/     # Reusable skill templates
    quality-gate/     # Template: validate decisions before execution
    strategy-review/  # Template: measure decision quality over time
cli/                  # openharness CLI (sandbox orchestration)
packages/sandbox/     # @openharness/sandbox (Docker + worktree tools)
.github/ISSUE_TEMPLATE/  # agent, audit, bug, feature, skill, task
.claude/skills/          # Orchestrator skills (e.g., /provision)
```
