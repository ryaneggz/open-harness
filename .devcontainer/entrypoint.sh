#!/usr/bin/env bash
set -e

# Match the container's docker group GID to the host socket's GID
# so the sandbox user can use Docker without sudo.
SOCK=/var/run/docker.sock
if [ -S "$SOCK" ]; then
  HOST_GID=$(stat -c '%g' "$SOCK")
  CUR_GID=$(getent group docker | cut -d: -f3)
  if [ "$HOST_GID" != "$CUR_GID" ]; then
    groupmod -g "$HOST_GID" docker 2>/dev/null || true
  fi
fi

# Fix ownership of mounted volumes (created as root by Docker)
for dir in .claude .cloudflared .config/gh .ssh .pi; do
  if [ -d "/home/sandbox/$dir" ]; then
    chown -R sandbox:sandbox "/home/sandbox/$dir" 2>/dev/null || true
    [ "$dir" = ".ssh" ] && chmod 700 "/home/sandbox/$dir" 2>/dev/null || true
  fi
done

# Generate SSH keypair if none exists (for ssh-keys volume)
if [ -d "/home/sandbox/.ssh" ] && [ ! -f "/home/sandbox/.ssh/id_ed25519" ]; then
  gosu sandbox ssh-keygen -t ed25519 -f /home/sandbox/.ssh/id_ed25519 -N "" -C "sandbox@$(hostname)" 2>/dev/null || true
fi

# Generate SSH host keys if missing (needed for sshd to accept connections)
if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
  ssh-keygen -A
fi

# Start cron daemon (needed for heartbeat scheduling)
if command -v cron &>/dev/null; then
  service cron start 2>/dev/null || true
fi

# Auto-sync heartbeat schedules from persistent config
if [ -f "/home/sandbox/harness/workspace/heartbeats.conf" ]; then
  gosu sandbox /home/sandbox/install/heartbeat.sh sync 2>/dev/null || true
fi

# Build and link openharness CLI in background (from bind-mounted repo)
HARNESS="/home/sandbox/harness"
if [ -f "$HARNESS/packages/sandbox/package.json" ] && ! command -v openharness &>/dev/null; then
  (
    cd "$HARNESS"
    gosu sandbox pnpm install --frozen-lockfile 2>/dev/null || gosu sandbox pnpm install 2>/dev/null || true
    gosu sandbox pnpm --filter @openharness/sandbox run build 2>/dev/null || true
    ln -sf "$HARNESS/packages/sandbox/dist/src/cli/index.js" /usr/local/bin/openharness
    chmod +x /usr/local/bin/openharness
    echo "[entrypoint] openharness CLI installed"
  ) &
fi

# Run workspace startup (dev server + tunnel) as sandbox user
STARTUP="/home/sandbox/harness/workspace/startup.sh"
if [ -f "$STARTUP" ]; then
  gosu sandbox bash "$STARTUP" 2>&1 | sed 's/^/  /' || true
fi

# Copy Pi agent auth to Mom if Mom auth is missing/empty
if [ -d "/home/sandbox/.pi/agent" ] && [ -s "/home/sandbox/.pi/agent/auth.json" ]; then
  SLACKDIR="/home/sandbox/.pi/slack"
  if [ ! -s "$SLACKDIR/auth.json" ]; then
    mkdir -p "$SLACKDIR"
    ln -sf /home/sandbox/.pi/agent/auth.json "$SLACKDIR/auth.json"
    chown -R sandbox:sandbox "$SLACKDIR"
  fi
fi

# Auto-start Mom (Slack bot) if tokens are present
if [ -n "${SLACK_APP_TOKEN:-}" ] && [ -n "${SLACK_BOT_TOKEN:-}" ]; then
  if command -v mom &>/dev/null; then
    gosu sandbox tmux new-session -d -s slack \
      'mom --sandbox=host ~/harness/workspace/.slack' 2>/dev/null || true
    echo "[entrypoint] Mom started (tmux attach -t slack)"
  fi
fi

# First-boot message if onboarding not complete
if [ ! -f "/home/sandbox/.claude/.onboarded" ]; then
  echo ""
  echo "  ┌─────────────────────────────────────────────────┐"
  echo "  │  First boot detected. Complete setup:           │"
  echo "  │    openharness onboard <name>                   │"
  echo "  │  Or from inside the container:                  │"
  echo "  │    bash ~/install/onboard.sh                    │"
  echo "  └─────────────────────────────────────────────────┘"
  echo ""
fi

exec "$@"
