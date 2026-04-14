#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; YELLOW='\033[0;33m'; NC='\033[0m'
B='\033[1m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "  ${GREEN}✓${NC} %s\n" "$*"; }
skip()   { printf "  ${YELLOW}⊘${NC} %s\n" "$*"; }
warn()   { printf "  ${YELLOW}!${NC} %s\n" "$*"; }
fail()   { printf "  ${RED}✗${NC} %s\n" "$*"; }
ask()    { printf "\n  ${B}%s${NC} " "$*"; }

# ─── Config ─────────────────────────────────────────────────────────
ONBOARD_MARKER="$HOME/.claude/.onboarded"
FORCE=false
[[ "${1:-}" == "--force" ]] && FORCE=true

APP_DIR="$HOME/harness/workspace/projects/next-app"

# ─── Already onboarded? ─────────────────────────────────────────────
if [ -f "$ONBOARD_MARKER" ] && [ "$FORCE" = false ]; then
  banner "Already onboarded"
  printf "  Completed: %s\n" "$(jq -r '.completedAt // "unknown"' "$ONBOARD_MARKER" 2>/dev/null || echo 'unknown')"
  printf "\n  Run with ${B}--force${NC} to re-verify all steps.\n\n"
  exit 0
fi

# ─── Welcome ────────────────────────────────────────────────────────
printf "\n"
printf "  ${B}${CYAN}Open Harness — First-Time Setup${NC}\n"
printf "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
printf "\n"
printf "  This wizard walks you through one-time authentication\n"
printf "  for all services used by this sandbox.\n"
printf "\n"

# Track step results
declare -A STEPS

# ═══════════════════════════════════════════════════════════════════════
# Step 1: LLM Provider — must be first, everything else depends on it
# ═══════════════════════════════════════════════════════════════════════
banner "Step 1/6 — LLM Provider (OpenAI)"

printf "  This sandbox uses ${B}openharness${NC} (Pi agent) for AI tasks.\n"
printf "  You need to authenticate with an LLM provider first.\n\n"

PI_AUTH="$HOME/.pi/agent/auth.json"
if [ -s "$PI_AUTH" ] && [ "$(cat "$PI_AUTH" 2>/dev/null)" != "{}" ]; then
  PROVIDER=$(python3 -c "import json; print(list(json.load(open('$PI_AUTH')).keys())[0])" 2>/dev/null || echo "unknown")
  ok "Already authenticated (provider: $PROVIDER)"
  STEPS[llm]="done"
elif [ -n "${OPENAI_API_KEY:-}" ]; then
  ok "OPENAI_API_KEY set via environment"
  STEPS[llm]="done"
else
  printf "  ${B}Inside the sandbox, run:${NC}\n\n"
  printf "    ${CYAN}openharness${NC}          # launches the agent CLI\n"
  printf "    ${CYAN}/login${NC}               # authenticate with OpenAI\n"
  printf "    ${CYAN}/model${NC}               # select ${B}gpt-5.4${NC}\n"
  printf "    ${CYAN}Ctrl+C${NC}               # exit back to onboarding\n"
  printf "\n"
  ask "Authenticate now? [Y/n]:"
  read -r llm_answer
  if [[ ! "$llm_answer" =~ ^[Nn]$ ]]; then
    printf "\n  Launching openharness — run ${B}/login${NC} then ${B}/model${NC} to set up.\n"
    printf "  Press ${B}Ctrl+C${NC} when done to continue onboarding.\n\n"
    openharness 2>/dev/null || true
    if [ -s "$PI_AUTH" ] && [ "$(cat "$PI_AUTH" 2>/dev/null)" != "{}" ]; then
      ok "LLM provider authenticated"
      mkdir -p "$HOME/.pi/slack"
      ln -sf "$PI_AUTH" "$HOME/.pi/slack/auth.json"
      ok "Auth shared with Mom (Slack bot)"
      STEPS[llm]="done"
    else
      warn "Auth not detected — run 'openharness' and '/login' later"
      STEPS[llm]="skipped"
    fi
  else
    skip "Skipped — run 'openharness' then '/login' later"
    STEPS[llm]="skipped"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Step 2: Slack (Mom Bot) — early so we can validate before continuing
