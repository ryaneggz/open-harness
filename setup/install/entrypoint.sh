#!/usr/bin/env bash
set -e

PROJECT_ROOT="${PROJECT_ROOT:-/home/sandbox}"
INSTALL_ROOT="${INSTALL_ROOT:-/opt/open-harness/install}"
export HOME="/home/sandbox"
export USER="sandbox"

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

# Start cron daemon (needed for heartbeat scheduling)
if command -v cron &>/dev/null; then
  service cron start 2>/dev/null || true
fi

# Ensure runtime memory dir exists and stays ignored by default
gosu sandbox env HOME="$HOME" USER="$USER" PROJECT_ROOT="$PROJECT_ROOT" INSTALL_ROOT="$INSTALL_ROOT" bash -lc '
  mkdir -p "$PROJECT_ROOT/memory"
  if [ ! -f "$PROJECT_ROOT/memory/.gitignore" ]; then
    printf "*\n!.gitignore\n!.gitkeep\n" > "$PROJECT_ROOT/memory/.gitignore"
  fi
  if [ ! -f "$PROJECT_ROOT/memory/.gitkeep" ]; then
    : > "$PROJECT_ROOT/memory/.gitkeep"
  fi
' 2>/dev/null || true

# Auto-sync heartbeat schedules from the mounted project root
if [ -f "$PROJECT_ROOT/heartbeats.conf" ]; then
  gosu sandbox env HOME="$HOME" USER="$USER" PROJECT_ROOT="$PROJECT_ROOT" INSTALL_ROOT="$INSTALL_ROOT" \
    "$INSTALL_ROOT/heartbeat.sh" sync 2>/dev/null || true
fi

exec gosu sandbox env HOME="$HOME" USER="$USER" PROJECT_ROOT="$PROJECT_ROOT" INSTALL_ROOT="$INSTALL_ROOT" "$@"
