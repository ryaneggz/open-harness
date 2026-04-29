#!/usr/bin/env bash
set -euo pipefail

# ─── Colours / helpers ───────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
warn()   { printf "${YELLOW}WARN: %s${NC}\n" "$*" >&2; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

# ─── detect_node: returns 0 iff Node ≥ 20 is on PATH ─────────────────
# Sets DETECTED_NODE_VERSION and DETECTED_NODE_REASON for messaging.
detect_node() {
  if ! command -v node >/dev/null 2>&1; then
    DETECTED_NODE_REASON="not installed"
    return 1
  fi
  # The `|| echo unknown` guard is LOAD-BEARING: keeps `set -e` from killing
  # the script when `node --version` exits non-zero. Do not strip.
  DETECTED_NODE_VERSION="$(node --version 2>/dev/null || echo unknown)"
  local major
  major="$(printf '%s' "$DETECTED_NODE_VERSION" | sed -E 's/^v?([0-9]+).*/\1/')"
  if ! [[ "$major" =~ ^[0-9]+$ ]]; then
    DETECTED_NODE_REASON="unparseable version ($DETECTED_NODE_VERSION)"
    return 1
  fi
  if (( major < 20 )); then
    DETECTED_NODE_REASON="too old ($DETECTED_NODE_VERSION; need 20+)"
    return 1
  fi
  return 0
}

# ─── prompt_input: env-var > /dev/tty > default fallback > die ──────
# Args: $1=varname, $2=prompt msg, $3=default (optional), $4=-s for secret
# Reads from /dev/tty so curl-piped installs still get keystrokes (stdin
# is the script source in pipe mode, not the user's keyboard).
prompt_input() {
  local __var="$1"; local __msg="$2"; local __default="${3:-}"; local __secret="${4:-}"
  if [ -n "${!__var:-}" ]; then
    ok "Using $__var from environment"
    return 0
  fi
  if [ -r /dev/tty ]; then
    if [ -n "$__default" ]; then
      printf "  %s [%s]: " "$__msg" "$__default"
    else
      printf "  %s: " "$__msg"
    fi
    local reply
    if [ "$__secret" = "-s" ]; then
      read -rs reply </dev/tty || reply=""
      printf "\n"
    else
      read -r reply </dev/tty || reply=""
    fi
    printf -v "$__var" '%s' "${reply:-$__default}"
  else
    if [ -n "$__default" ]; then
      printf -v "$__var" '%s' "$__default"
      warn "$__var defaulted (no TTY available)"
    else
      die "$__var required but no TTY available. Set ${__var}=<value> as env var and re-run."
    fi
  fi
}

# ─── Help ────────────────────────────────────────────────────────────
print_help() {
  cat <<HELPEOF
Open Harness — CLI Installer

Usage:
  curl -fsSL https://oh.mifune.dev/install.sh | bash [-s -- <flags>]
  ./install.sh [<flags>]

Auto-detects Node 20+ on the host. If present → CLI-first install (build
+ link the 'oh' binary on host, no auto-sandbox). If absent → 3-way
prompt (install Node 22 via nvm + CLI / Docker-only sandbox / abort).

Flags:
  --cli                Force CLI-first. Hard-fails if Node 20+ is missing.
  --docker-only        Force Docker-only sandbox (no host CLI). Alias: --no-cli.
  --install-node       Install Node 22 via nvm, then CLI. Skips detection.
  --with-cli           Deprecated alias for --cli.
  -y, --yes            Accept default at any prompt.
  -n, --no             Decline at any prompt (abort path).
  -h, --help           Show this help and exit.

Env vars:
  OH_INSTALL_MODE      cli | docker | node-then-cli | auto  (default: auto)
  OH_ASSUME_YES        Set to 1 for --yes
  OH_INSTALL_REF       Git ref (tag/SHA) to clone instead of main
  SANDBOX_NAME         Skip the "Container name" prompt
  SANDBOX_PASSWORD     Skip the credential prompt

Examples:
  curl -fsSL https://oh.mifune.dev/install.sh | bash
  curl -fsSL https://oh.mifune.dev/install.sh | bash -s -- --yes --docker-only
  ./install.sh --cli
HELPEOF
}

# ─── Arg parsing ─────────────────────────────────────────────────────
FORCE_CLI=false
FORCE_DOCKER=false
FORCE_NTC=false
ASSUME_YES="${OH_ASSUME_YES:+true}"; ASSUME_YES="${ASSUME_YES:-false}"
ASSUME_NO=false

while [ $# -gt 0 ]; do
  case "$1" in
    --cli)
      FORCE_CLI=true
      ;;
    --docker-only|--no-cli)
      FORCE_DOCKER=true
      ;;
    --install-node)
      FORCE_NTC=true
      ;;
    --with-cli)
      warn "--with-cli is deprecated; the installer now auto-detects Node. Use --cli to force CLI-first or --docker-only to force docker-first."
      FORCE_CLI=true
      ;;
    -y|--yes)
      ASSUME_YES=true
      ;;
    -n|--no)
      ASSUME_NO=true
      ;;
    -h|--help)
      print_help; exit 0
      ;;
    --cli=*|--docker-only=*|--no-cli=*|--install-node=*|--with-cli=*|--yes=*|--no=*)
      die "Flags do not take =value (got '$1'). Use space-separated form, e.g. '--cli'."
      ;;
    *)
      warn "Unknown argument: $1 (ignoring)"
      ;;
  esac
  shift