# ═══════════════════════════════════════════════════════════════════════
banner "Step 2/6 — Slack (Mom Bot)"

SLACK_APP_TOKEN="${SLACK_APP_TOKEN:-}"
SLACK_BOT_TOKEN="${SLACK_BOT_TOKEN:-}"

if [ -n "$SLACK_APP_TOKEN" ] && [ -n "$SLACK_BOT_TOKEN" ]; then
  ok "Slack tokens detected from environment"
else
  ask "Set up Slack bot (Mom)? [y/N]:"
  read -r slack_answer
  if [[ "$slack_answer" =~ ^[Yy]$ ]]; then
    printf "\n  ${B}Create a Slack app:${NC}\n"
    printf "    1. Go to ${CYAN}https://api.slack.com/apps${NC}\n"
    printf "    2. Click ${B}Create New App${NC} → ${B}From a manifest${NC}\n"
    printf "    3. Select your workspace, then paste this manifest:\n"
    printf "\n       ${CYAN}~/install/slack-manifest.json${NC}\n"
    printf "\n       (or copy from: ${CYAN}https://github.com/ryaneggz/open-harness/blob/main/install/slack-manifest.json${NC})\n"
    printf "\n    4. Click ${B}Create${NC}, then:\n"
    printf "       - ${B}Basic Information${NC} → ${B}App-Level Tokens${NC} → Generate (scope: ${CYAN}connections:write${NC})\n"
    printf "         This is your ${B}App Token${NC} (starts with ${CYAN}xapp-${NC})\n"
    printf "       - ${B}OAuth & Permissions${NC} → ${B}Install to Workspace${NC}\n"
    printf "         This is your ${B}Bot Token${NC} (starts with ${CYAN}xoxb-${NC})\n"
    printf "\n"

    ask "App Token (xapp-...):"
    read -r SLACK_APP_TOKEN
    ask "Bot Token (xoxb-...):"
    read -r SLACK_BOT_TOKEN

    if [ -n "$SLACK_APP_TOKEN" ] && [ -n "$SLACK_BOT_TOKEN" ]; then
      export SLACK_APP_TOKEN="$SLACK_APP_TOKEN"
      export SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN"
      ok "Tokens set for this session"

      # Persist to host .env if writable
      HOST_ENV="$HOME/harness/.env"
      if [ -w "$HOME/harness" ]; then
        if [ -f "$HOST_ENV" ]; then
          sed -i '/^SLACK_APP_TOKEN=/d' "$HOST_ENV"
          sed -i '/^SLACK_BOT_TOKEN=/d' "$HOST_ENV"
        fi
        echo "SLACK_APP_TOKEN=$SLACK_APP_TOKEN" >> "$HOST_ENV"
        echo "SLACK_BOT_TOKEN=$SLACK_BOT_TOKEN" >> "$HOST_ENV"
        ok "Tokens saved to .env (persist across rebuilds)"
      else
        warn "Cannot write to $HOST_ENV — tokens valid for this session only"
        printf "    Add manually to .env on the host:\n"
        printf "      SLACK_APP_TOKEN=%s\n" "$SLACK_APP_TOKEN"
        printf "      SLACK_BOT_TOKEN=%s\n" "$SLACK_BOT_TOKEN"
      fi
    else
      warn "Tokens not provided"
      SLACK_APP_TOKEN=""
      SLACK_BOT_TOKEN=""
    fi
  else
    skip "Skipped — run 'openharness onboard --force' later to set up"
    STEPS[slack]="skipped"
  fi
fi

# Bootstrap .openharness/agent directory (symlink from legacy .pi paths)
OHARNESS_AGENT="$HOME/.openharness/agent"
sudo chown -R sandbox:sandbox "$HOME/.openharness" 2>/dev/null || true
mkdir -p "$OHARNESS_AGENT"
[ ! -e "$OHARNESS_AGENT/settings.json" ] && [ -s "$HOME/.pi/agent/settings.json" ] && \
  ln -sf "$HOME/.pi/agent/settings.json" "$OHARNESS_AGENT/settings.json"
