#!/usr/bin/env bash
set -euo pipefail

# Surface silent set -e exits — without this, any non-zero return mid-script
# kills bash with no `ERROR:` line and the user is left staring at a prompt
# wondering why install bailed.
trap 'printf "\n\033[0;31mERROR:\033[0m install.sh aborted (exit %s) at line %s: %s\n" "$?" "$LINENO" "$BASH_COMMAND" >&2' ERR

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

# ─── NVM install constants ───────────────────────────────────────────
# Bump procedure: pick a new tag from https://github.com/nvm-sh/nvm/releases,
# then run `curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/<tag>/install.sh" | sha256sum`
# and update both lines together. NEVER bump one without the other — the URL is
# mutable (GitHub serves whatever the tag currently points at), so the SHA-256
# pin is what makes this safe.
NVM_VERSION="v0.40.4"
NVM_SHA256="4b7412c49960c7d31e8df72da90c1fb5b8cccb419ac99537b737028d497aba4f"
NODE_LTS_MAJOR="22"

# ─── install_nvm: SHA-256-pinned nvm install + Node 22 + corepack ────
# Order is LOAD-BEARING: source nvm → nvm install → corepack enable.
# corepack runs in the nvm-managed Node context only (no sudo needed).
install_nvm() {
  banner "Installing Node $NODE_LTS_MAJOR via nvm"

  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

  # Functional already-installed check — file existence alone is insufficient
  # (a corrupt or partial install passes [ -f nvm.sh ] but breaks `. nvm.sh`).
  local nvm_works=false
  if [ -d "$NVM_DIR" ] && (
       # shellcheck disable=SC1090,SC1091
       . "$NVM_DIR/nvm.sh" 2>/dev/null
       command -v nvm >/dev/null 2>&1
     ); then
    nvm_works=true
  fi

  if [ "$nvm_works" = true ]; then
    ok "nvm already installed at $NVM_DIR (skipping download)"
  else
    local tmp
    tmp="$(mktemp)"
    if ! curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" -o "$tmp"; then
      rm -f "$tmp"
      die "Failed to download nvm installer from raw.githubusercontent.com. Check your network and re-run."
    fi
    local actual
    actual="$(sha256sum "$tmp" | awk '{print $1}')"
    if [ "$actual" != "$NVM_SHA256" ]; then
      rm -f "$tmp"
      die "nvm installer SHA-256 mismatch (expected $NVM_SHA256, got $actual). Refusing to execute potentially-tampered script. If this is a deliberate nvm version bump, update NVM_VERSION and NVM_SHA256 together in install.sh."
    fi
    if ! bash "$tmp" >/dev/null 2>&1; then
      rm -f "$tmp"
      die "nvm installer exited non-zero. If ~/.bashrc is read-only or HOME is unwritable, fix that and re-run. Otherwise check the nvm installer output by running: bash -x <(curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh)"
    fi
    rm -f "$tmp"
    ok "nvm $NVM_VERSION installed (SHA-256 verified)"
  fi

  # nvm.sh and nvm's internal helpers are NOT strict-mode safe — they `return 1`
  # on intentional branches, source unset vars (set -u), and run pipelines whose
  # middle commands fail under pipefail. Bracket: relax strict mode for the nvm
  # surface, restore immediately after, then check $? explicitly.
  set +euo pipefail
  # shellcheck disable=SC1090,SC1091
  . "$NVM_DIR/nvm.sh"
  __nvm_install_rc=0
  if command -v nvm >/dev/null 2>&1; then
    nvm install "$NODE_LTS_MAJOR"
    __nvm_install_rc=$?
    nvm alias default "$NODE_LTS_MAJOR"
  else
    __nvm_install_rc=127
  fi
  set -euo pipefail

  if [ "$__nvm_install_rc" = 127 ]; then
    die "nvm sourced but 'nvm' is not on PATH. Try: 'source ~/.bashrc' and re-run."
  elif [ "$__nvm_install_rc" -ne 0 ]; then
    die "nvm install $NODE_LTS_MAJOR failed (exit $__nvm_install_rc). If your existing ~/.nvm is from an older release, try: rm -rf ~/.nvm && re-run install.sh. For verbose output: bash -x install.sh."
  fi
  unset __nvm_install_rc
  ok "Node $(node --version) installed via nvm"

  # corepack invokes npm helpers that under set -e/pipefail can propagate
  # transient pnpm registry hiccups as fatal. Same bracket pattern. Pin pnpm
  # to package.json#packageManager — `pnpm@latest` is a network resolve every
  # install + drift risk.
  set +eu
  corepack enable
  corepack prepare pnpm@10.33.0 --activate
  set -euo pipefail
  if ! command -v pnpm >/dev/null 2>&1; then
    die "pnpm not on PATH after 'corepack prepare'. Check that ~/.nvm shims are loaded."
  fi
  ok "pnpm $(pnpm --version) — enabled via corepack"

  # Re-detect to verify the install actually produced a usable Node 20+.
  if ! detect_node; then
    die "nvm install completed but detect_node still fails ($DETECTED_NODE_REASON). Aborting before pnpm install."
  fi

  # Fish-aware reminder for the post-success message.
  case "${SHELL:-}" in
    */fish|*fish) OH_FISH_REMINDER=true ;;
  esac
}

