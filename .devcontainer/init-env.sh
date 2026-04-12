#!/usr/bin/env bash
# Resolve SANDBOX_NAME from git remote (repo name) or directory name.
# Writes .devcontainer/.env so docker compose picks it up.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

if git -C "$REPO_ROOT" remote get-url origin &>/dev/null; then
  SANDBOX_NAME="$(basename -s .git "$(git -C "$REPO_ROOT" remote get-url origin)")"
else
  SANDBOX_NAME="$(basename "$REPO_ROOT")"
fi

# Resolve GIT_COMMON_DIR for worktree mounts
# If .git is a file (worktree), resolve the parent .git directory
GIT_ENTRY="$REPO_ROOT/.git"
if [ -f "$GIT_ENTRY" ]; then
  # Worktree: .git file contains "gitdir: /path/to/.git/worktrees/<name>"
  GITDIR="$(sed 's/^gitdir: //' "$GIT_ENTRY")"
  # Make absolute if relative
  [[ "$GITDIR" != /* ]] && GITDIR="$REPO_ROOT/$GITDIR"
  # The common dir is two levels up from .git/worktrees/<name>
  GIT_COMMON_DIR="$(cd "$GITDIR/../.." && pwd)"
else
  GIT_COMMON_DIR=""
fi

{
  echo "SANDBOX_NAME=$SANDBOX_NAME"
  [ -n "$GIT_COMMON_DIR" ] && echo "GIT_COMMON_DIR=$GIT_COMMON_DIR"

  # Forward vars from root .env (Slack tokens, provider config, etc.)
  ROOT_ENV="$REPO_ROOT/.env"
  if [ -f "$ROOT_ENV" ]; then
    grep -v '^\s*#' "$ROOT_ENV" | grep -v '^\s*$' | while IFS= read -r line; do
      echo "$line"
    done
  fi
} > "$SCRIPT_DIR/.env"

echo "Resolved SANDBOX_NAME=$SANDBOX_NAME"
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