[ ! -e "$OHARNESS_AGENT/auth.json" ] && [ -s "$HOME/.pi/agent/auth.json" ] && \
  ln -sf "$HOME/.pi/agent/auth.json" "$OHARNESS_AGENT/auth.json"

# Start Mom and validate if tokens are available
if [ -n "$SLACK_APP_TOKEN" ] && [ -n "$SLACK_BOT_TOKEN" ]; then
  if command -v mom &>/dev/null; then
    # Ensure LLM auth exists for Mom
    SLACKDIR="$HOME/.pi/slack"
    if [ ! -s "$SLACKDIR/auth.json" ] && [ -z "${OPENAI_API_KEY:-}" ]; then
      if [ -s "$HOME/.pi/agent/auth.json" ]; then
        mkdir -p "$SLACKDIR"
        ln -sf "$HOME/.pi/agent/auth.json" "$SLACKDIR/auth.json"
        ok "Linked Mom auth to Pi agent (shared key store)"
      else
        warn "Mom needs LLM auth to respond. Complete Step 1 first."
      fi
    fi

    # Check if Mom is already running and connected (started by entrypoint)
    MOM_ALREADY_RUNNING=false
    if tmux has-session -t slack 2>/dev/null; then
      EXISTING_OUTPUT=$(tmux capture-pane -t slack -p 2>/dev/null || true)
      if echo "$EXISTING_OUTPUT" | grep -q "connected and listening"; then
        MOM_ALREADY_RUNNING=true
      fi
    fi

    if [ "$MOM_ALREADY_RUNNING" = true ]; then
      ok "Mom already running and connected (started by entrypoint)"
      STEPS[slack]="done"
    else
      # Not running or not connected — (re)start
      tmux kill-session -t slack 2>/dev/null || true
      SLACK_APP_TOKEN="$SLACK_APP_TOKEN" SLACK_BOT_TOKEN="$SLACK_BOT_TOKEN" \
        tmux new-session -d -s slack 'mom --sandbox=host ~/harness/workspace/.slack'

      # Validate: wait for Mom to connect or fail
      printf "\n  Validating Slack connection"
      MOM_OK=false
      for i in $(seq 1 15); do
        printf "."
        OUTPUT=$(tmux capture-pane -t slack -p 2>/dev/null || true)
        if echo "$OUTPUT" | grep -q "connected and listening"; then
          MOM_OK=true
          break
        fi
        if echo "$OUTPUT" | grep -q "Run error\|Error\|Missing env"; then
          break
        fi
        sleep 1
      done
      printf "\n"

      if [ "$MOM_OK" = true ]; then
        ok "Mom connected to Slack"
        STEPS[slack]="done"
      else
        fail "Mom failed to connect — check logs: tmux attach -t slack"
        tmux capture-pane -t slack -p 2>/dev/null | grep -i "error\|missing\|failed" | head -3 | while IFS= read -r line; do
          printf "    ${RED}%s${NC}\n" "$line"
        done
        STEPS[slack]="failed"
      fi
    fi
  else
    fail "mom CLI not found — reinstall with: pnpm add -g @mariozechner/pi-mom"
    STEPS[slack]="failed"
  fi
elif [ "${STEPS[slack]:-}" != "skipped" ]; then
  STEPS[slack]="skipped"
fi

# ═══════════════════════════════════════════════════════════════════════
# Step 3: SSH Key
# ═══════════════════════════════════════════════════════════════════════
banner "Step 3/6 — SSH Key"

