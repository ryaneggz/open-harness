#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[startup]"
log() { echo "$LOG_PREFIX $*"; }

APP_DIR="$HOME/harness/workspace/projects/next-app"

# ─── 0. Onboarding check ─────────────────────────────────────────
ONBOARD_MARKER="$HOME/.claude/.onboarded"
if [ ! -f "$ONBOARD_MARKER" ]; then
  log "Onboarding not complete — skipping app startup"
  log ""
  log "  To complete first-time setup, run:"
  log "    openharness onboard"
  log ""

  # Still install deps so the workspace is ready when user onboards
  cd "$APP_DIR"
  pnpm install 2>&1 | tail -3

  log "Deps installed. Waiting for onboarding..."
  exit 0
fi

# ─── 1. Install dependencies ──────────────────────────────────────
log "Installing dependencies..."
cd "$APP_DIR"
pnpm install

# ─── 2. Start Next.js dev server ──────────────────────────────────
log "Starting Next.js dev server..."
pnpm dev > /tmp/next-dev.log 2>&1 &
NEXT_PID=$!
echo "$NEXT_PID" > /tmp/next-dev.pid

# ─── 3. Start docs site ───────────────────────────────────────────
DOCS_DIR="$HOME/harness/docs"
if [ -d "$DOCS_DIR" ]; then
  log "Starting docs site on port 3001..."
  cd "$DOCS_DIR"
  pnpm dev > /tmp/docs-dev.log 2>&1 &
  echo $! > /tmp/docs-dev.pid
  cd "$APP_DIR"
fi

# ─── 4. Start Cloudflare tunnels (if configured) ─────────────────
CFLARED_DIR="$HOME/.cloudflared"
TUNNEL_CONFIGS=$(ls "$CFLARED_DIR"/config-*.yml 2>/dev/null || true)

if [ -n "$TUNNEL_CONFIGS" ]; then
  for TUNNEL_CONFIG in $TUNNEL_CONFIGS; do
    TUNNEL_NAME=$(basename "$TUNNEL_CONFIG" | sed 's/^config-//;s/\.yml$//')
    log "Starting cloudflared tunnel ($TUNNEL_NAME)..."
    cloudflared tunnel --config "$TUNNEL_CONFIG" run "$TUNNEL_NAME" > "/tmp/cloudflared-${TUNNEL_NAME}.log" 2>&1 &
    echo $! > "/tmp/cloudflared-${TUNNEL_NAME}.pid"
  done
elif [ -f "$CFLARED_DIR/cert.pem" ]; then
  log "Tunnel config not found. Run: ~/install/cloudflared-tunnel.sh <name> <hostname> <port>"
else
  log "WARN: cloudflared not authenticated, tunnel skipped"
fi

# ─── 5. Wait for servers to be ready ─────────────────────────────
log "Waiting for port 3000..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    log "Next.js ready on port 3000"
    break
  fi
  if [ "$i" -eq 30 ]; then
    log "WARN: Port 3000 not responding after 30s"
  fi
  sleep 1
done

if [ -f /tmp/docs-dev.pid ]; then
  log "Waiting for port 3001..."
  for i in $(seq 1 30); do
    if curl -sf http://localhost:3001 > /dev/null 2>&1; then
      log "Docs ready on port 3001"
      break
    fi
    if [ "$i" -eq 30 ]; then
      log "WARN: Port 3001 not responding after 30s"
    fi
    sleep 1
  done
fi

log "Startup complete"
