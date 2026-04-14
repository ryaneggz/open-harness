#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

WITH_CLI=false
for arg in "$@"; do
  case "$arg" in
    --with-cli) WITH_CLI=true ;;
  esac
done

# ─── Banner ──────────────────────────────────────────────────────────
printf "\n${CYAN}╔══════════════════════════════════════╗${NC}\n"
printf "${CYAN}║   Open Harness — CLI Installer       ║${NC}\n"
printf "${CYAN}╚══════════════════════════════════════╝${NC}\n\n"

# ─── 1. Check Docker ────────────────────────────────────────────────
banner "Checking Docker"
if ! command -v docker &>/dev/null; then
  die "Docker is not installed. Install Docker from: https://docs.docker.com/get-docker/"
fi
if ! docker compose version &>/dev/null; then
  die "Docker Compose plugin is not installed. Install it from: https://docs.docker.com/compose/install/"
fi
ok "Docker $(docker --version | awk '{print $3}') — OK"
ok "Docker Compose $(docker compose version --short) — OK"

# ─── 2. Check git ────────────────────────────────────────────────────
banner "Checking git"
if ! command -v git &>/dev/null; then
  die "git is not installed. Install git from: https://git-scm.com"
fi
ok "git $(git --version | awk '{print $3}') — OK"

# ─── 3. Resolve repo directory ────────────────────────────────────────
banner "Resolving repository"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd)"

if [ -f "$SCRIPT_DIR/packages/sandbox/package.json" ] && [ -f "$SCRIPT_DIR/pnpm-workspace.yaml" ]; then
  REPO_DIR="$SCRIPT_DIR"
  ok "Using local repo: $REPO_DIR"
else
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

cd "$REPO_DIR"

# ─── 4. Configure sandbox ────────────────────────────────────────────
banner "Configuring sandbox"

# Container name
DEFAULT_NAME=$(basename "$REPO_DIR")
printf "  Container name [${DEFAULT_NAME}]: "
read -r SANDBOX_NAME
SANDBOX_NAME="${SANDBOX_NAME:-$DEFAULT_NAME}"
ok "Name: $SANDBOX_NAME"

# Password (only used when sshd overlay is active)
printf "  Sandbox password [changeme]: "
read -rs SANDBOX_PASSWORD
printf "\n"
SANDBOX_PASSWORD="${SANDBOX_PASSWORD:-changeme}"
ok "Password: (set)"

# Write .env for docker compose
cat > "$REPO_DIR/.env" <<ENVEOF
SANDBOX_NAME=$SANDBOX_NAME
SANDBOX_PASSWORD=$SANDBOX_PASSWORD
ENVEOF
ok "Wrote .env"

# ─── 5. Build and start sandbox ──────────────────────────────────────
banner "Building and starting sandbox"
docker compose -f .devcontainer/docker-compose.yml up -d --build
ok "Sandbox '$SANDBOX_NAME' started"

# ─── 6. (Optional) Build and link host CLI ───────────────────────────
if [ "$WITH_CLI" = true ]; then
  banner "Building host CLI (--with-cli)"

  # Check Node.js >= 20
  if ! command -v node &>/dev/null; then
    die "Node.js is not installed. Install Node.js 20+ from: https://nodejs.org"
  fi
  if ! node -e "if(parseInt(process.version.slice(1))<20)process.exit(1)" 2>/dev/null; then
    die "Node.js 20+ required (found $(node --version)). Upgrade at: https://nodejs.org"
  fi
  ok "Node.js $(node --version) — OK"

  # Ensure pnpm
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

  pnpm install
  pnpm -r run build
  pnpm link --global ./packages/sandbox
  ok "openharness CLI built and linked"

  if ! command -v openharness &>/dev/null; then
    die "openharness command not found on PATH. Check that pnpm global bin is in your PATH."
  fi
  ok "openharness available on PATH"
fi

# ─── Success ─────────────────────────────────────────────────────────
printf "\n${GREEN}Installation complete!${NC}\n\n"
printf "  ${CYAN}Next steps${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "\n"
printf "  ${CYAN}Enter the sandbox:${NC}\n"
if [ "$WITH_CLI" = true ]; then
  printf "    openharness shell %s\n" "$SANDBOX_NAME"
else
  printf "    docker exec -it -u sandbox %s bash\n" "$SANDBOX_NAME"
fi
printf "\n"
printf "  ${CYAN}One-time setup (inside the sandbox):${NC}\n"
printf "    gh auth login                         # authenticate GitHub CLI\n"
printf "    gh auth setup-git                     # configure git auth\n"
printf "\n"
printf "  ${CYAN}VS Code (alternative):${NC}\n"
printf "    Open the repo in VS Code → Cmd+Shift+P → \"Reopen in Container\"\n"
printf "\n"