if [ -f "$HOME/.ssh/id_ed25519.pub" ]; then
  PUBKEY=$(cat "$HOME/.ssh/id_ed25519.pub")
  ok "SSH key exists"
  printf "\n  Public key:\n    ${CYAN}%s${NC}\n" "$PUBKEY"

  if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
    ok "GitHub SSH access verified"
    STEPS[ssh]="done"
  else
    warn "SSH key exists but GitHub access not verified"
    printf "\n  Add this key to GitHub → Settings → SSH and GPG keys\n"
    printf "  Then press Enter to continue...\n"
    read -r
    if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
      ok "GitHub SSH access verified"
      STEPS[ssh]="done"
    else
      warn "Could not verify GitHub SSH access — continuing anyway"
      STEPS[ssh]="unverified"
    fi
  fi
else
  warn "No SSH key found — generating one"
  ssh-keygen -t ed25519 -f "$HOME/.ssh/id_ed25519" -N "" -C "sandbox@$(hostname)"
  PUBKEY=$(cat "$HOME/.ssh/id_ed25519.pub")
  printf "\n  Public key:\n    ${CYAN}%s${NC}\n" "$PUBKEY"
  printf "\n  Add this key to GitHub → Settings → SSH and GPG keys\n"
  printf "  Then press Enter to continue...\n"
  read -r
  STEPS[ssh]="done"
fi

# ═══════════════════════════════════════════════════════════════════════
# Step 4: GitHub CLI
# ═══════════════════════════════════════════════════════════════════════
banner "Step 4/6 — GitHub CLI"

if gh auth status &>/dev/null; then
  ok "GitHub CLI already authenticated"
  STEPS[github]="done"
else
  printf "  Running: ${CYAN}gh auth login${NC}\n\n"
  if gh auth login; then
    ok "GitHub CLI authenticated"
    STEPS[github]="done"
  else
    fail "GitHub CLI authentication failed"
    STEPS[github]="failed"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Step 5: Cloudflare Tunnel
# ═══════════════════════════════════════════════════════════════════════
banner "Step 5/6 — Cloudflare Tunnel"

if ! command -v cloudflared &>/dev/null; then
  skip "cloudflared not installed — skipping"
  STEPS[cloudflare]="skipped"
else
  CFLARED_DIR="$HOME/.cloudflared"
  TUNNEL_CONFIG=$(ls "$CFLARED_DIR"/config-*.yml 2>/dev/null | head -1 || true)

  if [ -n "$TUNNEL_CONFIG" ] && [ "$FORCE" = false ]; then
    TUNNEL_NAME=$(basename "$TUNNEL_CONFIG" | sed 's/^config-//;s/\.yml$//')
    ok "Tunnel '$TUNNEL_NAME' already configured"
    STEPS[cloudflare]="done"
  else
    if [ ! -f "$CFLARED_DIR/cert.pem" ]; then
      ask "Set up Cloudflare tunnel now? [y/N]:"
      read -r cf_answer
      if [[ "$cf_answer" =~ ^[Yy]$ ]]; then
        printf "\n  Running: ${CYAN}cloudflared login${NC}\n"
        printf "  (Copy the URL below and open it in a browser)\n\n"
        cloudflared login
      else
        skip "Skipped — to set up later, run:"
        printf "      cloudflared login\n"
        printf "      bash ~/install/cloudflared-tunnel.sh <name> <hostname> 3000\n"
        STEPS[cloudflare]="skipped"
      fi
    fi

    if [ -f "$CFLARED_DIR/cert.pem" ]; then
      ok "Cloudflare authenticated"

      ask "Tunnel name (default: open-harness):"
      read -r TUNNEL_NAME
      TUNNEL_NAME="${TUNNEL_NAME:-open-harness}"

      ask "Public hostname (default: ${TUNNEL_NAME}.ruska.dev):"
      read -r TUNNEL_HOST
      TUNNEL_HOST="${TUNNEL_HOST:-${TUNNEL_NAME}.ruska.dev}"

      ask "Local port (default: 3000):"
      read -r TUNNEL_PORT
      TUNNEL_PORT="${TUNNEL_PORT:-3000}"

      printf "\n"
      bash "$HOME/install/cloudflared-tunnel.sh" "$TUNNEL_NAME" "$TUNNEL_HOST" "$TUNNEL_PORT"
      STEPS[cloudflare]="done"
    elif [ "${STEPS[cloudflare]:-}" != "skipped" ]; then
      fail "Cloudflare login failed"
      STEPS[cloudflare]="failed"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Step 6: Claude Code
