#!/usr/bin/env bash
set -e

# Match the container's docker group GID to the host socket's GID
# so the orchestrator user can use Docker without sudo.
SOCK=/var/run/docker.sock
if [ -S "$SOCK" ]; then
  HOST_GID=$(stat -c '%g' "$SOCK")
  CUR_GID=$(getent group docker | cut -d: -f3)
  if [ "$HOST_GID" != "$CUR_GID" ]; then
    groupmod -g "$HOST_GID" docker 2>/dev/null || true
  fi
fi

# Fix ownership of mounted .claude auth directory
if [ -d /home/orchestrator/.claude ]; then
  chown -R orchestrator:orchestrator /home/orchestrator/.claude 2>/dev/null || true
fi

exec "$@"
