# Plan: Re-provision zoho-manager with Slack (Mom bot)

## Context

The zoho-manager agent was previously provisioned (2026-03-29) but has no active worktree, container, or running state. A stale local branch `agent/zoho-manager` exists but has no unique work. The user wants a fresh sandbox with Slack/Mom integration.

## Steps

### 1. Delete stale branch
```bash
git branch -D agent/zoho-manager
```
Local-only branch, no remote, no unique commits. Must be removed because `make worktree` uses `git worktree add -b agent/zoho-manager` which fails if the branch exists.

### 2. Provision sandbox
```bash
make NAME=zoho-manager BASE_BRANCH=feat/slack-mom quickstart
```
Uses `feat/slack-mom` as base because Mom/Slack integration (entrypoint auto-start, mom-start/stop/status targets, config/ bind mount) is only on this branch. This creates the worktree, builds Docker image, starts container, and runs `setup.sh --non-interactive`.

### 3. Verify health
- Container running: `docker ps --filter "name=zoho-manager"`
- Mom CLI installed: `docker exec --user sandbox zoho-manager bash -c 'which mom'`
- Workspace files present: `ls .worktrees/agent/zoho-manager/workspace/SOUL.md`

### 4. Scaffold workspace
Write directly to host path `.worktrees/agent/zoho-manager/workspace/` (bind-mounted):

| File | Purpose |
|------|---------|
| `SOUL.md` | GTM agent persona for Zoho CRM / ruska.ai services |
| `MEMORY.md` | Seeded with role context, Zoho CRM structure |

### 5. Configure Slack via `/setup-slack zoho-manager`
Interactive 7-step process:
1. Verify prerequisites (container + mom installed)
2. Check existing config
3. **User provides** Slack tokens (xapp- and xoxb-) — written to `config/.env`
4. **User configures** AI auth (OAuth or API key)
5. Start Mom: `make NAME=zoho-manager mom-start`
6. Verify Mom connected
7. Report summary

### 6. Final verification
```bash
make list                              # zoho-manager in running containers
make NAME=zoho-manager mom-status      # Mom bot running
```

## Critical Files
- `/home/ryaneggz/ruska-ai/sandboxes/Makefile` — lifecycle targets
- `/home/ryaneggz/ruska-ai/sandboxes/.claude/skills/setup-slack/SKILL.md` — Slack config skill
- `/home/ryaneggz/ruska-ai/sandboxes/.claude/skills/setup-slack/slack-manifest.json` — Slack app manifest
- `/home/ryaneggz/ruska-ai/sandboxes/install/entrypoint.sh` — auto-starts Mom when tokens present

## Notes
- Each sandbox needs its own Slack app — cannot reuse tokens from slack-assistant (two Mom instances on same app token compete for events)
- No container restart needed after writing `config/.env` — `mom-start` sources it directly
- Quickstart takes ~2-3 min (Docker build + setup.sh installs)
