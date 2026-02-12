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

# ─── Prompt for clawdius password ────────────────────────────────────
CLAWDIUS_PW="clawdius"
if [[ "$NON_INTERACTIVE" == false ]]; then
  banner "Set password for the 'clawdius' user (default: clawdius)"
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
fi

# ─── 1. System packages ─────────────────────────────────────────────
banner "Installing base system packages"
apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  jq \
  sudo \
  gnupg \
  lsb-release
ok "Base packages installed"

# ─── 2. Node.js 22.x ────────────────────────────────────────────────
banner "Installing Node.js 22.x"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y --no-install-recommends nodejs
ok "Node.js $(node --version) installed"

# ─── 3. GitHub CLI ───────────────────────────────────────────────────
banner "Installing GitHub CLI"
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  > /etc/apt/sources.list.d/github-cli.list
apt-get update
apt-get install -y --no-install-recommends gh
ok "GitHub CLI $(gh --version | head -1) installed"

# ─── 4. agent-browser + Chromium ─────────────────────────────────────
banner "Installing agent-browser and Chromium"
npm install -g agent-browser
agent-browser install --with-deps
ok "agent-browser + Chromium installed"

# ─── 5. Create clawdius user ──────────────────────────────────────────
banner "Creating user 'clawdius'"
if id "clawdius" &>/dev/null; then
  printf "  User 'clawdius' already exists — updating groups.\n"
else
  useradd -m -s /bin/bash clawdius
fi
echo "clawdius:${CLAWDIUS_PW}" | chpasswd
usermod -aG sudo clawdius
ok "User 'clawdius' configured (sudo)"

# ─── 6. Cleanup ──────────────────────────────────────────────────────
banner "Cleaning up APT cache"
rm -rf /var/lib/apt/lists/*
ok "Done"

# ─── Summary ─────────────────────────────────────────────────────────
banner "Setup complete"
printf "  Node.js : %s\n" "$(node --version)"
printf "  npm     : %s\n" "$(npm --version)"
printf "  gh      : %s\n" "$(gh --version | head -1)"
printf "  User    : clawdius (groups: sudo)\n"
if [[ "$NON_INTERACTIVE" == false ]]; then
  printf "\n  Log in as clawdius:  su - clawdius\n\n"
fi
