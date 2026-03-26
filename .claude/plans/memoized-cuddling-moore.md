# Plan: Replace OpenClaw with Claude Code Installation

## Context

Replace OpenClaw with Claude Code in a barebones setup script. Remove the MCP server — the execution environment will be configured later by forking configurations for various agents.

## QA Workflow

1. Spin up container → 2. Log in → 3. Run `bash setup.sh` → 4. Run `claude` → 5. OAuth login → 6. Validate

---

## Changes

### 0. Rename `ubuntu/` → `claude/`

- `git mv ubuntu claude`
- Update all internal references: Makefile, docker-compose.yml, .github/workflows/build.yml, READMEs
- Tag pattern in CI: `ubuntu-*` → `claude-*`

### 1. `claude/setup.sh` — Replace OpenClaw with Claude Code

- `INSTALL_OPENCLAW=true` → `INSTALL_CLAUDE_CODE=true`
- Interactive prompt: "Install Claude Code CLI?" (update text + variable)
- Step 9: `npm install -g openclaw` → `curl -fsSL https://claude.ai/install.sh | sh`
- Uninstall script: `openclaw uninstall` → `rm -rf ~/.claude` (or appropriate curl-installed cleanup)
- Summary: show `claude` instead of `openclaw`, next steps = `claude` (OAuth)

### 2. `README.md` (root) — Full rebrand + directory rename

- Line 1: "OpenClaw Sandboxes" → "Claude Code Sandboxes"
- Line 3: Description → reference [Claude Code](https://docs.anthropic.com/en/docs/claude-code), "Claude Code agents"
- Lines 11,14: Branch refs `refs/heads/openclaw` → `refs/heads/claude-code`
- Line 25: "Debian-based OpenClaw server" → "Debian-based Claude Code server"
- Line 32: "OpenClaw CLI -- gateway, dashboard, and agent orchestration" → "Claude Code CLI -- AI-powered coding assistant"

### 3. `claude/README.md` — Full rebrand

- Line 1: "OpenClaw Server Setup" → "Claude Code Server Setup"
- Line 3: "OpenClaw-ready development server" → "Claude Code-ready development server"
- Line 5: docs.openclaw.ai link → docs.anthropic.com/en/docs/claude-code
- Lines 11,14: Branch refs `refs/heads/openclaw` → `refs/heads/claude-code`
- Line 27: "OpenClaw CLI | Yes | Installs the OpenClaw CLI" → "Claude Code CLI | Yes | Installs the Claude Code CLI" with updated link
- Lines 30-35: Post-install instructions → `claude` (launches OAuth auth)
- Line 53: "OpenClaw CLI | latest" → "Claude Code CLI | latest"
- Lines 65-68: Replace `openclaw onboard/gateway/dashboard` with `claude --version` and `claude`

### 4. Remove MCP server files

Delete (no longer needed — barebones script only):
- `claude/index.js`
- `claude/package.json`
- `claude/entrypoint.sh`
- `claude/.example.env`

### 5. `claude/Dockerfile` — Simplify

Keep as minimal Debian base. No MCP server references.

### 6. `docker-compose.yml` — Update for rename + simplify

- Build context: `./ubuntu` → `./claude`
- Remove port mapping (3005) and env_file since MCP server is gone.

### 7. `Makefile` — Update default sandbox name

- `SANDBOX_NAME ?= ubuntu` → `SANDBOX_NAME ?= claude`

### 8. `.github/workflows/build.yml` — Update tag pattern

- Tag filter: `ubuntu-*` → `claude-*`
- Tag parsing: update to extract from `claude-*` pattern

---

## Verification

1. `bash -n claude/setup.sh` — syntax check passes
2. `grep -ri openclaw .` — zero results (excluding .git)
3. `grep -ri ubuntu .` — no stale references (excluding .git)
4. `docker compose build claude` — builds clean
5. Container test: run setup, verify `claude --version` works