done

# Env mode override (only fires when no forcing flag is set; flags win on conflict).
case "${OH_INSTALL_MODE:-auto}" in
  cli)
    [ "$FORCE_DOCKER" = true ] || [ "$FORCE_NTC" = true ] || FORCE_CLI=true
    ;;
  docker)
    [ "$FORCE_CLI" = true ] || [ "$FORCE_NTC" = true ] || FORCE_DOCKER=true
    ;;
  node-then-cli)
    [ "$FORCE_CLI" = true ] || [ "$FORCE_DOCKER" = true ] || FORCE_NTC=true
    ;;
  auto|"")
    ;;
  *)
    die "Invalid OH_INSTALL_MODE='$OH_INSTALL_MODE' (expected: cli|docker|node-then-cli|auto)"
    ;;
esac

# Conflict checks — run AFTER the parse loop, never inside (a single-pass case
# statement cannot see what came later).
[ "$FORCE_CLI"    = true ] && [ "$FORCE_DOCKER" = true ] && die "--cli and --docker-only are mutually exclusive."
[ "$FORCE_CLI"    = true ] && [ "$FORCE_NTC"    = true ] && die "--cli and --install-node are mutually exclusive."
[ "$FORCE_DOCKER" = true ] && [ "$FORCE_NTC"    = true ] && die "--docker-only and --install-node are mutually exclusive."
[ "$ASSUME_YES"   = true ] && [ "$ASSUME_NO"    = true ] && die "--yes and --no are mutually exclusive."

# Backwards-compat shim: legacy WITH_CLI gates the optional pnpm-build block
# below. T3 (mode dispatch) will replace this with resolve_mode() and remove
# the shim entirely.
WITH_CLI="$FORCE_CLI"

# ─── Banner ──────────────────────────────────────────────────────────
printf "\n${CYAN}╔══════════════════════════════════════╗${NC}\n"
printf "${CYAN}║   Open Harness — CLI Installer       ║${NC}\n"
printf "${CYAN}╚══════════════════════════════════════╝${NC}\n\n"

# ─── 1. Check Docker ────────────────────────────────────────────────
banner "Checking Docker"
if ! command -v docker >/dev/null 2>&1; then
  die "Docker is not installed. Install Docker from: https://docs.docker.com/get-docker/"
fi
if ! docker compose version >/dev/null 2>&1; then
  die "Docker Compose plugin is not installed. Install it from: https://docs.docker.com/compose/install/"
fi
ok "Docker $(docker --version | awk '{print $3}') — OK"
ok "Docker Compose $(docker compose version --short) — OK"

