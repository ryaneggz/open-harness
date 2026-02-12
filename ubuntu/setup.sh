#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

# ─── Mode detection ─────────────────────────────────────────────────
# --non-interactive : skip password prompt (used inside Dockerfile builds)
#                     user 'clawdius' is always created
NON_INTERACTIVE=false
for arg in "$@"; do
  [[ "$arg" == "--non-interactive" ]] && NON_INTERACTIVE=true
done

# ─── Root check ──────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "This script must be run as root (or via sudo)."

# ─── Collect all options upfront ─────────────────────────────────────
CLAWDIUS_PW="clawdius"
INSTALL_BROWSER=true
INSTALL_OPENCLAW=true
SSH_PUBKEY=""
GH_TOKEN=""
GIT_USER_NAME=""
GIT_USER_EMAIL=""

if [[ "$NON_INTERACTIVE" == false ]]; then
  banner "Configuration"

  # 1) Password
  printf "  Password for 'clawdius' user (default: clawdius)\n"
  while true; do
    read -rsp "  Enter password [clawdius]: " input_pw; echo
    [[ -z "$input_pw" ]] && break
    read -rsp "  Confirm password: " input_pw2; echo
    if [[ "$input_pw" == "$input_pw2" ]]; then
      CLAWDIUS_PW="$input_pw"
      break
    fi
    printf "${RED}  Passwords do not match. Try again.${NC}\n"
  done

  # 2) SSH public key
  printf "\n  SSH public key for clawdius authorized_keys (blank to skip)\n"
  read -rp "  Paste public key: " SSH_PUBKEY

  # 3) Git identity
  printf "\n  Git global config for clawdius (blank to skip)\n"
  read -rp "  user.name: " GIT_USER_NAME
  read -rp "  user.email: " GIT_USER_EMAIL

  # 4) GitHub CLI token
  printf "\n  GitHub personal access token for 'gh auth' (blank to skip)\n"
  read -rsp "  Token: " GH_TOKEN; echo

  # 5) OpenClaw
  printf "\n  Install OpenClaw CLI? (https://docs.openclaw.ai/start/getting-started)\n"
  read -rp "  Install OpenClaw? [Y/n]: " answer
  [[ "$answer" =~ ^[Nn]$ ]] && INSTALL_OPENCLAW=false

  # 6) agent-browser
  read -rp "  Install agent-browser + Chromium? [Y/n]: " answer
  [[ "$answer" =~ ^[Nn]$ ]] && INSTALL_BROWSER=false

  printf "\n${GREEN}  All set — installing now (no more prompts).${NC}\n"
fi

# ─── 1. System packages ─────────────────────────────────────────────
banner "Installing base system packages"
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  git \
  jq \
  sudo \
  gnupg \
  lsb-release \
  unzip
ok "Base packages installed"

# ─── 2. Node.js 22.x ────────────────────────────────────────────────
banner "Installing Node.js 22.x"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y --no-install-recommends nodejs
ok "Node.js $(node --version) installed"

# ─── 3. Bun ─────────────────────────────────────────────────────────
banner "Installing Bun"
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="/root/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
ok "Bun $(bun --version) installed"

# ─── 4. uv (Python package manager) ─────────────────────────────────
banner "Installing uv"
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="/root/.local/bin:$PATH"
ok "uv $(uv --version) installed"

# ─── 5. GitHub CLI ──────────────────────────────────────────────────
banner "Installing GitHub CLI"
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  > /etc/apt/sources.list.d/github-cli.list
apt-get update
apt-get install -y --no-install-recommends gh
ok "GitHub CLI $(gh --version | head -1) installed"

# ─── 6. agent-browser + Chromium (optional) ──────────────────────────
if [[ "$INSTALL_BROWSER" == true ]]; then
  banner "Installing agent-browser and Chromium"
  npm install -g agent-browser
  agent-browser install --with-deps
  ok "agent-browser + Chromium installed"
else
  banner "Skipping agent-browser"
  ok "Skipped"
fi

# ─── 7. Create clawdius user ──────────────────────────────────────────
banner "Creating user 'clawdius'"
if id "clawdius" &>/dev/null; then
  printf "  User 'clawdius' already exists — updating groups.\n"
else
  useradd -m -s /bin/bash clawdius
