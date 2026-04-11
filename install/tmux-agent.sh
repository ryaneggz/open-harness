#!/usr/bin/env bash
# Wraps an agent CLI in a new, incrementing tmux session.
# Usage: tmux-agent.sh <prefix> <command> [args...]
PREFIX="$1"; shift
if [ -n "$TMUX" ]; then
  exec "$@"
fi
# Find next available session number
N=1
while tmux has-session -t "${PREFIX}-${N}" 2>/dev/null; do
  N=$((N + 1))
done
exec tmux new-session -s "${PREFIX}-${N}" -- "$@"
