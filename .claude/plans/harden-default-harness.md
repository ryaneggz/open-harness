# Plan: Minimize Attack Surface of Default Harness

## Context

The default harness image ships with an SSH server running on a well-known password, port 3000 exposed to the host, and SSH config weakened for convenience. For a basic user, none of this is needed. The goal is to maximize security and minimize attack surface by default — users who need SSH or exposed ports can opt in via compose overlays.

**Attack surface items being removed from defaults:**
- `sandbox:test1234` hardcoded password (usable for SSH login, `su`, etc.)
- `sshd -D` running as the main process with port 22 exposed
- `PasswordAuthentication yes` and `PermitUserEnvironment yes` in sshd_config
- SSH host key generation on every boot
- Port 2222:22 mapped to host
- Port 3000 mapped to host
- SSH port forwarded in VS Code devcontainer config

---

## Changes

### 1. `.devcontainer/Dockerfile` — Harden the base image

| Line | Current | Change |
|------|---------|--------|
| 65 | `echo "sandbox:test1234" \| chpasswd` | Remove — no default password. User has NOPASSWD sudo, so nothing breaks |
| 92-95 | SSH server section: `mkdir /run/sshd`, enable PasswordAuth, enable PermitUserEnvironment | Remove entirely — move to entrypoint conditional on sshd overlay |
| 108 | `EXPOSE 22` | Remove |
| 111 | `CMD ["/usr/sbin/sshd", "-D"]` | Change to `CMD ["sleep", "infinity"]` |

Keep `openssh-server` in the apt install (line 7) — the package is useful for SSH *client* operations (git clone via SSH). Having the binary on disk without running it is not an attack surface.

### 2. `.devcontainer/docker-compose.yml` — No exposed ports

- Remove `ports:` section entirely (lines 9-11: `"2222:22"` and `"${PORT:-3000}:3000"`)
- Change `command: /usr/sbin/sshd -D` → `command: sleep infinity`

### 3. `.devcontainer/entrypoint.sh` — Conditional SSH setup

**Remove from default path:**
- Lines 23-26: SSH keypair generation → move inside sshd conditional
- Lines 28-31: SSH host key generation → move inside sshd conditional

**Add sshd conditional block** that activates only when sshd is the CMD (i.e., the sshd overlay is active):
```bash
# ─── SSH server setup (only when sshd overlay is active) ──────────
if echo "$@" | grep -q sshd; then
  # Set the default password for SSH login
  echo "sandbox:test1234" | chpasswd 2>/dev/null || true
  # Configure sshd for password + environment auth
  mkdir -p /run/sshd
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config 2>/dev/null || true
  sed -i 's/#PermitUserEnvironment no/PermitUserEnvironment yes/' /etc/ssh/sshd_config 2>/dev/null || true
  # Generate SSH host keys if missing
  if [ ! -f /etc/ssh/ssh_host_rsa_key ]; then
    ssh-keygen -A
  fi
  # Generate SSH keypair if none exists
  if [ -d "/home/sandbox/.ssh" ] && [ ! -f "/home/sandbox/.ssh/id_ed25519" ]; then
    gosu sandbox ssh-keygen -t ed25519 -f /home/sandbox/.ssh/id_ed25519 -N "" -C "sandbox@$(hostname)" 2>/dev/null || true
  fi
fi
```

**Keep** the `.ssh` entry in the ownership fix loop (line 16) — the directory may still exist from the ssh-generate overlay volume and needs correct permissions for git operations.

### 4. `.devcontainer/devcontainer.json` — Remove SSH port forward

- Remove `"forwardPorts": [2222]` line

### 5. New overlay: `.devcontainer/docker-compose.sshd.yml`

```yaml
# SSH server overlay — run sshd as the main process with port 2222 mapped.
# Entrypoint auto-configures password auth and host keys when this is active.
# Add to .openharness/config.json composeOverrides to activate.
services:
  sandbox:
    ports:
      - "2222:22"
    command: /usr/sbin/sshd -D
```

### 6. ~~New overlay: `.devcontainer/docker-compose.port-forward.yml`~~ — Not needed

Port 3000 does **not** need a host-mapped overlay. Cloudflared handles external access from *within* the container (already configured via the cloudflared overlay). No host port exposure needed for any standard workflow.

### 7. `packages/sandbox/src/cli/index.ts` (lines 91-112) — Conditional port display

Change from hardcoded defaults to null-based detection:
- Initialize `sshPort` and `appPort` as `null`
- Only print SSH line if `sshPort` is detected
- Only print App line if `appPort` is detected
- Always print Shell line

### 8. `install.sh` (line 97) — Remove SSH instruction

Replace hardcoded SSH line with `openharness shell` as primary entry method, and a note that SSH is available with the sshd overlay.

### 9. Documentation updates