fi
echo "clawdius:${CLAWDIUS_PW}" | chpasswd
usermod -aG sudo clawdius
ok "User 'clawdius' configured (sudo)"

# ─── 8. Git global config (optional) ─────────────────────────────────
if [[ -n "$GIT_USER_NAME" ]]; then
  su - clawdius -c "git config --global user.name '${GIT_USER_NAME}'"
fi
if [[ -n "$GIT_USER_EMAIL" ]]; then
  su - clawdius -c "git config --global user.email '${GIT_USER_EMAIL}'"
fi
if [[ -n "$GIT_USER_NAME" || -n "$GIT_USER_EMAIL" ]]; then
  ok "Git config set for clawdius"
fi

# ─── 9. SSH authorized key (optional) ────────────────────────────────
if [[ -n "$SSH_PUBKEY" ]]; then
  banner "Configuring SSH authorized key for clawdius"
  SSHDIR="/home/clawdius/.ssh"
  mkdir -p "$SSHDIR"
  echo "$SSH_PUBKEY" >> "$SSHDIR/authorized_keys"
  chmod 700 "$SSHDIR"
  chmod 600 "$SSHDIR/authorized_keys"
  chown -R clawdius:clawdius "$SSHDIR"
  ok "SSH public key added"
fi

# ─── 10. OpenClaw (optional) ──────────────────────────────────────────
if [[ "$INSTALL_OPENCLAW" == true ]]; then
  banner "Installing OpenClaw CLI"
  su - clawdius -c "curl -fsSL https://openclaw.ai/install.sh | bash"
  ok "OpenClaw CLI installed"
  printf "  Run 'openclaw onboard --install-daemon' as clawdius to complete setup.\n"
else
  banner "Skipping OpenClaw"
  ok "Skipped"
fi

# ─── 11. GitHub CLI auth (optional) ──────────────────────────────────
if [[ -n "$GH_TOKEN" ]]; then
  banner "Authenticating GitHub CLI for clawdius"
  echo "$GH_TOKEN" | su - clawdius -c "gh auth login --with-token"
  ok "gh auth configured"
fi

# ─── 12. Cleanup ─────────────────────────────────────────────────────
banner "Cleaning up APT cache"
rm -rf /var/lib/apt/lists/*
ok "Done"

# ─── Summary ─────────────────────────────────────────────────────────
banner "Setup complete"
printf "\n"
printf "  ${CYAN}Installed tools${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  Node.js  : %s\n" "$(node --version)"
printf "  npm      : %s\n" "$(npm --version)"
printf "  Bun      : %s\n" "$(bun --version)"
printf "  uv       : %s\n" "$(uv --version)"
printf "  gh       : %s\n" "$(gh --version | head -1)"
if [[ "$INSTALL_BROWSER" == true ]]; then
  printf "  browser  : agent-browser + Chromium\n"
fi
if [[ "$INSTALL_OPENCLAW" == true ]]; then
  printf "  openclaw : installed\n"
fi
printf "\n"
printf "  ${CYAN}User${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  username : clawdius\n"
printf "  groups   : sudo\n"
printf "  home     : /home/clawdius\n"
printf "\n"
printf "  ${CYAN}Quick test commands${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  su - clawdius\n"
printf "  node -e \"console.log('hello from node')\"\n"
printf "  bun --version\n"
printf "  uv python install 3.12 && uv run python -c \"print('hello from python')\"\n"
printf "  gh auth status\n"
if [[ "$INSTALL_BROWSER" == true ]]; then
  printf "  agent-browser --help\n"
fi
printf "\n"

if [[ "$INSTALL_OPENCLAW" == true ]]; then
  printf "  ${CYAN}OpenClaw — next steps${NC}\n"
  printf "  ──────────────────────────────────────\n"
  printf "  Complete onboarding (run as clawdius):\n"
  printf "\n"
  printf "    su - clawdius\n"
  printf "    openclaw onboard --install-daemon\n"
  printf "\n"
  printf "  Verify the gateway is running:\n"
  printf "\n"
  printf "    openclaw gateway status\n"
  printf "\n"
  printf "  Launch the web dashboard:\n"
  printf "\n"
  printf "    openclaw dashboard\n"
  printf "\n"
  printf "  Docs: https://docs.openclaw.ai/start/getting-started\n"
  printf "\n"
fi
