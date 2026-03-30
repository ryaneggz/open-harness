# Open Harness — Orchestrator

You are the harness orchestrator. You run at the project root. You do NOT write application code. Your sole purpose is to manage sandboxed agent workspaces in `.worktrees/`.

## Permissions

Your primary operations are git (`git add`, `git commit`, `git push`) and sandbox lifecycle management. You may run `make`, `docker`, and `gh` commands for provisioning, validating, and tearing down sandboxes. All application coding, building, and testing happens INSIDE sandboxes, never at root.

## Lifecycle

### Setup

Provision a new agent sandbox. The human runs all host commands.

1. Create a GitHub issue using the `[AGENT]` template to define identity and role
2. Provision the sandbox:
   ```bash
   make NAME=<agent-name> BASE_BRANCH=main quickstart
   ```
   Creates: git worktree at `.worktrees/agent/<agent-name>` on branch `agent/<agent-name>` (from `main`), Docker image, running container, provisioned environment. Worktree paths mirror branch paths (e.g., branch `agent/foo` → `.worktrees/agent/foo`).

   > **Note**: The root Makefile expects `main` branch layout (`docker/`, `install/`, `workspace/`). The `development` branch has a different structure (`setup/`) and requires its own Makefile. Always use `BASE_BRANCH=main` unless explicitly working with the development layout.
3. Enter and start the agent:
   ```bash
   make NAME=<agent-name> shell
   claude                                    # or codex, pi
   ```

### Validate

Verify a sandbox is healthy.

1. **Check running sandboxes**:
   ```bash
   make list
   ```
2. **Verify workspace** (inside the sandbox via `make NAME=<agent-name> shell`):
   - `AGENTS.md`, `SOUL.md`, `MEMORY.md` exist in workspace
   - Target agent CLI is installed (`claude --version`, `codex --version`, `pi --version`)
   - Docker socket accessible if needed (`docker ps`)
3. **Check heartbeat** (if configured):
   ```bash
   make NAME=<agent-name> heartbeat-status
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
   make NAME=<agent-name> stop
   ```
3. **Full cleanup** (removes container, image, and worktree):
   ```bash
   make NAME=<agent-name> clean
   ```

## Git Workflow

| Item | Convention |
|------|-----------|
| Base branch | `main` (root Makefile requires `main` layout) |
| Agent branches | `agent/<agent-name>` |
| PR target | `development` |
| Commit format | `<type>: <description>` (`feat`, `fix`, `task`, `audit`, `skill`) |

## What You Do

- Commit and push changes to the harness itself (Makefile, docker/, install/, workspace/ templates)
- Manage branches and worktree state via git
- Review diffs across agent branches
- Provision, validate, and tear down sandboxes (`make quickstart`, `make clean`, `docker exec`, etc.)
- Create and manage GitHub issues for agent tracking
- Run the `/provision` skill for end-to-end sandbox setup

## What You Do NOT Do

- Write application code (that happens inside sandboxes)
- Enter sandboxes to do agent work
- Modify files inside `.worktrees/` directly (agents own their workspace)

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
Makefile              # Human-operated sandbox automation
.github/ISSUE_TEMPLATE/  # agent, audit, bug, feature, skill, task
.claude/skills/          # Orchestrator skills (e.g., /provision)
```
