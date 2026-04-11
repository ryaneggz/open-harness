# feat(slack): Manage PI Agent from Slack — Issue #2

## Context

[Issue #2](https://github.com/ryaneggz/open-harness/issues/2) requests integrating [Mom](https://github.com/badlogic/pi-mono/tree/main/packages/mom) (Master Of Mischief) — a Slack bot from the pi-mono ecosystem — into Open Harness sandboxes. Mom connects to Slack via Socket Mode and lets users interact with sandbox agents from Slack channels. This extends the harness from CLI-only to Slack-based agent management.

**Key architecture decision**: Mom runs in `--sandbox=host` mode **inside** the existing sandbox container. The container IS the isolation boundary — no Docker-in-Docker needed for mom. This matches how claude/codex/pi already run inside sandboxes.

## Changes

### 1. `docker/docker-compose.yml` — Pass Slack env vars

Add `MOM_SLACK_APP_TOKEN` and `MOM_SLACK_BOT_TOKEN` to the environment section (same pattern as `HEARTBEAT_*` vars):

```yaml
- MOM_SLACK_APP_TOKEN=${MOM_SLACK_APP_TOKEN:-}
- MOM_SLACK_BOT_TOKEN=${MOM_SLACK_BOT_TOKEN:-}
```

### 2. `docker/Dockerfile` — Add mom alias

Add after the existing `pi` alias (line 12):

```dockerfile
&& echo "alias mom='mom --sandbox=host ~/workspace/mom-data'" >> /home/sandbox/.bashrc
```

### 3. `install/setup.sh` — Add mom as optional install

Follow the existing pattern (Pi Agent step 11, AgentMail step 12):

- **New variable**: `INSTALL_MOM=false` (top defaults), `MOM_SLACK_APP_TOKEN_VAL=""`, `MOM_SLACK_BOT_TOKEN_VAL=""`
- **Interactive prompt** (after Pi Agent, default `[y/N]`): ask to install + collect Slack tokens
- **Non-interactive**: `INSTALL_MOM=true` (tokens come via env vars from docker-compose)
- **Install block** (new step between Pi Agent and AgentMail): `npm install -g @mariozechner/pi-mom`, store tokens in `.bashrc` if provided (same pattern as `AGENTMAIL_API_KEY`)
- **Summary**: add `mom` to version output and next-steps

### 4. `install/entrypoint.sh` — Auto-start mom if tokens present

Add after heartbeat sync block (before the final `exec gosu`):

```bash
# Auto-start Mom Slack bot if tokens are present
if [[ -n "${MOM_SLACK_APP_TOKEN:-}" && -n "${MOM_SLACK_BOT_TOKEN:-}" ]]; then
  MOM_DATA="/home/sandbox/workspace/mom-data"
  mkdir -p "$MOM_DATA"
  chown sandbox:sandbox "$MOM_DATA"
  if command -v mom &>/dev/null; then
    gosu sandbox bash -c "nohup mom --sandbox=host $MOM_DATA >> $MOM_DATA/mom.log 2>&1 &"
  fi
fi
```

### 5. `install/heartbeat.sh` — Capture MOM_ env vars

Add `MOM_` to the env grep pattern (line 116):

```bash
env | grep -E '^(ANTHROPIC_|OPENAI_|HEARTBEAT_|GH_|GITHUB_|AGENTMAIL_|MOM_|NODE_|NPM_|BUN_)' \
```

### 6. `Makefile` — Add mom lifecycle targets

Three new targets following the heartbeat pattern:

| Target | Purpose |
|--------|---------|
| `mom-start` | Start mom in background (with duplicate check via `pgrep`) |
| `mom-stop` | Stop mom via `pkill` |
| `mom-status` | Show running state + last 10 log lines |

Also update: `.PHONY`, `help` target (new targets + env var docs).

### 7. `workspace/AGENTS.md` — Document mom in sandbox instructions

- Add row to Optional Agents table: `Mom (Slack) | mom | <docs link>`
- Add new "Mom (Slack Bot)" section after Heartbeat section covering: data directory, auto-start behavior, manual control, sandbox mode

### 8. `README.md` — User-facing Slack integration docs

Add a new section "Slack Integration (Mom)" covering:
- Slack app setup steps (Socket Mode, scopes, events)
- Environment variables (`MOM_SLACK_APP_TOKEN`, `MOM_SLACK_BOT_TOKEN`)
- Usage examples with `make` targets
- Add mom targets to the Makefile Targets table

### 9. `.claude/skills/provision/SKILL.md` — Update provisioning skill

Add mom awareness to:
- Step 1 (Interactive Mode): ask if the agent should have Slack access via mom
- Step 6 (Report Access): include `make mom-start/stop/status` commands when applicable

## Files to modify

| File | Change size |
|------|------------|
| `docker/docker-compose.yml` | 2 lines |
| `docker/Dockerfile` | 1 line |
| `install/setup.sh` | ~40 lines |
| `install/entrypoint.sh` | ~8 lines |
| `install/heartbeat.sh` | 1 line (grep pattern) |
| `Makefile` | ~35 lines |
| `workspace/AGENTS.md` | ~15 lines |
| `README.md` | ~30 lines |
| `.claude/skills/provision/SKILL.md` | ~10 lines |

## Verification

1. **Build test**: `make NAME=test-mom BASE_BRANCH=main build` — image builds without errors
2. **Install test**: `docker exec --user root test-mom bash -c '/home/sandbox/install/setup.sh --non-interactive'` — mom installs, shows in summary
3. **Alias test**: `docker exec --user sandbox test-mom bash -lc 'type mom'` — alias resolves
4. **Auto-start test**: Start container with `MOM_SLACK_APP_TOKEN=test MOM_SLACK_BOT_TOKEN=test`, verify mom process starts (will fail to connect but process should exist)
5. **Make targets**: `make NAME=test-mom mom-status` — runs without error
6. **Cleanup**: `make NAME=test-mom clean`
