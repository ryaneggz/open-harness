#!/usr/bin/env bash
# Resolve SANDBOX_NAME from git remote (repo name) or directory name.
# Seeds .devcontainer/.env on first provision. Non-destructive: if the
# file already exists, this script does nothing.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"

# Respect user-authored .env — do not clobber
if [ -f "$ENV_FILE" ]; then
  exit 0
fi

if git -C "$REPO_ROOT" remote get-url origin &>/dev/null; then
  SANDBOX_NAME="$(basename -s .git "$(git -C "$REPO_ROOT" remote get-url origin)")"
else
  SANDBOX_NAME="$(basename "$REPO_ROOT")"
fi

# Resolve GIT_COMMON_DIR for worktree mounts
GIT_ENTRY="$REPO_ROOT/.git"
if [ -f "$GIT_ENTRY" ]; then
  GITDIR="$(sed 's/^gitdir: //' "$GIT_ENTRY")"
  [[ "$GITDIR" != /* ]] && GITDIR="$REPO_ROOT/$GITDIR"
  GIT_COMMON_DIR="$(cd "$GITDIR/../.." && pwd)"
else
  GIT_COMMON_DIR=""
fi

{
  echo "SANDBOX_NAME=$SANDBOX_NAME"
  [ -n "$GIT_COMMON_DIR" ] && echo "GIT_COMMON_DIR=$GIT_COMMON_DIR"
} > "$ENV_FILE"

echo "Seeded $ENV_FILE with SANDBOX_NAME=$SANDBOX_NAME"
[ -n "$GIT_COMMON_DIR" ] && echo "Resolved GIT_COMMON_DIR=$GIT_COMMON_DIR (worktree)"

# Warn if git overlay is configured but GIT_COMMON_DIR is empty (not a worktree)
CONFIG="$REPO_ROOT/.openharness/config.json"
if [ -f "$CONFIG" ] && [ -z "$GIT_COMMON_DIR" ]; then
  if jq -r '.composeOverrides[]' "$CONFIG" 2>/dev/null | grep -q "docker-compose.git.yml"; then
    echo "WARNING: docker-compose.git.yml is enabled but this is not a worktree."
    echo "         The git overlay requires GIT_COMMON_DIR. Remove it from .openharness/config.json"
    echo "         or run from a git worktree."
  fi
fi
