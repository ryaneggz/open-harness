# Gateway & Exposure Routing

## Source of Truth

Caddy is the only in-network reverse proxy for sandbox app exposure. Routes
live in `.openharness/Caddyfile`, regenerated from `exposures.json` by
`oh expose` / `oh unexpose`. Never hand-edit the Caddyfile — it is gitignored
and overwritten on every reload.

## Primary CLI

`oh expose <name> <port>` is the command developers type. The URL shape is a
function of host mode, not a CLI flag:

- Laptop (no `PUBLIC_DOMAIN`): `https://<name>.<sandbox>.localhost:8443`
  with `tls internal`.
- Remote (`PUBLIC_DOMAIN` set in `.devcontainer/.env`):
  `https://<name>.<sandbox>.<PUBLIC_DOMAIN>` with ACME or a Cloudflare named
  tunnel.

## Invariants

1. Caddy admin API is bound to `127.0.0.1:2019` only. Never publish to `0.0.0.0`.
2. Remote mode MUST use real TLS. Refuse to generate a route in remote mode
   if `tls internal` would be the only option.
3. Route names match `/^[a-z][a-z0-9-]{0,30}$/` and are not in the reserved
   set (`admin`, `www`, `gateway`, `api-internal`).
4. Liveness is an HTTP probe, not a tmux-session check. Use `httpProbe(url)`
   from `lib/caddy.ts` — `isQuickTunnelAlive` alone is insufficient.
5. The gateway overlay is opt-in via `SandboxConfig.addOverride(...)` — same
   pattern as every other overlay. Never force-enable.
6. `oh expose` never calls `docker compose up --force-recreate`. The
   gateway reloads in-process; recreating the sandbox would kill running
   dev servers.
7. Cross-sandbox route collisions (two sandboxes exposing `docs`) are
   resolved by including the sandbox name in the hostname — always. Do not
   strip it to shorten URLs.

## Tests

Changes to `tools/expose.ts`, `tools/unexpose.ts`, or `lib/caddy.ts` require
updated unit tests. Caddyfile rendering is golden-tested via snapshot.
