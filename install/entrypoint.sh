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

# Start cron daemon (needed for heartbeat scheduling)
if command -v cron &>/dev/null; then
  service cron start 2>/dev/null || true
fi

# Auto-sync heartbeat schedules from persistent config
if [ -f "/home/sandbox/workspace/heartbeats.conf" ]; then
  gosu sandbox /home/sandbox/install/heartbeat.sh sync 2>/dev/null || true
fi

# Auto-start Mom Slack bot if tokens are present
if [[ -n "${MOM_SLACK_APP_TOKEN:-}" && -n "${MOM_SLACK_BOT_TOKEN:-}" ]]; then
  MOM_DATA="/home/sandbox/workspace/mom-data"
  mkdir -p "$MOM_DATA"
  chown sandbox:sandbox "$MOM_DATA"
  if command -v mom &>/dev/null; then
    gosu sandbox bash -c "nohup mom --sandbox=host $MOM_DATA >> $MOM_DATA/mom.log 2>&1 &"
  fi
fi

exec gosu sandbox "$@"
