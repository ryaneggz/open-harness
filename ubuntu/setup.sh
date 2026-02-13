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
  ripgrep \
  unzip
ok "Base packages installed"

# ─── 2. Node.js 22.x ────────────────────────────────────────────────
banner "Installing Node.js 22.x"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y --no-install-recommends nodejs
ok "Node.js $(node --version) installed"

# ─── 3. GitHub CLI ──────────────────────────────────────────────────
banner "Installing GitHub CLI"
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  -o /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  > /etc/apt/sources.list.d/github-cli.list
apt-get update
apt-get install -y --no-install-recommends gh
ok "GitHub CLI $(gh --version | head -1) installed"

# ─── 4. Create clawdius user ──────────────────────────────────────────
banner "Creating user 'clawdius'"
if id "clawdius" &>/dev/null; then
  printf "  User 'clawdius' already exists — updating groups.\n"
else
  useradd -m -s /bin/bash clawdius
fi
echo "clawdius:${CLAWDIUS_PW}" | chpasswd
usermod -aG sudo clawdius
usermod -aG sudo clawdius

# Configure npm global bin for clawdius
su - clawdius -c "mkdir -p /home/clawdius/.npm-global"
su - clawdius -c "npm config set prefix /home/clawdius/.npm-global"
BASHRC="/home/clawdius/.bashrc"
if ! grep -q '.npm-global/bin' "$BASHRC" 2>/dev/null; then
  echo 'export PATH="/home/clawdius/.npm-global/bin:$PATH"' >> "$BASHRC"
  chown clawdius:clawdius "$BASHRC"
fi
ok "User 'clawdius' configured (sudo, npm path)"

# ─── 5. Bun ──────────────────────────────────────────────────────────
banner "Installing Bun"
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="/root/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
ok "Bun $(bun --version) installed"

# ─── 6. uv (Python package manager) ──────────────────────────────────
banner "Installing uv"
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="/root/.local/bin:$PATH"
ok "uv $(uv --version) installed"

# ─── 7. agent-browser + Chromium (optional) ──────────────────────────
if [[ "$INSTALL_BROWSER" == true ]]; then
  banner "Installing agent-browser and Chromium"
  npm install -g agent-browser
  agent-browser install --with-deps
  ok "agent-browser + Chromium installed"
else
  banner "Skipping agent-browser"
  ok "Skipped"
fi

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
  # Install openclaw directly via npm to avoid the installer pulling in nvm
  su - clawdius -c "export PATH=/home/clawdius/.npm-global/bin:\$PATH && npm install -g openclaw"
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

# ─── 12. Generate uninstall script ────────────────────────────────────
banner "Generating uninstall script"
UNINSTALL="/home/clawdius/uninstall.sh"
cat > "$UNINSTALL" <<'UNINSTALL_EOF'
#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

if [[ $EUID -ne 0 ]]; then
  printf "\n${RED}  This script must be run with sudo.${NC}\n"
  printf "  Usage: sudo bash %s\n\n" "$0"
  exit 1
fi

printf "\n${RED}  WARNING: This will remove all tools and the clawdius user.${NC}\n"
printf "  The following will be uninstalled:\n"
printf "    - Node.js, npm\n"
printf "    - Bun\n"
printf "    - uv\n"
printf "    - GitHub CLI\n"
UNINSTALL_EOF

# Conditionally add optional tools to the warning list
if [[ "$INSTALL_BROWSER" == true ]]; then
  echo 'printf "    - agent-browser + Chromium\n"' >> "$UNINSTALL"
fi
if [[ "$INSTALL_OPENCLAW" == true ]]; then
  echo 'printf "    - OpenClaw CLI\n"' >> "$UNINSTALL"
fi

cat >> "$UNINSTALL" <<'UNINSTALL_EOF'
printf "    - User: clawdius (and /home/clawdius)\n"
printf "\n"
read -rp "  Are you sure? Type 'yes' to confirm: " confirm
[[ "$confirm" == "yes" ]] || { printf "Aborted.\n"; exit 0; }

banner "Removing Node.js"
apt-get purge -y nodejs || true
rm -f /etc/apt/sources.list.d/nodesource.list
ok "Node.js removed"

banner "Removing Bun"
rm -rf /home/clawdius/.bun /root/.bun
ok "Bun removed"

banner "Removing uv"
rm -rf /home/clawdius/.local/bin/uv /home/clawdius/.local/bin/uvx \
       /root/.local/bin/uv /root/.local/bin/uvx
ok "uv removed"

banner "Removing GitHub CLI"
apt-get purge -y gh || true
rm -f /etc/apt/sources.list.d/github-cli.list \
      /usr/share/keyrings/githubcli-archive-keyring.gpg
ok "GitHub CLI removed"
UNINSTALL_EOF

if [[ "$INSTALL_BROWSER" == true ]]; then
  cat >> "$UNINSTALL" <<'UNINSTALL_EOF'

banner "Removing agent-browser"
npm rm -g agent-browser 2>/dev/null || true
ok "agent-browser removed"
UNINSTALL_EOF
fi

if [[ "$INSTALL_OPENCLAW" == true ]]; then
  cat >> "$UNINSTALL" <<'UNINSTALL_EOF'

banner "Removing OpenClaw CLI"
rm -rf /home/clawdius/.openclaw
su - clawdius -c "openclaw uninstall" 2>/dev/null || true
ok "OpenClaw removed"
UNINSTALL_EOF
fi

cat >> "$UNINSTALL" <<'UNINSTALL_EOF'

banner "Removing clawdius user"
userdel -r clawdius 2>/dev/null || true
ok "User clawdius removed"

banner "Cleaning up"
apt-get autoremove -y
apt-get clean
ok "Cleanup complete"

printf "\n${GREEN}  Uninstall finished.${NC}\n\n"
UNINSTALL_EOF

chmod +x "$UNINSTALL"
chown clawdius:clawdius "$UNINSTALL"
ok "Uninstall script written to $UNINSTALL"

# ─── 13. Cleanup ─────────────────────────────────────────────────────
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

printf "  ${CYAN}Uninstall${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  To remove everything installed by this script:\n"
printf "\n"
printf "    sudo bash /home/clawdius/uninstall.sh\n"
printf "\n"
