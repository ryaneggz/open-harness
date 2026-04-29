---
sidebar_position: 2
title: "Installation"
---

# Installation

Open Harness has two components: the sandbox image (Docker-only) and the optional `oh` host CLI. Most users need both. This page covers all installation paths.

## Prerequisites

| Dependency | Required for | Install |
|---|---|---|
| Docker (with Compose plugin) | Sandbox image | [docs.docker.com/get-docker](https://docs.docker.com/get-docker/) |
| git | Cloning the repo | [git-scm.com](https://git-scm.com/) |
| Node.js 20+ | `oh` host CLI (recommended) | [nodejs.org](https://nodejs.org/) |
| pnpm | Building the host CLI | `npm install -g pnpm` |

Node.js 20+ is **recommended but not required**. If it is absent, the installer offers to install Node 22 via nvm or to fall back to a Docker-only sandbox — you choose at the prompt.

## One-line installer (recommended)

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

This checks for Docker and git, prompts for a container name, clones the repo, and starts the sandbox. No Node.js required.

The installer detects whether Node.js 20+ is present and branches accordingly:

- **Node 20+ found** — CLI-first path. Builds and links the `oh` binary on the host.
- **Node missing or too old** — Interactive 3-way prompt:
  1. Install Node 22 via nvm, then the CLI (default).
  2. Continue Docker-only.
  3. Abort.

See the [install.sh spec](https://github.com/ryaneggz/open-harness/blob/main/.claude/specs/install-prereq-detection.md) for the full decision flow.

### Override auto-detection

Pass flags to skip the prompt and force a specific path:

| Flag / Variable | Effect |
|---|---|
| `--cli` | Force CLI-first. Hard-fails if Node 20+ is absent (does not auto-install nvm). |
| `--docker-only` (alias `--no-cli`) | Force Docker-only. Skips Node detection. |
| `--install-node` | Force nvm + Node 22 install, then CLI. Skips detection. |
| `-y` / `--yes` | Accept the default at every prompt (installs Node via nvm if absent). |
| `-n` / `--no` | Abort at every prompt. |
| `--yes --docker-only` | Non-interactive Docker-only install. |
| `OH_INSTALL_REF=<git-ref>` | Pin the cloned repo to a specific tag or SHA instead of `main`. |
| `OH_ASSUME_YES=1` | Same as `--yes`. |

If `SANDBOX_NAME` is set in the environment, the installer skips that prompt. The sandbox passphrase prompt resolves independently.

### Deprecated flag

`--with-cli` is a deprecated alias for `--cli`. It still works and prints a deprecation warning directing you to use `--cli` instead.

## Manual installation

Use this path when you want more control or are setting up a CI environment.

### 1. Clone the repository

```bash
git clone https://github.com/ryaneggz/open-harness.git
cd open-harness
```

### 2. Configure the environment

```bash
cp .devcontainer/.example.env .devcontainer/.env
```

Edit `.devcontainer/.env` and set your `SANDBOX_NAME` and any optional tokens. See the comments in `.example.env` for all available variables.

### 3. Install Node dependencies

```bash
pnpm install
```

This installs workspace dependencies for all packages under `packages/` and `apps/`.

### 4. Build the CLI

```bash
pnpm build
```

This compiles the `@openharness/sandbox` package (TypeScript to ESM) and any other workspace packages.

### 5. Link the CLI globally

```bash
cd packages/sandbox && pnpm link --global && cd ../..
```

After linking, `oh` and `openharness` are available as host commands. They are aliases for the same binary.

### 6. Verify

```bash
oh --version
```

Expected output (version will vary):

```
openharness 0.1.0 (pi x.y.z)
```

## Docker-only manual fallback

If you only have Docker and git — no Node, no pnpm — and prefer not to use the installer, you can manage Open Harness directly with `docker compose`. This is the manual equivalent of the installer's `--docker-only` path:

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
cp .devcontainer/.example.env .devcontainer/.env
# Edit .devcontainer/.env: set SANDBOX_NAME and any optional tokens
docker compose -f .devcontainer/docker-compose.yml up -d --build
docker compose -f .devcontainer/docker-compose.yml exec -u orchestrator sandbox zsh
```

In this mode you manage the sandbox lifecycle with `docker compose` commands directly rather than the `oh` CLI. The one-line installer's `--docker-only` flag automates these same steps. The one-line installer's `--docker-only` flag automates these same steps.

## Next step

Once installed, proceed to the [Quickstart](./quickstart) to provision your first sandbox and open a shell.