# ─── 2. Check git ────────────────────────────────────────────────────
banner "Checking git"
if ! command -v git >/dev/null 2>&1; then
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
    # Gate pull on clean working tree — don't abort on local edits.
    if git -C "$REPO_DIR" diff --quiet 2>/dev/null && git -C "$REPO_DIR" diff --cached --quiet 2>/dev/null; then
      printf "  Repository exists — pulling latest changes...\n"
      git -C "$REPO_DIR" pull --ff-only
      ok "Repository updated: $REPO_DIR"
    else
      warn "Local changes detected in $REPO_DIR — skipping git pull. Stash or commit them, then re-run if you want the latest main."
    fi
  else
    if [ -n "${OH_INSTALL_REF:-}" ]; then
      git clone --branch "$OH_INSTALL_REF" https://github.com/ryaneggz/open-harness.git "$REPO_DIR"
      ok "Repository cloned at ref '$OH_INSTALL_REF': $REPO_DIR"
    else
      git clone https://github.com/ryaneggz/open-harness.git "$REPO_DIR"
      ok "Repository cloned: $REPO_DIR"
    fi
  fi
fi

cd "$REPO_DIR"

# ─── 4. Configure sandbox ────────────────────────────────────────────
banner "Configuring sandbox"

DEFAULT_NAME=$(basename "$REPO_DIR")
prompt_input SANDBOX_NAME "Container name" "$DEFAULT_NAME"
ok "Name: $SANDBOX_NAME"

prompt_input SANDBOX_PASSWORD "Sandbox passphrase (used by sshd overlay)" "changeme" -s
ok "Passphrase: (set)"

# Write .devcontainer/.env — packages/sandbox/src/lib/config.ts:7 hard-codes
# ENV_FILE = ".devcontainer/.env", NOT $REPO_DIR/.env. Single-quoting handles
# names containing shell metacharacters; literal single quotes are escaped.
mkdir -p "$REPO_DIR/.devcontainer"
__SN_ESC="${SANDBOX_NAME//\'/\'\\\'\'}"
__SP_ESC="${SANDBOX_PASSWORD//\'/\'\\\'\'}"
cat > "$REPO_DIR/.devcontainer/.env" <<ENVEOF
SANDBOX_NAME='$__SN_ESC'
SANDBOX_PASSWORD='$__SP_ESC'
ENVEOF
unset __SN_ESC __SP_ESC
ok "Wrote .devcontainer/.env"

# ─── 5. Build and start sandbox ──────────────────────────────────────
# Note: docker compose up still runs unconditionally — T3 (mode dispatch)
# will gate this behind INSTALL_MODE=docker.
banner "Building and starting sandbox"
docker compose -f .devcontainer/docker-compose.yml up -d --build
ok "Sandbox '$SANDBOX_NAME' started"

# ─── 6. (Optional) Build and link host CLI ───────────────────────────
if [ "$WITH_CLI" = true ]; then
  banner "Building host CLI (--cli)"

  if ! detect_node; then
    die "Node.js 20+ required ($DETECTED_NODE_REASON). Install Node 20+ from https://nodejs.org or re-run with --install-node."
  fi
  ok "Node.js $DETECTED_NODE_VERSION — OK"

  # Ensure pnpm
  if command -v pnpm >/dev/null 2>&1; then
    ok "pnpm $(pnpm --version) — already installed"
  elif command -v corepack >/dev/null 2>&1; then
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

  if ! command -v openharness >/dev/null 2>&1; then
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
  printf "    docker exec -it -u orchestrator %s bash\n" "$SANDBOX_NAME"
fi
printf "\n"
printf "  ${CYAN}One-time setup (inside the sandbox):${NC}\n"
printf "    gh auth login                         # authenticate GitHub CLI\n"
printf "    gh auth setup-git                     # configure git auth\n"
printf "\n"
printf "  ${CYAN}VS Code (alternative):${NC}\n"
printf "    Open the repo in VS Code → Cmd+Shift+P → \"Reopen in Container\"\n"
printf "\n"
