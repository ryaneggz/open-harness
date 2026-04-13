#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

# ─── Banner ──────────────────────────────────────────────────────────
printf "\n${CYAN}╔══════════════════════════════════════╗${NC}\n"
printf "${CYAN}║   Open Harness — CLI Installer       ║${NC}\n"
printf "${CYAN}╚══════════════════════════════════════╝${NC}\n\n"

# ─── 1. Check Node.js >= 20 ──────────────────────────────────────────
banner "Checking Node.js"
if ! command -v node &>/dev/null; then
  die "Node.js is not installed. Install Node.js 20+ from: https://nodejs.org"
fi
if ! node -e "if(parseInt(process.version.slice(1))<20)process.exit(1)" 2>/dev/null; then
  die "Node.js 20+ required (found $(node --version)). Upgrade at: https://nodejs.org"
fi
ok "Node.js $(node --version) — OK"

# ─── 2. Check git ────────────────────────────────────────────────────
banner "Checking git"
if ! command -v git &>/dev/null; then
  die "git is not installed. Install git from: https://git-scm.com"
fi
ok "git $(git --version | awk '{print $3}') — OK"

# ─── 3. Ensure pnpm is available ─────────────────────────────────────
banner "Checking pnpm"
if command -v pnpm &>/dev/null; then
  ok "pnpm $(pnpm --version) — already installed"
elif command -v corepack &>/dev/null; then
  corepack enable
  corepack prepare pnpm@latest --activate
  ok "pnpm $(pnpm --version) — enabled via corepack"
else
  npm install -g pnpm
  ok "pnpm $(pnpm --version) — installed via npm"
fi

# ─── 4. Resolve repo directory ────────────────────────────────────────
# If running from inside the repo, use it. Otherwise clone fresh.
banner "Resolving repository"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"

if [ -f "$SCRIPT_DIR/packages/sandbox/package.json" ] && [ -f "$SCRIPT_DIR/pnpm-workspace.yaml" ]; then
  # Running from inside the repo (bash install.sh or ./install.sh)
  REPO_DIR="$SCRIPT_DIR"
  ok "Using local repo: $REPO_DIR"
else
  # Running via curl pipe or from outside the repo — clone it
  REPO_DIR="$HOME/.openharness"
  if [ -d "$REPO_DIR/.git" ]; then
    printf "  Repository exists — pulling latest changes...\n"
    git -C "$REPO_DIR" pull
    ok "Repository updated: $REPO_DIR"
  else
    git clone https://github.com/ryaneggz/open-harness.git "$REPO_DIR"
    ok "Repository cloned: $REPO_DIR"
  fi
fi

# ─── 5. Build and link CLI ───────────────────────────────────────────
banner "Building and linking openharness CLI"
cd "$REPO_DIR"
pnpm install
pnpm -r run build
pnpm link --global ./packages/sandbox
ok "openharness CLI built and linked"

# ─── 6. Verify installation ──────────────────────────────────────────
banner "Verifying installation"
if ! command -v openharness &>/dev/null; then
  die "openharness command not found on PATH. Check that pnpm global bin is in your PATH."
fi
ok "openharness $(openharness --version 2>/dev/null || echo 'installed') — available on PATH"

# ─── Success ─────────────────────────────────────────────────────────
printf "\n${GREEN}Installation complete!${NC}\n\n"
printf "  ${CYAN}Next steps${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "\n"
printf "  ${CYAN}Option A — VS Code (recommended):${NC}\n"
printf "    Open the repo in VS Code → Cmd+Shift+P → \"Reopen in Container\"\n"
printf "\n"
printf "  ${CYAN}Option B — CLI:${NC}\n"
printf "    openharness sandbox                   # build + start sandbox\n"
printf "    openharness onboard                   # one-time auth setup\n"
printf "\n"
printf "  ${CYAN}Option C — Manual:${NC}\n"
printf "    docker compose -f .devcontainer/docker-compose.yml up -d --build\n"
printf "    ssh sandbox@localhost -p 2222         # password: test1234\n"
printf "\n"