# ─── choose_path: 3-way interactive prompt when Node is missing ──────
# Default option 1 (nvm + CLI) matches the user-stated direction.
choose_path() {
  printf "\n${YELLOW}Node.js 20+ not found${NC} (%s)\n\n" "$DETECTED_NODE_REASON"
  printf "  How would you like to proceed?\n\n"
  printf "    1) Install Node %s via nvm, then install the 'oh' CLI on the host  ${CYAN}[default]${NC}\n" "$NODE_LTS_MAJOR"
  printf "       — Recommended. nvm is sandboxed to your user (no sudo).\n"
  printf "    2) Skip the CLI; run a Docker-only sandbox now\n"
  printf "       — You'll manage it with 'docker exec' and 'docker compose'.\n"
  printf "    3) Abort — let me install Node myself and re-run\n\n"

  if [ "$ASSUME_YES" = true ]; then
    ok "Continuing with option 1 (nvm + CLI) — --yes / OH_ASSUME_YES set"
    INSTALL_MODE=node-then-cli
    return
  fi
  if [ "$ASSUME_NO" = true ]; then
    die "Aborted (--no). Install Node 20+ from https://nodejs.org and re-run."
  fi
  if [ ! -r /dev/tty ]; then
    die "Node 20+ not found and no TTY available for confirmation. Re-run with --yes (option 1), --docker-only (option 2), or install Node 20+ first. Tip: 'curl … | bash -s -- --yes'."
  fi

  printf "  Choice [1]: "
  local reply
  read -r reply </dev/tty || reply=""
  case "${reply:-1}" in
    1|"")
      ok "Selected: install Node $NODE_LTS_MAJOR via nvm + CLI"
      INSTALL_MODE=node-then-cli
      ;;
    2)
      ok "Selected: Docker-only sandbox"
      INSTALL_MODE=docker
      ;;
    3)
      die "Aborted. Install Node 20+ from https://nodejs.org and re-run."
      ;;
    *)
      die "Invalid choice '$reply'. Re-run and choose 1, 2, or 3."
      ;;
  esac
}

# ─── resolve_mode: forcing flag > env > auto-detect ──────────────────
# Sets INSTALL_MODE = cli | docker | node-then-cli.
resolve_mode() {
  banner "Resolving install mode"

  if [ "$FORCE_CLI" = true ]; then
    if ! detect_node; then
      die "--cli requires Node 20+ on PATH ($DETECTED_NODE_REASON). Install Node 20+ from https://nodejs.org or re-run with --install-node to have the installer set up Node 22 via nvm."
    fi
    ok "Node.js $DETECTED_NODE_VERSION detected — CLI-first install (--cli)"
    INSTALL_MODE=cli
    return
  fi
  if [ "$FORCE_DOCKER" = true ]; then
    ok "Docker-only install (--docker-only)"
    INSTALL_MODE=docker
    return
  fi
  if [ "$FORCE_NTC" = true ]; then
    ok "Node-then-CLI install (--install-node)"
    INSTALL_MODE=node-then-cli
    return
  fi

  # Auto-detect.
  if detect_node; then
    ok "Node.js $DETECTED_NODE_VERSION detected — using CLI-first install"
    INSTALL_MODE=cli
  else
    choose_path
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

# INSTALL_MODE resolved later (after Docker/git checks) by resolve_mode().
INSTALL_MODE=""
OH_FISH_REMINDER=false

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

# ─── Resolve mode (sets INSTALL_MODE) ────────────────────────────────
resolve_mode

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

# ─── 5/6. Execute the chosen mode ────────────────────────────────────
# CLI-first paths do NOT auto-start a sandbox — the user runs `oh sandbox`
# themselves so they learn the lifecycle. Docker-first runs compose up.

case "$INSTALL_MODE" in
  node-then-cli)
    install_nvm
    ;;
  cli|docker)
    : # no nvm work needed
    ;;
  *)
    die "Internal error: INSTALL_MODE='$INSTALL_MODE' is not one of cli|docker|node-then-cli."
    ;;
