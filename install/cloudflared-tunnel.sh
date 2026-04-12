#!/usr/bin/env bash
set -euo pipefail

# ─── Cloudflared Tunnel Setup ──────────────────────────────────────
# Creates a named tunnel, configures ingress, and routes DNS.
#
# Prerequisites:
#   - cloudflared installed (via setup.sh --cloudflared)
#   - User authenticated: cloudflared login (opens browser, saves cert.pem)
#
# Usage:
#   cloudflared-tunnel.sh <tunnel-name> <hostname> <local-port> [--run]
#
# Example:
#   cloudflared-tunnel.sh next-postgres-shadcn next-postgres-shadcn.ruska.dev 3000
#   cloudflared-tunnel.sh next-postgres-shadcn next-postgres-shadcn.ruska.dev 3000 --run

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
banner() { printf "\n${CYAN}==> %s${NC}\n" "$*"; }
ok()     { printf "${GREEN} ✓  %s${NC}\n" "$*"; }
die()    { printf "${RED}ERROR: %s${NC}\n" "$*" >&2; exit 1; }

TUNNEL_NAME="${1:?Usage: cloudflared-tunnel.sh <tunnel-name> <hostname> <local-port> [--run]}"
HOSTNAME="${2:?Usage: cloudflared-tunnel.sh <tunnel-name> <hostname> <local-port> [--run]}"
LOCAL_PORT="${3:?Usage: cloudflared-tunnel.sh <tunnel-name> <hostname> <local-port> [--run]}"
RUN_AFTER=false
[[ "${4:-}" == "--run" ]] && RUN_AFTER=true

CFLARED_DIR="$HOME/.cloudflared"

# ─── Check prerequisites ─────────────────────────────────────────
command -v cloudflared >/dev/null 2>&1 || die "cloudflared is not installed. Run setup.sh with cloudflared enabled."

if [ ! -f "$CFLARED_DIR/cert.pem" ]; then
  banner "Authenticating with Cloudflare"
  printf "  Run: cloudflared login\n"
  printf "  This opens a browser to authenticate with your Cloudflare account.\n"
  cloudflared login
fi

[ -f "$CFLARED_DIR/cert.pem" ] || die "No cert.pem found after login. Authentication may have failed."

# ─── Create tunnel (idempotent) ───────────────────────────────────
banner "Creating tunnel: $TUNNEL_NAME"
if cloudflared tunnel list | grep -q "$TUNNEL_NAME"; then
  ok "Tunnel '$TUNNEL_NAME' already exists"
  TUNNEL_ID=$(cloudflared tunnel list --output json | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id")
else
  cloudflared tunnel create "$TUNNEL_NAME"
  TUNNEL_ID=$(cloudflared tunnel list --output json | jq -r ".[] | select(.name==\"$TUNNEL_NAME\") | .id")
  ok "Tunnel '$TUNNEL_NAME' created (ID: $TUNNEL_ID)"
fi

# ─── Write config ────────────────────────────────────────────────
CREDS_FILE="$CFLARED_DIR/${TUNNEL_ID}.json"
CONFIG_FILE="$CFLARED_DIR/config-${TUNNEL_NAME}.yml"

banner "Writing config: $CONFIG_FILE"
cat > "$CONFIG_FILE" <<EOF
tunnel: $TUNNEL_ID
credentials-file: $CREDS_FILE

ingress:
  - hostname: $HOSTNAME
    service: http://localhost:$LOCAL_PORT
  - service: http_status:404
EOF
ok "Config written"

# ─── Route DNS ───────────────────────────────────────────────────
banner "Routing DNS: $HOSTNAME -> tunnel $TUNNEL_NAME"
cloudflared tunnel route dns --overwrite-dns "$TUNNEL_NAME" "$HOSTNAME" 2>/dev/null && \
  ok "DNS route set for $HOSTNAME" || \
  ok "DNS route already correct for $HOSTNAME"

# ─── Summary ─────────────────────────────────────────────────────
printf "\n${GREEN}Tunnel '$TUNNEL_NAME' is configured!${NC}\n"
printf "\n"
printf "  ${CYAN}Tunnel ID${NC}:  $TUNNEL_ID\n"
printf "  ${CYAN}Hostname${NC}:   $HOSTNAME\n"
printf "  ${CYAN}Local port${NC}: $LOCAL_PORT\n"
printf "  ${CYAN}Config${NC}:     $CONFIG_FILE\n"
printf "  ${CYAN}Creds${NC}:      $CREDS_FILE\n"
printf "\n"
printf "  ${CYAN}To run${NC}:\n"
printf "    cloudflared tunnel --config $CONFIG_FILE run $TUNNEL_NAME\n"
printf "\n"

# ─── Optionally run ──────────────────────────────────────────────
if [[ "$RUN_AFTER" == true ]]; then
  banner "Starting tunnel: $TUNNEL_NAME"
  exec cloudflared tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
fi
