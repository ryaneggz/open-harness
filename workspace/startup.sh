#!/usr/bin/env bash
# Workspace startup — runs on every container start (via entrypoint.sh)
# and at end of setup.sh on fresh provision
set -euo pipefail

APP_DIR="$HOME/harness/workspace/projects/next-app"
LOG_PREFIX="[startup]"
MAX_RETRIES=30
RETRY_INTERVAL=2

# ─── Helpers ────────────────────────────────────────────────────────
log() { printf '%s %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$LOG_PREFIX" "$*"; }
die() { log "FATAL: $*"; exit 1; }

is_running() {
  local pattern="$1"
  if command -v pgrep &>/dev/null; then
    pgrep -f "$pattern" > /dev/null 2>&1
  else
    grep -rlq "$pattern" /proc/[0-9]*/cmdline 2>/dev/null
  fi
}

# ─── 1. Validate app directory ──────────────────────────────────────
if [ ! -f "$APP_DIR/package.json" ]; then
  die "No package.json found at $APP_DIR"
fi
cd "$APP_DIR"

# ─── 2. Install dependencies ────────────────────────────────────────
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  log "Installing dependencies..."
  if ! npm install --prefer-offline 2>&1; then
    die "npm install failed"
  fi
  log "Dependencies installed"
else
  log "node_modules up to date — skipping"
fi

# ─── 3. Wait for PostgreSQL ─────────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|p')
  DB_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\2|p')
  DB_HOST="${DB_HOST:-${PGHOST:-postgres}}"
  DB_PORT="${DB_PORT:-5432}"

  log "Waiting for PostgreSQL at $DB_HOST:$DB_PORT..."
  retries=0
  until bash -c "echo > /dev/tcp/$DB_HOST/$DB_PORT" 2>/dev/null; do
    retries=$((retries + 1))
    if [ "$retries" -ge "$MAX_RETRIES" ]; then
      die "PostgreSQL not reachable after $((MAX_RETRIES * RETRY_INTERVAL))s"
    fi
    sleep "$RETRY_INTERVAL"
  done
  log "PostgreSQL is reachable"
else
  log "WARNING: DATABASE_URL not set — skipping DB check"
fi

# ─── 4. Prisma generate + migrate ───────────────────────────────────
if [ -f prisma/schema.prisma ]; then
  log "Running prisma generate..."
  rm -rf src/generated/prisma
  if ! npx prisma generate 2>&1; then
    die "prisma generate failed"
  fi

  if [ -n "${DATABASE_URL:-}" ]; then
    log "Running prisma migrate deploy..."
    if ! npx prisma migrate deploy 2>&1; then
      log "WARNING: prisma migrate deploy failed (may be no migrations yet)"
    fi
  fi
fi

# ─── 5. Unified agent config (openharness + mom symlinks) ─────────
WORKSPACE_DIR="$HOME/harness/workspace"
MOM_DIR="$WORKSPACE_DIR/.mom"

# OpenHarness project config — share agents/rules with claude
# Note: workspace/.openharness -> ../.openharness (root), so symlink
# targets are relative to the root .openharness/ directory
OH_DIR="$HOME/harness/.openharness"
[ ! -L "$OH_DIR/agents" ] && ln -sf ../workspace/.claude/agents "$OH_DIR/agents"
[ ! -L "$OH_DIR/rules" ]  && ln -sf ../workspace/.claude/rules  "$OH_DIR/rules"

# OpenHarness settings — load from .claude/skills
if [ ! -f "$OH_DIR/settings.json" ]; then
  echo '{"skills":["./.claude/skills/"]}' > "$OH_DIR/settings.json"
fi

# Mom working directory
mkdir -p "$MOM_DIR/events"
[ ! -L "$MOM_DIR/skills" ] && ln -sf ../.claude/skills "$MOM_DIR/skills"

# Auth sharing — mom uses openharness credentials
mkdir -p "$HOME/.openharness/mom"
if [ ! -L "$HOME/.openharness/mom/auth.json" ] && [ -f "$HOME/.openharness/agent/auth.json" ]; then
  ln -sf "$HOME/.openharness/agent/auth.json" "$HOME/.openharness/mom/auth.json"
fi

# Memory unification — move real MEMORY.md to .mom/, symlink back
if [ -f "$WORKSPACE_DIR/MEMORY.md" ] && [ ! -L "$WORKSPACE_DIR/MEMORY.md" ]; then
  log "Migrating MEMORY.md to .mom/ (one-time)"
  cp "$WORKSPACE_DIR/MEMORY.md" "$MOM_DIR/MEMORY.md"
  rm "$WORKSPACE_DIR/MEMORY.md"
  ln -sf .mom/MEMORY.md "$WORKSPACE_DIR/MEMORY.md"
elif [ ! -e "$MOM_DIR/MEMORY.md" ]; then
  touch "$MOM_DIR/MEMORY.md"
  [ ! -L "$WORKSPACE_DIR/MEMORY.md" ] && ln -sf .mom/MEMORY.md "$WORKSPACE_DIR/MEMORY.md"
fi
log "Agent config symlinks established"

# ─── 6. Start Mom Slack bot ───────────────────────────────────────
# Fallback: source .env.mom if tokens not already in environment
ENV_MOM="$HOME/harness/.devcontainer/.env.mom"
if [ -z "${MOM_SLACK_APP_TOKEN:-}" ] && [ -f "$ENV_MOM" ]; then
  log "Slack tokens missing from env — sourcing $ENV_MOM"
  set -a
  # shellcheck disable=SC1090
  source <(grep -v '^#' "$ENV_MOM" | grep -v '^$')
  set +a
fi

if [ -n "${MOM_SLACK_APP_TOKEN:-}" ] && [ -n "${MOM_SLACK_BOT_TOKEN:-}" ]; then
  if command -v mom &>/dev/null; then
    if ! tmux has-session -t mom 2>/dev/null; then
      log "Starting mom in tmux session..."
      tmux new-session -d -s mom \
        "mom --sandbox=host $MOM_DIR 2>&1 | tee /tmp/mom.log"
      log "Mom started (tmux session: mom)"
    else
      log "Mom already running — skipping"
    fi
  else
    log "WARNING: mom not installed — skipping"
  fi
else
  log "Mom: no Slack tokens — skipping (set MOM_SLACK_APP_TOKEN + MOM_SLACK_BOT_TOKEN)"
fi

# ─── 7. Start Next.js dev server ────────────────────────────────────
if ! is_running "next dev"; then
  log "Starting Next.js dev server..."
  nohup npm run dev > /tmp/next-dev.log 2>&1 &
  log "Next.js started (PID: $!)"
else
  log "Next.js already running — skipping"
fi

# ─── 8. Start cloudflared tunnel ────────────────────────────────────
TUNNEL_TOKEN="${TUNNEL_TOKEN:-${CLOUDFLARE_TUNNEL_TOKEN:-}}"
if command -v cloudflared &>/dev/null; then
  if [ -z "$TUNNEL_TOKEN" ]; then
    log "cloudflared token missing — skipping tunnel"
  elif ! is_running "cloudflared tunnel"; then
    log "Starting cloudflared tunnel..."
    nohup cloudflared tunnel --url http://localhost:3000 run --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &
    log "cloudflared started (PID: $!)"
  else
    log "cloudflared already running — skipping"
  fi
else
  log "WARNING: cloudflared not installed — skipping tunnel"
fi

# ─── 9. Health verification ─────────────────────────────────────────
log "Verifying dev server health..."
retries=0
until curl -sf http://localhost:3000 > /dev/null 2>&1; do
  retries=$((retries + 1))
  if [ "$retries" -ge "$MAX_RETRIES" ]; then
    log "WARNING: dev server not responding after $((MAX_RETRIES * RETRY_INTERVAL))s — check /tmp/next-dev.log"
    break
  fi
  sleep "$RETRY_INTERVAL"
done
if [ "$retries" -lt "$MAX_RETRIES" ]; then
  log "Dev server healthy (http://localhost:3000)"
fi

log "Startup complete"
