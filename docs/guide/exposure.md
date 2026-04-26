---
title: "Exposing apps"
---

# Exposing apps

`openharness expose <name> <port>` routes a sandbox app through a
[Caddy](https://caddyserver.com/) reverse proxy running as a sidecar
container on the sandbox's docker network. One command, two
deployment shapes — laptop and cloud — with the URL shape decided by
host mode, not a flag.

## Laptop mode (default)

No configuration required. Caddy serves the app with an internal CA
certificate on a `*.localhost` hostname.

```bash
# Start a dev server inside the sandbox (in a named tmux session — see below).
tmux new-session -d -s app-docs 'pnpm dev -p 8080'

# Route to it from the host.
openharness expose docs 8080
# → Route: https://docs.oh-local.localhost:8443
```

Open `https://docs.oh-local.localhost:8443` in a browser. The first
time, you'll need to trust the internal CA certificate (once per
host):

```bash
docker exec -u root oh-local-gateway caddy trust
```

From that point on, every `<name>.<sandbox>.localhost` route is
green-lock.

## Remote mode

On a cloud VM, set `PUBLIC_DOMAIN` (and optionally `ACME_EMAIL`) in
`.devcontainer/.env`:

```bash
PUBLIC_DOMAIN=harness.example.com
ACME_EMAIL=you@example.com
```

The same `expose` command now produces a real public URL:

```bash
openharness expose docs 8080
# → Route: https://docs.oh-local.harness.example.com
```

Caddy acquires a certificate automatically:

- **Direct ACME**: if the VM has :80/:443 reachable from the internet,
  Caddy handles HTTP-01 or TLS-ALPN challenges.
- **Cloudflare named tunnel** (behind NAT or with Access gating): use
  the [`/cloudflared-tunnel`](../architecture/overview.md) skill to
  configure a persistent tunnel that terminates at the gateway. Point
  the tunnel's ingress at `http://gateway:443`.

Either path requires wildcard DNS pointing `*.<sandbox>.<PUBLIC_DOMAIN>`
to the VM (or to Cloudflare).

## Inspecting routes

```bash
openharness ports
#
# Ports for sandbox 'oh-local':
#   PORT   LISTENING  LABEL        URL                                       PROCESS
#   ────   ─────────  ───────────  ────────────────────────────────────────  ────────────────────────
#   8080   yes        docs         https://docs.oh-local.localhost:8443      next-server (pid 35374)
#   3000   yes        —            —                                         node (pid 42111)
```

Rows with a `LABEL` are routed through Caddy. Rows without are just
listeners that haven't been routed yet.

## Removing a route

```bash
openharness unexpose docs
# → Route 'docs' removed.
```

## Opening a URL

```bash
openharness open docs   # or: openharness open 8080
```

Tries `xdg-open` then `open`; falls back to printing the URL.

## Invariants

The routing layer enforces a short list of rules — see
[`.claude/rules/gateway-routing.md`](https://github.com/ryaneggz/open-harness/blob/main/.claude/rules/gateway-routing.md)
for the full list:

- The Caddyfile is generated; never hand-edit `.openharness/Caddyfile`.
- Route names match `/^[a-z][a-z0-9-]{0,30}$/`. Reserved: `admin`,
  `www`, `gateway`, `api-internal`.
- Cross-sandbox uniqueness is automatic — the hostname always includes
  the sandbox name.
- `expose` never recreates the container. Reload is hot, in-process.

## Related: app lifecycle

Every long-running process inside a sandbox should run inside a named
`tmux` session — dev servers, agents, workers, tunnels. Related apps
belong in the same session as stacked panes. See
[`.claude/rules/sandbox-processes.md`](https://github.com/ryaneggz/open-harness/blob/main/.claude/rules/sandbox-processes.md)
for the full convention.

Example — a docs site with frontend + API + worker in one session:

```bash
tmux new-session  -d  -s app-docs-site 'pnpm --filter web dev      2>&1 | tee /tmp/app-docs-site.web.log'
tmux split-window -t app-docs-site     'pnpm --filter api dev      2>&1 | tee /tmp/app-docs-site.api.log'
tmux split-window -t app-docs-site     'pnpm --filter worker start 2>&1 | tee /tmp/app-docs-site.worker.log'
tmux select-layout -t app-docs-site even-vertical
```

Route each from the host:

```bash
openharness expose docs 3000
openharness expose api  3001
openharness expose worker 3002
```

## Troubleshooting

**`caddy reload failed`**  
The gateway container isn't running yet. Run `openharness run`. The
gateway overlay is activated on the first `expose` call but the
container needs a compose up to actually start.

**Browser shows "not secure" / cert warning (laptop mode)**  
Trust the internal CA once:
`docker exec -u root <sandbox>-gateway caddy trust`.

**`*.localhost` doesn't resolve**  
Almost every OS and browser resolves `*.localhost` to 127.0.0.1
automatically. If corporate DNS intercepts this, add a line to
`/etc/hosts`:

```
127.0.0.1 docs.oh-local.localhost api.oh-local.localhost
```

**Nothing listens on the port yet**  
`expose` adds the route anyway and warns. Start the app (in tmux) and
the route becomes live instantly — no reload needed.
