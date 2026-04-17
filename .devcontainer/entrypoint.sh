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
for dir in .claude .cloudflared .config/gh .ssh .pi .openharness; do
  if [ -d "/home/sandbox/$dir" ]; then
    chown -R sandbox:sandbox "/home/sandbox/$dir" 2>/dev/null || true
    [ "$dir" = ".ssh" ] && chmod 700 "/home/sandbox/$dir" 2>/dev/null || true
  fi
done

# ─── Git worktree resolution ────────────────────────────────────────
# When the sandbox runs from a git worktree, .git is a file (not a dir)
# pointing to the main repo's .git/worktrees/<name>. The main .git/ is
# outside the bind mount, so we mount it separately at /home/sandbox/.git-main
# (via docker-compose.git.yml) and rewrite the .git file to resolve inside
# the container.
HARNESS="/home/sandbox/harness"
GIT_MAIN="/home/sandbox/.git-main"

if [ -f "$HARNESS/.git" ] && [ -d "$GIT_MAIN" ]; then
  WORKTREE_NAME=$(sed -n 's|.*worktrees/||p' "$HARNESS/.git")
  if [ -n "$WORKTREE_NAME" ] && [ -d "$GIT_MAIN/worktrees/$WORKTREE_NAME" ]; then
    echo "gitdir: $GIT_MAIN/worktrees/$WORKTREE_NAME" > "$HARNESS/.git"
    chown sandbox:sandbox "$HARNESS/.git"
    chown -R sandbox:sandbox "$GIT_MAIN" 2>/dev/null || true
    gosu sandbox git config --global --add safe.directory "$HARNESS"
    echo "[entrypoint] git worktree resolved → $GIT_MAIN/worktrees/$WORKTREE_NAME"
  fi
elif [ -d "$HARNESS/.git" ]; then
  # Regular repo (not a worktree) — just fix ownership
  chown -R sandbox:sandbox "$HARNESS/.git" 2>/dev/null || true
fi

# ─── Git identity + credential helper ───────────────────────────────
# Set git user from env vars (fallback to gh-authenticated user)
if [ -n "${GIT_USER_NAME:-}" ]; then
  gosu sandbox git config --global user.name "$GIT_USER_NAME"
elif gosu sandbox gh auth status &>/dev/null; then
  GH_USER=$(gosu sandbox gh api user --jq .name 2>/dev/null || true)
  [ -n "$GH_USER" ] && gosu sandbox git config --global user.name "$GH_USER"
fi
if [ -n "${GIT_USER_EMAIL:-}" ]; then
  gosu sandbox git config --global user.email "$GIT_USER_EMAIL"
elif gosu sandbox gh auth status &>/dev/null; then
  GH_EMAIL=$(gosu sandbox gh api user --jq .email 2>/dev/null || true)
  # GitHub may return null for private emails — use noreply fallback
  if [ -z "$GH_EMAIL" ] || [ "$GH_EMAIL" = "null" ]; then
    GH_LOGIN=$(gosu sandbox gh api user --jq .login 2>/dev/null || true)
    [ -n "$GH_LOGIN" ] && GH_EMAIL="${GH_LOGIN}@users.noreply.github.com"
  fi
  [ -n "$GH_EMAIL" ] && gosu sandbox git config --global user.email "$GH_EMAIL"
fi
# Register gh as git credential helper (persisted gh-config volume)
if gosu sandbox gh auth status &>/dev/null; then
  gosu sandbox gh auth setup-git 2>/dev/null || true
fi

# ─── SSH server setup (only when sshd overlay is active) ──────────
if echo "$@" | grep -q sshd; then
  # Set password for SSH login from env var
  echo "sandbox:${SANDBOX_PASSWORD:-changeme}" | chpasswd 2>/dev/null || true
  # Configure sshd for password + environment auth
  mkdir -p /run/sshd
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true
  sed -i 's/#PermitUserEnvironment no/PermitUserEnvironment yes/' /etc/ssh/sshd_config 2>/dev/null || true
  # Generate SSH host keys if missing
  if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    ssh-keygen -A
  fi
  # Generate SSH keypair if none exists
  if [ -d "/home/sandbox/.ssh" ] && [ ! -f "/home/sandbox/.ssh/id_ed25519" ]; then
    gosu sandbox ssh-keygen -t ed25519 -f /home/sandbox/.ssh/id_ed25519 -N "" -C "sandbox@$(hostname)" 2>/dev/null || true
  fi
fi

# Start heartbeat daemon (replaces cron-based scheduling)
DAEMON_SCRIPT="/home/sandbox/harness/packages/sandbox/dist/src/cli/heartbeat-daemon.js"
if [ -f "$DAEMON_SCRIPT" ]; then
  gosu sandbox node "$DAEMON_SCRIPT" start >> /home/sandbox/harness/workspace/heartbeats/heartbeat.log 2>&1 &
  echo "[entrypoint] heartbeat daemon started (pid $!)"
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
