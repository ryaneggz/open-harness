---
name: cloudflared-tunnel
description: |
  Create and configure a Cloudflare tunnel: named tunnel, ingress config,
  DNS routing, and optional immediate run. Idempotent — safe to re-run
  on an existing tunnel.
  TRIGGER when: asked to create, set up, or configure a Cloudflare tunnel,
  or expose a local service via Cloudflare.
argument-hint: "<tunnel-name> <hostname> <local-port> [--run]"
---

# Cloudflared Tunnel

Create a named Cloudflare tunnel, write its ingress config, route DNS, and optionally start it.

## Instructions

### Step 1 — Parse arguments

Arguments received: `$ARGUMENTS`

- **TUNNEL_NAME**: `$0` (required)
- **HOSTNAME**: `$1` (required)
- **LOCAL_PORT**: `$2` (required)
- **RUN_AFTER**: `true` if `--run` flag is present, otherwise `false`

If any required argument is missing, ask the user to provide it. Suggest defaults:
- Tunnel name: derived from the project or sandbox name
- Hostname: `<tunnel-name>.ruska.dev`
- Local port: `3000`

### Step 2 — Check prerequisites

```bash
command -v cloudflared >/dev/null 2>&1 && echo "cloudflared: installed" || echo "cloudflared: NOT FOUND"
```

If cloudflared is not installed, **stop** and tell the user to install it (`setup.sh --cloudflared` or the system package manager).

```bash
ls ~/.cloudflared/cert.pem 2>/dev/null && echo "cert.pem: found" || echo "cert.pem: NOT FOUND"
```

If `cert.pem` is missing, tell the user they need to authenticate first:

```
Run: cloudflared login
This opens a browser to authenticate with your Cloudflare account.
```

**Do not proceed** until both prerequisites are met.

### Step 3 — Create tunnel (idempotent)

Check if the tunnel already exists:

```bash
cloudflared tunnel list 2>/dev/null | grep "$TUNNEL_NAME" || echo "NOT FOUND"
```

If the tunnel exists, extract its ID:

```bash
TUNNEL_ID=$(cloudflared tunnel list --output json | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id")
echo "Tunnel ID: $TUNNEL_ID"
```

If the tunnel does not exist, create it:

```bash
cloudflared tunnel create "$TUNNEL_NAME"
TUNNEL_ID=$(cloudflared tunnel list --output json | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id")
echo "Tunnel ID: $TUNNEL_ID"
```

### Step 4 — Write config

Write the ingress config to `~/.cloudflared/config-<tunnel-name>.yml`:

```bash
CREDS_FILE="$HOME/.cloudflared/${TUNNEL_ID}.json"
CONFIG_FILE="$HOME/.cloudflared/config-${TUNNEL_NAME}.yml"

cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDS_FILE

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$LOCAL_PORT
  - service: http_status:404
EOF

echo "Config written: $CONFIG_FILE"
```

### Step 5 — Route DNS

```bash
cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$HOSTNAME" 2>/dev/null && \
  echo "DNS route set for $HOSTNAME" || \
  echo "DNS route already correct for $HOSTNAME"
```

### Step 6 — Report

```
Tunnel '$TUNNEL_NAME' is configured!

  Tunnel ID:  $TUNNEL_ID
  Hostname:   $HOSTNAME
  Local port: $LOCAL_PORT
  Config:     $CONFIG_FILE
  Creds:      $CREDS_FILE

  To run:
    cloudflared tunnel --config $CONFIG_FILE run $TUNNEL_NAME
```

### Step 7 — Optionally run

If `--run` was passed, start the tunnel:

```bash
cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
```

This is a long-running process. Tell the user the tunnel is running and how to stop it (Ctrl+C).
