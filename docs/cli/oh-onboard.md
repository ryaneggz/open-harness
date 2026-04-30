---
sidebar_position: 2
title: "oh onboard"
---

# oh onboard

The canonical binary is `openharness`; `oh` is the alias used in all examples below.

## Purpose

`oh onboard` is the first-time setup wizard for a sandbox. It configures SSH keys, GitHub CLI authentication, Cloudflare tunnel credentials, LLM provider settings, and Claude Code auth, then starts the dev server. The wizard tracks which steps have already completed and skips them on subsequent runs unless `--force` is passed. Individual steps can be run in isolation by passing the step name as a positional argument.

## Usage

```bash
oh onboard [name|step] [--force]
```

If `name` is omitted, onboarding targets the sandbox whose name is defined in `.devcontainer/.env` (the `SANDBOX_NAME` variable). If the first positional argument matches a recognised step name, it is treated as `only` instead of `name`, and only that step runs.

Recognised steps (the `only` values): `llm`, `slack`, `ssh`, `github`, `cloudflare`, `claude`.

## Examples

```bash
# Full wizard — all steps, skip already-completed ones
oh onboard my-agent

# Full wizard on the default sandbox
oh onboard

# Re-run every step even if already marked done
oh onboard --force

# Run only the GitHub authentication step
oh onboard github

# Run only the Slack integration step on a named sandbox
oh onboard my-agent slack
```

## Flags

| Flag | Type | Description |
|------|------|-------------|
| `--force` | boolean | Re-verify all steps even if already onboarded |

The step names (`llm`, `slack`, `ssh`, `github`, `cloudflare`, `claude`) are positional, not flags.

## Related Commands

- [oh sandbox](./oh-sandbox.md) — provision and start the container before onboarding
- [oh shell](./oh-shell.md) — enter the container after onboarding is complete
- [CLI Overview](./overview.md) — full command list

## Troubleshooting

**Onboarding exits with "did not complete successfully"**
Check that the sandbox container is running (`oh list`). Onboarding spawns commands inside the container; if the container is stopped the steps cannot execute.

**A step fails partway through and the marker is written**
Use `--force` to re-run all steps regardless of prior completion state. Alternatively, pass the specific step name to re-run only the failing step (e.g., `oh onboard github`).

**LLM step fails with an API key error**
The `llm` step reads provider credentials from `.devcontainer/.env`. Verify the relevant `*_API_KEY` variable is set before running onboarding.

**Cloudflare step hangs**
The `cloudflare` step requires `cloudflared` to be installed in the container. If the devcontainer image was built before `cloudflared` was added to the Dockerfile, rebuild with `oh sandbox --force` first.
