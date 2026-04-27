/**
 * Step 4/6 — SSH Key.
 *
 * Runs after GitHub CLI so that `gh auth login` has had the chance to
 * generate and upload a key. In the common path the key is already on disk
 * and registered with GitHub, so this step is pure verification.
 *
 *   - If `~/.ssh/id_ed25519.pub` exists, print it and run `ssh -T git@github.com`
 *     to verify GitHub access:
 *       - "successfully authenticated" in output → done
 *       - otherwise → prompt user to add the key, wait for Enter, re-verify.
 *   - Else (user declined SSH at the `gh` prompt), generate a new key with
 *     `ssh-keygen -t ed25519 -N ""`, print it, instruct the user to add it
 *     to GitHub, wait for Enter, return done.
 */

import type { Step, StepResult } from "../types.js";
import { ORCHESTRATOR_USER } from "../../lib/config.js";

const GH_MARKER = "successfully authenticated";

function combine(result: { stdout: string; stderr: string }): string {
  return `${result.stdout}\n${result.stderr}`;
}

export const sshStep: Step = {
  id: "ssh",
  label: "Step 4/6 — SSH Key",
  async run(deps): Promise<StepResult> {
    const { io, fs, exec, home } = deps;
    const keyPath = `${home}/.ssh/id_ed25519`;
    const pubPath = `${keyPath}.pub`;

    const printKey = (): void => {
      const pub = fs.readFile(pubPath).trim();
      io.raw(`\n  Public key:\n    \x1b[0;36m${pub}\x1b[0m\n`);
    };

    const verifyGithub = (): boolean => {
      const res = exec.capture(["ssh", "-T", "git@github.com"]);
      return combine(res).includes(GH_MARKER);
    };

    if (fs.exists(pubPath)) {
      io.ok("SSH key exists");
      printKey();
      if (verifyGithub()) {
        io.ok("GitHub SSH access verified");
        return { id: "ssh", status: "done" };
      }
      io.warn("SSH key exists but GitHub access not verified");
      io.raw("\n  Add this key to GitHub → Settings → SSH and GPG keys\n");
      io.raw("  Then press Enter to continue...\n");
      await io.waitForEnter();
      if (verifyGithub()) {
        io.ok("GitHub SSH access verified");
        return { id: "ssh", status: "done" };
      }
      io.warn("Could not verify GitHub SSH access — continuing anyway");
      return { id: "ssh", status: "unverified" };
    }

    io.warn("No SSH key found — generating one");
    const hostname = exec.capture(["hostname"]).stdout.trim() || "sandbox";
    exec.run([
      "ssh-keygen",
      "-t",
      "ed25519",
      "-f",
      keyPath,
      "-N",
      "",
      "-C",
      `${ORCHESTRATOR_USER}@${hostname}`,
    ]);
    printKey();
    io.raw("\n  Add this key to GitHub → Settings → SSH and GPG keys\n");
    io.raw("  Then press Enter to continue...\n");
    await io.waitForEnter();
    return { id: "ssh", status: "done" };
  },
};
