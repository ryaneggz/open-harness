#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# DEPRECATED: This script is a compatibility shim.
# The heartbeat system has migrated to TypeScript.
# Use: node ~/harness/packages/sandbox/dist/src/cli/heartbeat-daemon.js <command>
# ---------------------------------------------------------------------------

echo "WARNING: heartbeat.sh is deprecated. Use the TypeScript daemon instead." >&2
echo "  node ~/harness/packages/sandbox/dist/src/cli/heartbeat-daemon.js ${1:-sync}" >&2
echo "" >&2

DAEMON_SCRIPT="${HOME}/harness/packages/sandbox/dist/src/cli/heartbeat-daemon.js"

if [ -f "$DAEMON_SCRIPT" ]; then
  exec node "$DAEMON_SCRIPT" "${@:-sync}"
else
  echo "Error: TypeScript daemon not built. Run: pnpm --filter @openharness/sandbox run build" >&2
  exit 1
fi
