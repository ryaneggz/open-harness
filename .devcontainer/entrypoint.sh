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

# ─── Host UID reconciliation ────────────────────────────────────────
# The repo is bind-mounted at /home/sandbox/harness with its host UID/GID.
# If the host user's UID differs from the container sandbox user (1000),
# pnpm / git operations would fail with EACCES. Add sandbox to the host
# owning group so it can write via group permissions (repo is mode 775).
HARNESS_DIR="/home/sandbox/harness"
if [ -d "$HARNESS_DIR" ]; then
  HOST_UID=$(stat -c '%u' "$HARNESS_DIR")
  HOST_GID=$(stat -c '%g' "$HARNESS_DIR")
  SANDBOX_UID=$(id -u sandbox)
  if [ "$HOST_UID" != "$SANDBOX_UID" ]; then
    if ! getent group "$HOST_GID" >/dev/null 2>&1; then
      groupadd -g "$HOST_GID" hostuser 2>/dev/null || true
    fi
    HOST_GROUP=$(getent group "$HOST_GID" | cut -d: -f1)
    if [ -n "$HOST_GROUP" ] && ! id -nG sandbox | tr ' ' '\n' | grep -qx "$HOST_GROUP"; then
      usermod -aG "$HOST_GROUP" sandbox
      echo "[entrypoint] sandbox added to host group $HOST_GROUP (gid=$HOST_GID) for bind-mount write access"
    fi
  fi
fi

# ─── Attach banner wiring (idempotent) ──────────────────────────────
# Source install/banner.sh from the sandbox user's .bashrc so every
# interactive shell (docker exec, SSH via sshd overlay, VS Code) shows
# sandbox + onboarding status. Safe to run on every boot.
BASHRC="/home/sandbox/.bashrc"
if [ -f "$BASHRC" ] && ! grep -q 'source.*install/banner.sh' "$BASHRC"; then
  gosu sandbox bash -c 'echo "source /home/sandbox/harness/install/banner.sh 2>/dev/null" >> ~/.bashrc'
  echo "[entrypoint] attach banner wired into .bashrc"
fi

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

# ─── GitHub CLI auth via PAT (optional) ─────────────────────────────
if [ -n "${GH_TOKEN:-}" ] && ! gosu sandbox gh auth status &>/dev/null; then
  echo "$GH_TOKEN" | gosu sandbox gh auth login --with-token 2>/dev/null \
    && echo "[entrypoint] GitHub CLI authenticated via GH_TOKEN" \
    || echo "[entrypoint] GH_TOKEN provided but gh auth login failed"
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

# Build and link openharness CLI (from bind-mounted repo)
# Runs on every boot: install deps + build only if dist is missing or stale,
# always re-symlink so container recreation (fresh /usr/local/bin/) re-establishes PATH entries.
CLI_TARGET="$HARNESS/packages/sandbox/dist/src/cli/index.js"
HB_TARGET="$HARNESS/packages/sandbox/dist/src/cli/heartbeat-daemon.js"

if [ -f "$HARNESS/packages/sandbox/package.json" ]; then
  if [ ! -f "$CLI_TARGET" ] || [ "$HARNESS/packages/sandbox/package.json" -nt "$CLI_TARGET" ]; then
    echo "[entrypoint] building openharness CLI..."
    (
      cd "$HARNESS"
      gosu sandbox pnpm install --frozen-lockfile \
        || gosu sandbox pnpm install \
        || echo "[entrypoint] WARN: pnpm install failed"
      gosu sandbox pnpm --filter @openharness/sandbox run build \
        || echo "[entrypoint] WARN: pnpm build failed"
    )
  fi

  if [ -f "$CLI_TARGET" ]; then
    ln -sf "$CLI_TARGET" /usr/local/bin/openharness
    ln -sf "$HB_TARGET" /usr/local/bin/heartbeat-daemon
    chmod +x /usr/local/bin/openharness /usr/local/bin/heartbeat-daemon
    echo "[entrypoint] openharness CLI + heartbeat-daemon installed"
  else
    echo "[entrypoint] ERROR: $CLI_TARGET not found after build — CLI not installed"
  fi
fi

# ─── Start heartbeat daemon (with watchdog) ──────────────────────
WORKSPACE="/home/sandbox/harness/workspace"
DAEMON_SCRIPT="/home/sandbox/harness/packages/sandbox/dist/src/cli/heartbeat-daemon.js"
HB_LOG="$WORKSPACE/heartbeats/heartbeat.log"
mkdir -p "$WORKSPACE/heartbeats"
# Ensure heartbeat.log is sandbox-writable (entrypoint's tee runs as root and
# would otherwise create it root-owned, making the daemon crash-loop on EACCES).
touch "$HB_LOG" 2>/dev/null || true
chown sandbox:sandbox "$HB_LOG" 2>/dev/null || true
if command -v heartbeat-daemon &>/dev/null; then
  (
    while true; do
      gosu sandbox heartbeat-daemon start 2>&1 | tee -a "$HB_LOG"
      EXIT_CODE=$?
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] heartbeat-daemon exited ($EXIT_CODE), restarting in 5s..." >> "$HB_LOG"
      sleep 5
    done
  ) &
  echo "[entrypoint] heartbeat daemon started with watchdog (pid $!)"
elif [ -f "$DAEMON_SCRIPT" ]; then
  (
    while true; do
      gosu sandbox node "$DAEMON_SCRIPT" start 2>&1 | tee -a "$HB_LOG"
      EXIT_CODE=$?
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] heartbeat-daemon exited ($EXIT_CODE), restarting in 5s..." >> "$HB_LOG"
      sleep 5
    done
  ) &
  echo "[entrypoint] heartbeat daemon started with watchdog via fallback (pid $!)"
fi

# ─── Optional: agent-browser (opt-in via INSTALL_AGENT_BROWSER=true) ──
if [ "${INSTALL_AGENT_BROWSER:-false}" = "true" ] && ! command -v agent-browser &>/dev/null; then
  echo "[entrypoint] Installing agent-browser (INSTALL_AGENT_BROWSER=true)..."
  pnpm add -g agent-browser@0.8.5 \
    && find "$PNPM_HOME" -name "agent-browser-linux-*" -exec chmod +x {} \; \
    && agent-browser install --with-deps 2>&1 | tail -5 \
    && echo "[entrypoint] agent-browser installed" \
    || echo "[entrypoint] agent-browser install failed — skipping"
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
