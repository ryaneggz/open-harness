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

# Fix ownership of mounted .claude auth directory
if [ -d /home/sandbox/.claude ]; then
  chown -R sandbox:sandbox /home/sandbox/.claude 2>/dev/null || true
fi

# Start cron daemon (needed for heartbeat scheduling)
if command -v cron &>/dev/null; then
  service cron start 2>/dev/null || true
fi

# Auto-sync heartbeat schedules from persistent config
if [ -f "/home/sandbox/harness/workspace/heartbeats.conf" ]; then
  gosu sandbox /home/sandbox/install/heartbeat.sh sync 2>/dev/null || true
fi

# Install cloudflared if requested but missing (requires root)
if [ "${INSTALL_CLOUDFLARED:-false}" = "true" ] && ! command -v cloudflared &>/dev/null; then
  echo "[entrypoint] Installing cloudflared..."
  apt-get update -qq && \
  apt-get install -y -qq --no-install-recommends lsb-release gnupg && \
  curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
    -o /usr/share/keyrings/cloudflare-main.gpg && \
  ARCH=$(dpkg --print-architecture) && \
  CODENAME=$(lsb_release -cs) && \
  echo "deb [arch=${ARCH} signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared ${CODENAME} main" \
    > /etc/apt/sources.list.d/cloudflared.list && \
  apt-get update -qq && \
  apt-get install -y -qq --no-install-recommends cloudflared && \
  rm -rf /var/lib/apt/lists/* && \
  echo "[entrypoint] cloudflared $(cloudflared --version 2>&1 | head -1) installed" || \
  echo "[entrypoint] WARNING: cloudflared install failed"
fi

# Install agent-browser + Chromium if requested but missing (requires root)
if [ "${INSTALL_BROWSER:-false}" = "true" ] && ! command -v agent-browser &>/dev/null; then
  echo "[entrypoint] Installing agent-browser + Chromium..."
  npm install -g agent-browser && \
  agent-browser install --with-deps && \
  echo "[entrypoint] agent-browser installed" || \
  echo "[entrypoint] WARNING: agent-browser install failed"
fi

# Run workspace startup (dev server + tunnel) as sandbox user
STARTUP="/home/sandbox/harness/workspace/startup.sh"
if [ -f "$STARTUP" ]; then
  gosu sandbox bash "$STARTUP" 2>&1 | sed 's/^/  /' || true
fi

exec gosu sandbox "$@"
