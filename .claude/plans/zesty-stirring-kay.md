# Plan: README overhaul + curl install script

## Context

The README.md has 12 identified inaccuracies after the npm-to-pnpm migration and docker/ directory removal. It references deleted files, has wrong directory trees, missing CLI flags, and no one-command install. The user wants it aligned with the codebase and wants a curl-style install like Claude Code's `curl -fsSL https://... | sh`.

## Tasks

### T1: Create `install.sh` at repo root
**Files**: `install.sh` (new)
**Depends on**: none

A shell script that:
1. Checks for Node.js >=20 (exits with helpful message if missing)
2. Checks for git
3. Enables corepack and activates pnpm
4. Clones repo to `~/.openharness` (or uses existing clone)
5. Runs `pnpm install && pnpm -r run build && pnpm link --global ./cli`
6. Verifies `openharness` is on PATH
7. Prints success message with next steps

Pattern: `curl -fsSL https://raw.githubusercontent.com/ryaneggz/open-harness/main/install.sh | sh`

### T2: Rewrite README.md — Quickstart and Prerequisites
**Files**: `README.md` (lines 1-55)
**Depends on**: T1

- Add curl one-liner as primary install method
- Keep git clone + `pnpm run setup` as alternative
- Fix prerequisites: Node.js v20+, Docker, pnpm via corepack
- Keep the "More example agents" table and cleanup section

### T3: Rewrite README.md — Structure section
**Files**: `README.md` (lines 199-228)
**Depends on**: none

Remove all `docker/` references. Update tree to match reality:
```
├── .devcontainer/          # Orchestrator dev container + sandbox Dockerfile
│   ├── Dockerfile          # Sandbox image: Debian + Node 22 + agent CLIs
│   ├── docker-compose.yml  # Base compose
│   ├── docker-compose.*.yml # Overlays: postgres, cloudflared, docker, ssh, etc.
│   └── entrypoint.sh       # Docker GID matching + heartbeat sync
├── cli/                    # openharness CLI (TypeScript)
├── packages/sandbox/       # @openharness/sandbox (Docker + worktree tools)
├── install/
│   ├── setup.sh            # Container provisioning (runs as root)
│   ├── heartbeat.sh        # Cron heartbeat runner
│   └── entrypoint.sh       # Sandbox container entrypoint
├── workspace/              # Template workspace for all agents
└── .github/workflows/      # CI: Harness, CI: next-postgres-shadcn, Release, Build
```

### T4: Rewrite README.md — How It Works section
**Files**: `README.md` (lines 230-254)
**Depends on**: none

Fix all `docker/Dockerfile` → `.devcontainer/Dockerfile` references. Update descriptions:
1. `.devcontainer/Dockerfile` creates the sandbox image
2. `.devcontainer/docker-compose.yml` + overlays handle service composition
3. `install/setup.sh` provisions tools (mention pnpm via corepack, not npm)
4. `workspace/AGENTS.md` provides agent context (symlinked to CLAUDE.md)

### T5: Rewrite README.md — CLI Commands and Configuration
**Files**: `README.md` (lines 256-294)
**Depends on**: none

- Add missing CLI flags: `--tag`, `--branch`
- Add `openharness install` command (installs Pi packages)
- Fix Configuration section: add Mom and Cloudflared to interactive prompts list
- All commands use pnpm (already done in prior migration)

### T6: Update README.md — Releases and Key Benefits
**Files**: `README.md` (lines 86-100, 375-386)
**Depends on**: none

- Fix "Reproducibility" row: `docker/Dockerfile` → `.devcontainer/Dockerfile`
- Fix "CI/CD ready" row: mention both CI workflows (Harness + next-postgres-shadcn)
- Releases section: clarify CalVer increment format

## Verification

1. `cat install.sh` and verify it's valid bash, handles edge cases
2. Read final README.md end-to-end for broken references
3. `grep 'docker/' README.md` should return zero hits (except Docker the tool)
4. `grep 'npm ' README.md` should return zero hits
5. Verify install.sh is executable: `bash -n install.sh` (syntax check)