| File | Change |
|------|--------|
| `docs/pages/guide/overlays.mdx` | Add `sshd.yml` to overlay table; add section explaining SSH daemon vs SSH key overlays |
| `docs/pages/architecture/how-it-works.mdx` (line 17, 22) | Update: "Generates SSH keypair/host keys if needed" → conditional; "Execs the SSH server" → "Execs default command (`sleep infinity`)" |
| `docs/pages/getting-started/quickstart.mdx` (lines 30-49) | Move credentials table and Remote-SSH config under "SSH access (optional)" heading, note sshd overlay requirement |
| `README.md` (lines 53-57, 82) | Remove password/SSH port from credentials table; add `sshd` to available overlays list |
| `.claude/skills/provision/SKILL.md` | Add `sshd` to overlay checklist; update SSH section |

### 10. `install.sh` — Docker-only install path (node-less)

Current `install.sh` requires Node 20+ and pnpm on the host to build the openharness CLI. But once the devcontainer is running, everything is inside the container — Docker is the only host prerequisite.

**Restructure `install.sh` into two modes:**

**Default (Docker-only)** — prerequisites: `docker`, `git`
1. Check `docker` and `docker compose` are available
2. Check `git` is available
3. **Prompt for configuration:**
   - Container name (default: repo directory name, falls back to `sandbox`)
   - Password (default: `changeme`) — written to `.env` as `SANDBOX_PASSWORD`
4. Clone the repo (or detect we're already inside it)
5. Write `.env` with `SANDBOX_NAME=<name>` and `SANDBOX_PASSWORD=<password>`
6. Run `docker compose -f .devcontainer/docker-compose.yml up -d --build`
7. Wait for the container to be healthy
8. Print success + how to enter: `docker exec -it -u sandbox <name> bash`

**`--with-cli` flag** — prerequisites: `docker`, `git`, `node 20+`, `pnpm`
9. (Only with flag) Check Node 20+, ensure pnpm, build + link `openharness` CLI on host
10. Print the `openharness shell` / `openharness sandbox` commands

This way the **default install only needs Docker** — the entrypoint already builds the openharness CLI inside the container (entrypoint.sh lines 43-54). The `--with-cli` flag is for power users who want the CLI on the host too.

**Next-steps output** should reflect which mode was used:
- Docker-only: show `docker exec` entry
- With CLI: show `openharness shell` entry

### 10b. Configurable password via `SANDBOX_PASSWORD` env var

**docker-compose.yml** — add to environment section:
```yaml
- SANDBOX_PASSWORD=${SANDBOX_PASSWORD:-changeme}
```

**entrypoint.sh** — the sshd conditional block sets the password from the env var:
```bash
if echo "$@" | grep -q sshd; then
  echo "sandbox:${SANDBOX_PASSWORD:-changeme}" | chpasswd 2>/dev/null || true
  ...
fi
```

The password is **never baked into the image** — it's set at runtime from the environment variable, only when the sshd overlay is active. Default is `changeme` (not the old `test1234`).

**Container name** is already configurable via `SANDBOX_NAME` env var in docker-compose.yml (line 1 and 5). The install script just needs to write it to `.env`.

### 11. `.openharness/config.json` — Remove `ssh-generate` from defaults

Remove `".devcontainer/docker-compose.ssh-generate.yml"` from the default `composeOverrides`. Git authentication is handled via `gh auth setup-git` (GitHub CLI is already installed in the base image and `gh-config` volume persists auth). No SSH keys needed for git. Users who specifically need SSH keys add the overlay explicitly.

---

## Security summary

| Item | Before | After |
|------|--------|-------|
| Default password | `test1234` baked into image | No password in image; configurable via `SANDBOX_PASSWORD` env var (default `changeme`), set at runtime only with sshd overlay |
| SSH server | Always running as PID 1 | Not running; opt-in via `sshd.yml` overlay |
| SSH config weakening | Baked into image (`PasswordAuthentication yes`, `PermitUserEnvironment yes`) | Applied at runtime only with sshd overlay |
| Port 22 exposed | Always | Never by default; opt-in via overlay |
| Port 3000 exposed to host | Always mapped to host | Never; cloudflared exposes from within the container |
| SSH host keys | Generated on every boot | Generated only when sshd overlay active |
| SSH user keypair | Generated on every boot | Generated only when sshd overlay active |
| Default overlays | Includes `ssh-generate` | Removed; git auth uses `gh auth setup-git` instead |

---

## Verification

1. Build default image: `docker compose -f .devcontainer/docker-compose.yml build`
2. Confirm no password: `docker run --rm <image> grep sandbox /etc/shadow` — should show `!` or `*` (locked)
3. Confirm no sshd_config mods: `docker run --rm <image> grep PasswordAuthentication /etc/ssh/sshd_config` — should show `#PasswordAuthentication yes` (commented)
4. Confirm no ports: `docker compose -f .devcontainer/docker-compose.yml config` — no `ports` key
5. Confirm `sleep infinity` CMD
6. Test sshd overlay: add `docker-compose.sshd.yml` → SSH login with `test1234` works
7. Test full overlay stack: add sshd + existing overlays → full functionality restored
