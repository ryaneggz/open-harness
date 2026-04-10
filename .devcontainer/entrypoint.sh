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

# Run workspace startup (dev server + tunnel) as sandbox user
STARTUP="/home/sandbox/harness/workspace/startup.sh"
if [ -f "$STARTUP" ]; then
  gosu sandbox bash "$STARTUP" 2>&1 | sed 's/^/  /' || true
fi

exec "$@"
