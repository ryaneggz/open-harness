/**
 * Step 6/6 — Claude Code. Port of `install/onboard.sh:418-438`.
 *
 * Behavior:
 *   - If `~/.claude/.credentials.json` OR `~/.claude/credentials.json` exists,
 *     record "done" and return.
 *   - Else prompt; a "n" answer → "skipped"; anything else → run
 *     `claude --version` (best-effort) and record "done".
 */

import type { Step } from "../types.js";

export const claudeStep: Step = {
  id: "claude",
  label: "Step 6/6 — Claude Code",
  async run(deps): Promise<{ id: "claude"; status: "done" | "skipped" }> {
    const { fs, home, io, exec } = deps;
    const cred1 = `${home}/.claude/.credentials.json`;
    const cred2 = `${home}/.claude/credentials.json`;

    if (fs.exists(cred1) || fs.exists(cred2)) {
      io.ok("Claude Code already authenticated");
      return { id: "claude", status: "done" };
    }

    io.raw("  Claude Code requires authentication on first run.\n");
    io.raw("  This will open a browser for Anthropic OAuth.\n\n");
    const answer = await io.ask("Authenticate now? [Y/n]:");
    if (/^[Nn]$/.test(answer)) {
      io.skip("Skipped — run 'claude' later to authenticate");
      return { id: "claude", status: "skipped" };
    }

    io.raw("\n  Running: \x1b[0;36mclaude --version\x1b[0m (triggers auth check)\n\n");
    const versionOk = exec.runSafe(["claude", "--version"]);
    if (versionOk) {
      io.ok("Claude Code ready");
    } else {
      io.warn("Run 'claude' manually to complete auth");
    }
    return { id: "claude", status: "done" };
  },
};
