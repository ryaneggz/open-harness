/**
 * Step 5/6 — Cloudflare Tunnel. Port of `install/onboard.sh:359-413`.
 *
 *   - `cloudflared` not on PATH → skipped.
 *   - `~/.cloudflared/config-*.yml` exists and !force → done.
 *   - No `cert.pem`: prompt; "n" → skipped; "y" → run `cloudflared login`.
 *   - With cert.pem: collect tunnel name / hostname / local port, delegate to
 *     `install/cloudflared-tunnel.sh`, record done.
 */

import type { Step, StepResult } from "../types.js";

const DEFAULT_PORT = "3000";

export const cloudflareStep: Step = {
  id: "cloudflare",
  label: "Step 5/6 — Cloudflare Tunnel",
  async run(deps, opts): Promise<StepResult> {
    const { io, fs, exec, home } = deps;

    if (!exec.which("cloudflared")) {
      io.skip("cloudflared not installed — skipping");
      return { id: "cloudflare", status: "skipped" };
    }

    const configDir = `${home}/.cloudflared`;
    const existingConfig = findFirstConfig(deps, configDir);

    if (existingConfig && !opts.force) {
      const tunnelName = existingConfig.replace(/^.*\/config-/, "").replace(/\.yml$/, "");
      io.ok(`Tunnel '${tunnelName}' already configured`);
      return { id: "cloudflare", status: "done" };
    }

    const certPath = `${configDir}/cert.pem`;
    if (!fs.exists(certPath)) {
      const answer = await io.ask("Set up Cloudflare tunnel now? [y/N]:");
      if (!/^[Yy]$/.test(answer)) {
        io.skip("Skipped — to set up later, run:");
        io.raw("      cloudflared login\n");
        io.raw("      /cloudflared-tunnel <name> <hostname> 3000\n");
        return { id: "cloudflare", status: "skipped" };
      }
      io.raw("\n  Running: \x1b[0;36mcloudflared login\x1b[0m\n");
      io.raw("  (Copy the URL below and open it in a browser)\n\n");
      exec.runSafe(["cloudflared", "login"]);
    }

    if (!fs.exists(certPath)) {
      io.fail("Cloudflare login failed");
      return { id: "cloudflare", status: "failed" };
    }

    io.ok("Cloudflare authenticated");

    const tunnelName = (await io.ask("Tunnel name (default: open-harness):")) || "open-harness";
    const tunnelHost =
      (await io.ask(`Public hostname (default: ${tunnelName}.ruska.dev):`)) ||
      `${tunnelName}.ruska.dev`;
    const tunnelPort = (await io.ask("Local port (default: 3000):")) || DEFAULT_PORT;

    io.raw("\n");
    exec.run(["bash", `${home}/install/cloudflared-tunnel.sh`, tunnelName, tunnelHost, tunnelPort]);
    return { id: "cloudflare", status: "done" };
  },
};

/**
 * List `config-*.yml` files under {@link configDir} using the in-memory fs.
 * Real deps don't implement `readdir`, so we use `ls` via exec.capture.
 */
function findFirstConfig(
  deps: {
    fs: { exists(p: string): boolean };
    exec: { capture(cmd: string[]): { status: number; stdout: string } };
  },
  configDir: string,
): string | null {
  if (!deps.fs.exists(configDir)) return null;
  const res = deps.exec.capture(["sh", "-c", `ls ${configDir}/config-*.yml 2>/dev/null | head -1`]);
  const first = res.stdout.trim().split("\n")[0] ?? "";
  return first.length > 0 ? first : null;
}
