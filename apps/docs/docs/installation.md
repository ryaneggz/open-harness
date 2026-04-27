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
| Node.js 20+ | `oh` host CLI only | [nodejs.org](https://nodejs.org/) |
| pnpm | Building the host CLI | `npm install -g pnpm` |

Node.js and pnpm are only required if you want the `oh` CLI on your host machine. Everything else runs inside Docker.

## One-line installer (recommended)

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

This checks for Docker and git, prompts for a container name, clones the repo, and starts the sandbox. No Node.js required.

To also install the `oh` CLI on the host:

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash -s -- --with-cli
```

The installer then checks for Node.js 20+ and pnpm, builds the `@openharness/sandbox` package, and links the `oh` binary globally.

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

## Docker-only path (no CLI)

If you only have Docker and git — no Node, no pnpm — you can still run Open Harness:

```bash
git clone https://github.com/ryaneggz/open-harness.git && cd open-harness
cp .devcontainer/.example.env .devcontainer/.env
# Edit .devcontainer/.env: set GH_TOKEN and optionally SANDBOX_NAME
docker compose -f .devcontainer/docker-compose.yml up -d --build
docker compose -f .devcontainer/docker-compose.yml exec -u sandbox sandbox zsh
```

In this mode you manage the sandbox lifecycle with `docker compose` commands directly rather than the `oh` CLI.

## Next step

Once installed, proceed to the [Quickstart](./quickstart) to provision your first sandbox and open a shell.
