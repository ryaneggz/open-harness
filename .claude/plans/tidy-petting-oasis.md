# Provision Demo Sandbox + Test `/setup-slack`

## Context
Provision a minimal demo sandbox from `feat/slack-mom` (current branch) to test the one-shot `/setup-slack` skill end-to-end. This branch has the Mom Slack bot integration, the `setup-slack` skill, and the Slack manifest — the demo sandbox is the vehicle to verify everything works.

## Steps

### 1. Create GitHub Issue
```bash
gh issue create --title "[AGENT] demo — general-purpose demo assistant" \
  --body "<agent template with name=demo, branch=agent/demo>"
```

### 2. Provision Sandbox
```bash
make NAME=demo BASE_BRANCH=feat/slack-mom quickstart
```
Uses `feat/slack-mom` as base so the worktree has the Mom integration code (install/setup.sh with Mom, entrypoint.sh with Mom auto-start, Makefile mom-* targets, etc.).

### 3. Scaffold Workspace
Write to `.worktrees/agent/demo/workspace/` (host-side, bind-mounted):
- **SOUL.md** — Minimal general-purpose persona
- **MEMORY.md** — Empty starter

### 4. Verify Sandbox
```bash
make list                    # demo appears
docker ps | grep demo        # container running
```

### 5. Run `/setup-slack` Skill
Invoke the `setup-slack` skill with `demo` as argument. This will:
1. Verify the container is running and Mom is installed
2. Check for existing Slack tokens in `config/.env`
3. Walk the user through Slack app creation (using the manifest at `.claude/skills/setup-slack/slack-manifest.json`)
4. Collect tokens and write to `.worktrees/agent/demo/config/.env`
5. Configure AI auth (OAuth or API key)
6. Start and verify Mom

## Key Files
- `.claude/skills/setup-slack/SKILL.md` — the skill being tested
- `.claude/skills/setup-slack/slack-manifest.json` — Slack app manifest
- `Makefile` — `quickstart`, `mom-start`, `mom-stop`, `mom-status` targets
- `install/setup.sh` — installs Mom during provisioning
- `install/entrypoint.sh` — auto-starts Mom if tokens present

## Verification
- `make NAME=demo mom-status` shows Mom running with PID
- Send a DM or mention to the bot in Slack → get a response