esac

if [ "$INSTALL_MODE" = "cli" ] || [ "$INSTALL_MODE" = "node-then-cli" ]; then
  banner "Building and linking host CLI"

  # Ensure pnpm — install_nvm() already activated it via corepack in the
  # node-then-cli path, so this is a no-op there. The cli path with system
  # Node may need this fallback chain.
  if command -v pnpm >/dev/null 2>&1; then
    ok "pnpm $(pnpm --version) — already installed"
  elif command -v corepack >/dev/null 2>&1; then
    corepack enable
    corepack prepare pnpm@10.33.0 --activate
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
    die "openharness command not found on PATH. The pnpm global bin directory may not be on your PATH. Check 'pnpm config get global-bin-dir' and add it to PATH in your shell rc."
  fi
  ok "openharness available on PATH"
fi

if [ "$INSTALL_MODE" = "docker" ]; then
  banner "Building and starting sandbox"
  docker compose -f .devcontainer/docker-compose.yml up -d --build
  ok "Sandbox '$SANDBOX_NAME' started"
fi

# ─── Mode-aware Next Steps ───────────────────────────────────────────
printf "\n${GREEN}Installation complete!${NC}\n\n"
printf "  ${CYAN}Next steps${NC}\n"
printf "  ──────────────────────────────────────\n"
printf "\n"

if [ "$INSTALL_MODE" = "cli" ] || [ "$INSTALL_MODE" = "node-then-cli" ]; then
  # CLI-first: lead with cd \$REPO_DIR (oh sandbox resolves compose paths
  # relative to CWD), then explicit oh sandbox / oh shell steps. gh auth
  # runs INSIDE the shell — gh's credential helper writes into the sandbox
  # home, not the host home.
  printf "  ${CYAN}1. Move into the repo${NC} (oh sandbox resolves compose paths relative to CWD):\n"
  printf "       cd %s\n\n" "$REPO_DIR"
  printf "  ${CYAN}2. Provision your sandbox:${NC}\n"
  printf "       oh sandbox %s\n\n" "$SANDBOX_NAME"
  printf "  ${CYAN}3. Open a shell in the sandbox:${NC}\n"
  printf "       oh shell %s\n\n" "$SANDBOX_NAME"
  printf "  ${CYAN}4. Inside the sandbox, run the one-time auth wizard:${NC}\n"
  printf "       gh auth login && gh auth setup-git\n"
  printf "       pi                                  # Pi Agent OAuth (Slack / heartbeats)\n\n"
  printf "  ${CYAN}Tear down later (from host):${NC}\n"
  printf "       oh clean %s\n\n" "$SANDBOX_NAME"
  printf "  ${CYAN}Note:${NC} 'oh sandbox' runs docker compose for you. The container is NOT\n"
  printf "  running yet — that's intentional so you learn the CLI lifecycle.\n"

  if [ "$INSTALL_MODE" = "node-then-cli" ]; then
    printf "\n"
    printf "  ${YELLOW}Reminder:${NC} nvm wrote to ~/.bashrc — open a new shell, or run\n"
    printf "  'source ~/.bashrc', so 'node' / 'pnpm' / 'oh' stay on PATH later.\n"
    if [ "${OH_FISH_REMINDER:-false}" = true ]; then
      printf "  Fish users: install nvm.fish or fisher; nvm doesn't source into Fish.\n"
    fi
  fi
elif [ "$INSTALL_MODE" = "docker" ]; then
  printf "  ${CYAN}Enter the sandbox:${NC}\n"
  printf "       docker exec -it -u orchestrator %s bash\n\n" "$SANDBOX_NAME"
  printf "  ${CYAN}One-time setup (inside the sandbox):${NC}\n"
  printf "       gh auth login\n"
  printf "       gh auth setup-git\n\n"
  printf "  ${CYAN}Stop / restart (from %s):${NC}\n" "$REPO_DIR"
  printf "       cd %s\n" "$REPO_DIR"
  printf "       docker compose -f .devcontainer/docker-compose.yml stop\n"
  printf "       docker compose -f .devcontainer/docker-compose.yml up -d\n\n"
  printf "  ${CYAN}Want the 'oh' CLI later? Re-run with --install-node:${NC}\n"
  printf "       curl -fsSL https://oh.mifune.dev/install.sh | bash -s -- --install-node\n"
fi

printf "\n  ${CYAN}VS Code (alternative):${NC}\n"
printf "       Open the repo in VS Code → Cmd+Shift+P → \"Reopen in Container\"\n"
printf "\n"
