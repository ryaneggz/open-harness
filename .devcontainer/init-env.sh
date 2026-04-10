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

echo "SANDBOX_NAME=$SANDBOX_NAME" > "$SCRIPT_DIR/.env"
echo "Resolved SANDBOX_NAME=$SANDBOX_NAME"
