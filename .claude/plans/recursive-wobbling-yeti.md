# Plan: `config/.env` — persistent, hot-reloadable sandbox config

## Context

Slack tokens are passed via host env vars through `docker-compose.yml`. When a container is recreated, tokens are lost unless the user re-exports them. Tokens written to `.bashrc` inside the container are also ephemeral. The user needs to update tokens and have them take effect **without recreating the container** — just `mom-stop && mom-start`.

## Design

New `config/` directory at the same level as `docker/`, `install/`, `workspace/`. Bind-mounted into the container at `/home/sandbox/config`. Contains `.env` for persistent sandbox configuration.

```
docker/
install/
config/            <-- new, bind-mounted
  .env
  .example.env
workspace/
```

Source `config/.env` at runtime in 4 places so changes take effect immediately:

1. **`entrypoint.sh`** — source before Mom auto-start (container boot)
2. **Makefile `mom-start`** — source before launching Mom (manual start)
3. **`.bashrc`** — source for interactive shells (added by `setup.sh`)
4. **`heartbeat.sh`** — source in `generate_env_file` so cron jobs get tokens

**No container restart needed.** Update `config/.env`, run `make mom-stop && make mom-start`.

## Changes

### 1. `docker/docker-compose.yml` — add config volume mount

```yaml
volumes:
  - ../workspace:/home/sandbox/workspace
  - ../config:/home/sandbox/config
```

### 2. `config/.example.env` (new)

```
# Sandbox environment configuration
# Copy to .env and fill in values. Changes take effect on next mom-start / heartbeat sync.
# MOM_SLACK_APP_TOKEN=xapp-...
# MOM_SLACK_BOT_TOKEN=xoxb-...
# HEARTBEAT_ACTIVE_START=9
# HEARTBEAT_ACTIVE_END=18
# HEARTBEAT_AGENT=claude
```

### 3. `install/entrypoint.sh` — source config/.env before Mom check

Add before line 25 (the Mom auto-start block):
```bash
# Source persistent env config if present
[ -f /home/sandbox/config/.env ] && set -a && . /home/sandbox/config/.env && set +a
```

### 4. `Makefile` `mom-start` target — source .env before launching

Change the docker exec to source `config/.env` first:
```makefile
docker exec --user sandbox $(NAME) bash -c '\
  [ -f ~/config/.env ] && set -a && . ~/config/.env && set +a; \
  if pgrep ...
```

### 5. `install/setup.sh` — write tokens to `config/.env` instead of `.bashrc`

Replace the `.bashrc` token loop (lines 204-220) with writing to `config/.env`:
```bash
ENV_FILE="/home/sandbox/config/.env"
mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chown "$SANDBOX_USER:$SANDBOX_USER" "$ENV_FILE"
```

Also add a `.bashrc` line to source it:
```bash
echo '[ -f ~/config/.env ] && set -a && . ~/config/.env && set +a' >> /home/$SANDBOX_USER/.bashrc
```

### 6. `install/heartbeat.sh` — source config/.env in generate_env_file

Add at top of `generate_env_file` function:
```bash
[ -f "$HOME/config/.env" ] && set -a && . "$HOME/config/.env" && set +a
```

### 7. `/setup:slack` skill — write to config/.env

Update step 3 to write tokens to `.worktrees/agent/<NAME>/config/.env` via Write tool.

### 8. README — update Slack section

Replace `export` instructions with:
```bash
cat > .worktrees/agent/my-sandbox/config/.env << 'EOF'
MOM_SLACK_APP_TOKEN=xapp-...
MOM_SLACK_BOT_TOKEN=xoxb-...
EOF

make NAME=my-sandbox mom-start
```

### 9. Provision skill — mention config/.env in Slack step

## Files to modify

| File | Change |
|------|--------|
| `docker/docker-compose.yml` | Add `../config:/home/sandbox/config` volume |
| `config/.example.env` (new) | Template for available env vars |
| `install/entrypoint.sh` | Source `config/.env` before Mom auto-start |
| `install/setup.sh` | Write tokens to `config/.env`, add `.bashrc` source line |
| `install/heartbeat.sh` | Source `config/.env` in `generate_env_file` |
| `Makefile` | Source `config/.env` in `mom-start` target |
| `.claude/skills/setup/slack/SKILL.md` | Write tokens to `config/.env` |
| `.claude/skills/provision/SKILL.md` | Mention `config/.env` in Slack step |
| `README.md` | Update Slack instructions |

## Fix: Improve Mom response quality via MEMORY.md seeding

### Problem
Mom's responses in Slack are hard to follow:
- Raw bash output dumped directly (full `ls` listings, noisy)
- Generic identity ("I'm a Slack bot running in a harness")
- Usage summary with token counts shown to user (internal detail)
- Verbose, not conversational

### How Mom works
Mom auto-generates its system prompt — we cannot edit it directly. But it reads `MEMORY.md` files and injects their content into a `### Current Memory` section of the prompt. This is how we shape behavior.

Two files:
- `mom-data/MEMORY.md` — global memory (all channels)
- `mom-data/<channel-id>/MEMORY.md` — per-channel memory

### Plan
Write `mom-data/MEMORY.md` with:
- **Identity**: You are OpenHarness, an AI assistant for the Ruska AI team
- **Response style**: Concise, answer first, use Slack threading for detail
- **Formatting rules**: Summarize command output instead of dumping raw, use code blocks only for small snippets, keep initial replies under 200 words
- **Don't show**: Usage summaries, token counts, internal debug info
- **Context**: Ruska AI services, team info, key repos

Write `mom-data/C0APSL4SJQ5/MEMORY.md` with:
- Channel-specific context (this is the #open-harness channel for testing)

### Files to write (host paths via Write tool)
- `.worktrees/agent/slack-assistant/workspace/mom-data/MEMORY.md`
- `.worktrees/agent/slack-assistant/workspace/mom-data/C0APSL4SJQ5/MEMORY.md`

### Verification
Restart Mom, send a test message, check that responses are cleaner.

---

## Fix: Add missing scopes to slack-manifest.json

Mom's `fetchChannels` needs read access to all channel types. Add `groups:read` to `slack-manifest.json`. The `channels:read` scope was already added in a prior fix.

**File:** `slack-manifest.json`  
**Change:** Add `groups:read` to `oauth_config.scopes.bot`

After updating the manifest, user must:
1. Add `groups:read` scope in Slack app → OAuth & Permissions
2. Reinstall the app to the workspace
3. Run `make NAME=slack-assistant mom-start`

## Verification

1. Write tokens to `.worktrees/agent/slack-assistant/config/.env`
2. `make NAME=slack-assistant mom-stop && make NAME=slack-assistant mom-start` — picks up tokens (no restart)
3. `make NAME=slack-assistant shell` → `echo $MOM_SLACK_APP_TOKEN` — token present
4. Edit `config/.env` → `make mom-stop && mom-start` — picks up new value
5. `make stop && make run` — Mom auto-starts from `config/.env`
6. `make heartbeat` → cron env file includes tokens
