---
title: "Installation"
---


**Prerequisites:** [Docker](https://docs.docker.com/get-docker/) and [git](https://git-scm.com/). Node.js 20+ is recommended but not required — the installer offers to install it via nvm if absent.

## One-line install

```bash
curl -fsSL https://oh.mifune.dev/install.sh | bash
```

The installer detects whether Node.js 20+ is present. If found, it builds and links the `oh` CLI on the host (CLI-first, no container started). If Node is missing or too old, it shows a 3-way prompt: install Node 22 via nvm and the CLI (default), continue Docker-only, or abort.

## Override auto-detection

Pass flags to force a specific install path:

| Flag / Variable | Effect |
|---|---|
| `--cli` | Force CLI-first (Node must be present). |
| `--docker-only` | Force Docker-only, skip Node detection. |
| `--install-node` | Force nvm + Node 22 install, then CLI. |
| `--yes` | Accept defaults at all prompts. |
| `--yes --docker-only` | Non-interactive Docker-only install. |
| `OH_INSTALL_REF=<git-ref>` | Pin the cloned repo to a specific tag or SHA instead of `main`. |
| `SANDBOX_NAME=<name>` | Skip the "Container name" prompt. |
| `SANDBOX_PASSWORD=<value>` | Skip the credential prompt (used by the optional sshd overlay). |

The two `SANDBOX_*` env vars resolve **independently** — set one without the other and the missing prompt still fires (or defaults under no TTY).

`--with-cli` is a deprecated alias for `--cli` and still works with a warning.

## Manual install

```bash
git clone https://github.com/ryaneggz/open-harness.git
cd open-harness
cp .devcontainer/.example.env .devcontainer/.env   # configure name, password, etc.
docker compose -f .devcontainer/docker-compose.yml up -d --build
```

Or [fork the repo](https://github.com/ryaneggz/open-harness/fork) first for your own customizations.

## What the installer does

1. Checks for Docker (with Compose plugin) and git
2. Prompts for container name and password
3. Clones the repo to `~/.openharness/` (or uses the local repo)
4. Writes `.devcontainer/.env` with your configuration
5. Runs `docker compose up -d --build`
6. _(CLI-first paths)_ Checks Node.js 20+, installs pnpm, builds and globally links the `openharness` CLI

## Next step

Once installed, [configure your environment](../guide/configuration.md) or jump straight to the [quickstart](./quickstart.md).