# ═══════════════════════════════════════════════════════════════════════
banner "Step 6/6 — Claude Code"

if [ -f "$HOME/.claude/.credentials.json" ] || [ -f "$HOME/.claude/credentials.json" ]; then
  ok "Claude Code already authenticated"
  STEPS[claude]="done"
else
  printf "  Claude Code requires authentication on first run.\n"
  printf "  This will open a browser for Anthropic OAuth.\n\n"
  ask "Authenticate now? [Y/n]:"
  read -r answer
  if [[ ! "$answer" =~ ^[Nn]$ ]]; then
    printf "\n  Running: ${CYAN}claude --version${NC} (triggers auth check)\n\n"
    claude --version 2>/dev/null && ok "Claude Code ready" || warn "Run 'claude' manually to complete auth"
    STEPS[claude]="done"
  else
    skip "Skipped — run 'claude' later to authenticate"
    STEPS[claude]="skipped"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════
# Start Application
# ═══════════════════════════════════════════════════════════════════════
banner "Starting Application"

printf "  Installing dependencies and starting dev server...\n\n"
cd "$APP_DIR"
pnpm install 2>&1 | tail -5

# Start dev server
pnpm dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid

# Start cloudflared tunnel if configured
TUNNEL_CONFIG=$(ls "$HOME/.cloudflared"/config-*.yml 2>/dev/null | head -1 || true)
if [ -n "$TUNNEL_CONFIG" ]; then
  TUNNEL_NAME=$(basename "$TUNNEL_CONFIG" | sed 's/^config-//;s/\.yml$//')
  cloudflared tunnel --config "$TUNNEL_CONFIG" run "$TUNNEL_NAME" > /tmp/cloudflared.log 2>&1 &
  echo $! > /tmp/cloudflared.pid
fi

# Wait for dev server
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    ok "Next.js dev server ready on port 3000"
    break
  fi
  [ "$i" -eq 30 ] && warn "Dev server not responding after 30s (check /tmp/next-dev.log)"
  sleep 1
done

# ─── Write Marker ───────────────────────────────────────────────────
mkdir -p "$(dirname "$ONBOARD_MARKER")"
cat > "$ONBOARD_MARKER" <<EOF
{
  "version": 1,
  "completedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "steps": {
    "llm": { "status": "${STEPS[llm]:-unknown}" },
    "slack": { "status": "${STEPS[slack]:-unknown}" },
    "ssh": { "status": "${STEPS[ssh]:-unknown}" },
    "github": { "status": "${STEPS[github]:-unknown}" },
    "cloudflare": { "status": "${STEPS[cloudflare]:-unknown}" },
    "claude": { "status": "${STEPS[claude]:-unknown}" }
  }
}
EOF

# ─── Summary ────────────────────────────────────────────────────────
banner "Onboarding Complete"
printf "\n"
printf "  ${GREEN}LLM${NC}:        %s\n" "${STEPS[llm]:-unknown}"
printf "  ${GREEN}Slack${NC}:      %s\n" "${STEPS[slack]:-unknown}"
printf "  ${GREEN}SSH${NC}:        %s\n" "${STEPS[ssh]:-unknown}"
printf "  ${GREEN}GitHub${NC}:     %s\n" "${STEPS[github]:-unknown}"
printf "  ${GREEN}Cloudflare${NC}: %s\n" "${STEPS[cloudflare]:-unknown}"
printf "  ${GREEN}Claude${NC}:     %s\n" "${STEPS[claude]:-unknown}"
printf "\n"
printf "  The dev server is now running. On future restarts,\n"
printf "  the application will start automatically.\n"
printf "\n"
printf "  ${CYAN}Verify${NC}: pnpm run test:setup\n"
printf "  ${CYAN}Re-run${NC}: openharness onboard --force\n"
printf "\n"
