# Crontab-Driven Multi-Heartbeat System

## Context

The current heartbeat system uses a bash daemon with a `while true; sleep $INTERVAL` loop — a single interval, single file. The user wants crontab-driven heartbeats so multiple heartbeat files can run at different intervals (e.g., memory distill every 4h, deployment checks every 15m, daily summary at 8pm).

## Approach

Replace the sleep-loop daemon with crontab entries inside the container. A `heartbeats.conf` config file maps heartbeat `.md` files to cron schedules. On `sync`, the script parses the config, generates an `env.sh` (so cron has API keys + PATH), and installs crontab entries. On container boot, entrypoint auto-syncs.

## Files to Modify

### 1. `docker/Dockerfile`
- Add `cron` to apt-get install line

### 2. `install/entrypoint.sh`
- Start cron daemon (`service cron start`)
- Auto-sync heartbeat schedules if `heartbeats.conf` or legacy `HEARTBEAT.md` exists

### 3. `install/heartbeat.sh` (full rewrite)
Replace daemon loop with cron-based subcommands:

- **`sync` (default/start)** — Parse `heartbeats.conf`, generate `~/.heartbeat/env.sh` (captures ANTHROPIC_API_KEY, PATH, etc.), install crontab entries. If no `heartbeats.conf` exists, fall back to legacy `HEARTBEAT.md` + `HEARTBEAT_INTERVAL` env var.
- **`run <file> [agent] [active_range]`** — Single heartbeat execution (called by cron). Uses `flock` to prevent overlapping runs of the same file. Preserves all existing gates: `is_active_hours()`, `is_heartbeat_empty()`, SOUL.md injection, `is_heartbeat_ok()`.
- **`stop`** — Remove all heartbeat crontab entries (filter out lines matching `heartbeat.sh run`)
- **`status`** — Show installed crontab entries, cron daemon status, recent log lines
- **`migrate`** — Convert `HEARTBEAT_INTERVAL` seconds to cron expression, generate `heartbeats.conf`

Preserve all existing helpers: `log()`, `rotate_log()`, `is_heartbeat_empty()`, `is_active_hours()`, `is_heartbeat_ok()`, agent dispatch (`claude`, `codex`, generic).

Key detail — `env.sh` generation during sync:
```bash
# Captures current env so cron jobs have API keys, PATH, etc.
env | grep -E '^(ANTHROPIC_|OPENAI_|HEARTBEAT_|GH_|GITHUB_|PATH=|HOME=|USER=)' \
  | sed "s/^/export /" > ~/.heartbeat/env.sh
```

Each crontab entry:
```
*/15 * * * * . ~/.heartbeat/env.sh && /home/sandbox/install/heartbeat.sh run "file" "agent" "active_range" >> ~/.heartbeat/heartbeat.log 2>&1
```

### 4. `workspace/heartbeats.conf` (new)
Default config template:
```
# Format: <cron> | <file> | [agent] | [active_start-active_end]
*/30 * * * * | HEARTBEAT.md
```

### 5. `workspace/heartbeats/` (new directory)
- `.gitkeep`
- `example.md` — sample heartbeat file (not in conf by default)

### 6. `Makefile`
- Remove `HEARTBEAT_INTERVAL` variable (keep others as global defaults)
- `heartbeat` target: `docker exec --user sandbox $(NAME) heartbeat.sh sync` (no longer `-d` detached)
- Add `heartbeat-migrate` target
- Update `.PHONY`

### 7. `docker/docker-compose.yml`
- Remove `HEARTBEAT_INTERVAL` from environment (schedule now in `heartbeats.conf`)
- Keep `HEARTBEAT_ACTIVE_START`, `HEARTBEAT_ACTIVE_END`, `HEARTBEAT_AGENT`

### 8. `workspace/AGENTS.md`
- Update Heartbeat section to document multi-file cron system

### 9. `README.md`
- Update heartbeat documentation, config examples, make targets

## Backward Compatibility

- If no `heartbeats.conf` exists, `sync` auto-generates a crontab entry from `HEARTBEAT_INTERVAL` env var + `HEARTBEAT.md` (zero-config migration)
- `make heartbeat-migrate` explicitly creates `heartbeats.conf` from current settings
- Legacy `HEARTBEAT.md` can be referenced from `heartbeats.conf` like any other file

## Verification

1. `make NAME=test quickstart` — container starts, cron daemon running, heartbeats auto-synced
2. Inside container: `crontab -l` shows expected entries
3. `cat ~/.heartbeat/env.sh` has API keys and PATH
4. `make NAME=test heartbeat-status` — shows schedules and log
5. Edit `heartbeats.conf` → `make NAME=test heartbeat` → `crontab -l` updated
6. `make NAME=test heartbeat-stop` → `crontab -l` has no heartbeat entries
7. Empty heartbeat file → log shows "skipped"
8. Container restart → schedules re-installed automatically
