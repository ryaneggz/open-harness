#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

# ─── Mode detection ─────────────────────────────────────────────────
# --non-interactive : skip prompts
NON_INTERACTIVE=false
for arg in "$@"; do
  [[ "$arg" == "--non-interactive" ]] && NON_INTERACTIVE=true
done

# ─── Root check ──────────────────────────────────────────────────────
[[ $EUID -eq 0 ]] || die "This script must be run as root (or via sudo)."

# ─── Collect all options upfront ─────────────────────────────────────
INSTALL_BROWSER=true
INSTALL_CLAUDE_CODE=true
SSH_PUBKEY=""
GH_TOKEN=""
GIT_USER_NAME=""
GIT_USER_EMAIL=""

if [[ "$NON_INTERACTIVE" == false ]]; then
  banner "Configuration"

  # 1) SSH public key
  printf "\n  SSH public key for authorized_keys (blank to skip)\n"
  read -rp "  Paste public key: " SSH_PUBKEY

  # 2) Git identity
  printf "\n  Git global config (blank to skip)\n"
  read -rp "  user.name: " GIT_USER_NAME
  read -rp "  user.email: " GIT_USER_EMAIL

  # 3) GitHub CLI token
  printf "\n  GitHub personal access token for 'gh auth' (blank to skip)\n"
  read -rsp "  Token: " GH_TOKEN; echo

  # 4) Claude Code
  printf "\n  Install Claude Code CLI? (https://docs.anthropic.com/en/docs/claude-code)\n"
  read -rp "  Install Claude Code? [Y/n]: " answer
  [[ "$answer" =~ ^[Nn]$ ]] && INSTALL_CLAUDE_CODE=false

  # 5) agent-browser
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

# ─── 4. Bun ──────────────────────────────────────────────────────────
banner "Installing Bun"
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="/home/$USER/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
ok "Bun $(bun --version) installed"

# ─── 5. uv (Python package manager) ──────────────────────────────────
banner "Installing uv"
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="/home/$USER/.local/bin:$PATH"
ok "uv $(uv --version) installed"

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

# ─── 7. Git global config (optional) ─────────────────────────────────
if [[ -n "$GIT_USER_NAME" ]]; then
  git config --global user.name "${GIT_USER_NAME}"
fi
if [[ -n "$GIT_USER_EMAIL" ]]; then
  git config --global user.email "${GIT_USER_EMAIL}"
fi
if [[ -n "$GIT_USER_NAME" || -n "$GIT_USER_EMAIL" ]]; then
  ok "Git config set"
fi

# ─── 8. SSH authorized key (optional) ────────────────────────────────
if [[ -n "$SSH_PUBKEY" ]]; then
  banner "Configuring SSH authorized key"
  SSHDIR="$HOME/.ssh"
  mkdir -p "$SSHDIR"
  echo "$SSH_PUBKEY" >> "$SSHDIR/authorized_keys"
  chmod 700 "$SSHDIR"
  chmod 600 "$SSHDIR/authorized_keys"
  ok "SSH public key added"
fi

# ─── 9. Claude Code (optional) ──────────────────────────────────────────
if [[ "$INSTALL_CLAUDE_CODE" == true ]]; then
  banner "Installing Claude Code CLI"
  curl -fsSL https://claude.ai/install.sh | sh
  ok "Claude Code CLI installed"
  printf "  Run 'claude' to launch and authenticate via OAuth.\n"
else
  banner "Skipping Claude Code"
  ok "Skipped"
fi

# ─── 10. GitHub CLI auth (optional) ──────────────────────────────────
if [[ -n "$GH_TOKEN" ]]; then
  banner "Authenticating GitHub CLI"
  echo "$GH_TOKEN" | gh auth login --with-token
  ok "gh auth configured"
fi

# ─── 11. Generate uninstall script ────────────────────────────────────
banner "Generating uninstall script"
UNINSTALL="/home/$USER/uninstall.sh"
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

printf "\n${RED}  WARNING: This will remove all installed tools.${NC}\n"
printf "  The following will be uninstalled:\n"
printf "    - Node.js, npm\n"
printf "    - Bun\n"
printf "    - uv\n"
printf "    - GitHub CLI\n"
UNINSTALL_EOF

if [[ "$INSTALL_BROWSER" == true ]]; then
  echo 'printf "    - agent-browser + Chromium\n"' >> "$UNINSTALL"
fi
if [[ "$INSTALL_CLAUDE_CODE" == true ]]; then
  echo 'printf "    - Claude Code CLI\n"' >> "$UNINSTALL"
fi

cat >> "$UNINSTALL" <<'UNINSTALL_EOF'
printf "\n"
read -rp "  Are you sure? Type 'yes' to confirm: " confirm
[[ "$confirm" == "yes" ]] || { printf "Aborted.\n"; exit 0; }

banner "Removing Node.js"
apt-get purge -y nodejs || true
rm -f /etc/apt/sources.list.d/nodesource.list
ok "Node.js removed"

banner "Removing Bun"
rm -rf /home/$USER/.bun
ok "Bun removed"

banner "Removing uv"
rm -rf /home/$USER/.local/bin/uv /home/$USER/.local/bin/uvx
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

if [[ "$INSTALL_CLAUDE_CODE" == true ]]; then
  cat >> "$UNINSTALL" <<'UNINSTALL_EOF'

banner "Removing Claude Code CLI"
npm rm -g @anthropic-ai/claude-code 2>/dev/null || true
rm -rf ~/.claude 2>/dev/null || true
ok "Claude Code removed"
UNINSTALL_EOF
fi

cat >> "$UNINSTALL" <<'UNINSTALL_EOF'

banner "Cleaning up"
apt-get autoremove -y
apt-get clean
ok "Cleanup complete"

printf "\n${GREEN}  Uninstall finished.${NC}\n\n"
UNINSTALL_EOF

chmod +x "$UNINSTALL"
ok "Uninstall script written to $UNINSTALL"

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
if [[ "$INSTALL_CLAUDE_CODE" == true ]]; then
  printf "  claude   : installed\n"
fi
printf "\n"
printf "  ${CYAN}Quick test commands${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  node -e \"console.log('hello from node')\"\n"
printf "  bun --version\n"
printf "  uv python install 3.12 && uv run python -c \"print('hello from python')\"\n"
printf "  gh auth status\n"
if [[ "$INSTALL_BROWSER" == true ]]; then
  printf "  agent-browser --help\n"
fi
printf "\n"

if [[ "$INSTALL_CLAUDE_CODE" == true ]]; then
  printf "  ${CYAN}Claude Code — next steps${NC}\n"
  printf "  ──────────────────────────────────────\n"
  printf "  claude                    # launch and authenticate via OAuth\n"
  printf "  claude -p 'your prompt'   # non-interactive mode\n"
  printf "  Docs: https://docs.anthropic.com/en/docs/claude-code\n"
  printf "\n"
fi

printf "  ${CYAN}Uninstall${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "  sudo bash /home/$USER/uninstall.sh\n"
printf "\n"
