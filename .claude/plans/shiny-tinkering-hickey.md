# Plan: Fix broken public URL

## Context
The public URL (`next-postgres-shadcn.ruska.dev`) is down because `startup.sh` died at prisma generate (stale `src/generated/prisma` dir) and never reached the cloudflared tunnel step. The tunnel uses a hardcoded `TUNNEL_TOKEN` in `workspace/startup.sh:87` — no config file or `cloudflared tunnel login` needed.

## Steps

1. Start cloudflared inside the container using the token from startup.sh:
   ```bash
   docker exec -u sandbox next-postgres-shadcn bash -c '
     TUNNEL_TOKEN="***REMOVED***";
     nohup cloudflared tunnel --url http://localhost:3000 run --token "$TUNNEL_TOKEN" > /tmp/cloudflared.log 2>&1 &
   '
   ```

2. Re-run test:setup to confirm 8/8 pass.

## Root cause fix
Also fix startup.sh so prisma generate doesn't fail on a non-empty `src/generated/prisma` directory — clear it before generating:
- **File:** `workspace/startup.sh:63-65`
- Add `rm -rf src/generated/prisma` before `npx prisma generate`

## Verification
- `curl -sf https://next-postgres-shadcn.ruska.dev` returns 200
- `npm run test:setup` passes 8/8
