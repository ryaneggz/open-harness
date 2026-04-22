/**
 * Step 2/6 — GitHub CLI.
 *
 * - If `gh auth status` succeeds → run `gh auth setup-git` best-effort, done.
 * - Else run `gh auth login` interactively; success → done, failure → failed.
 *
 * Runs before the SSH step so that the interactive `gh auth login` flow (which
 * offers to generate + upload an SSH key for the user) can satisfy both this
 * step and the next one.
 */

import type { Step, StepResult } from "../types.js";

export const githubStep: Step = {
  id: "github",
  label: "Step 2/6 — GitHub CLI",
  async run(deps): Promise<StepResult> {
    const { io, exec } = deps;

    const statusOk = exec.runSafe(["gh", "auth", "status"]);
    if (statusOk) {
      io.ok("GitHub CLI already authenticated");
      exec.runSafe(["gh", "auth", "setup-git"]);
      io.ok("Git credential helper configured");
      return { id: "github", status: "done" };
    }

    io.raw("  Running: \x1b[0;36mgh auth login\x1b[0m\n");
    io.raw(
      "  \x1b[0;90mTip: choose SSH when prompted — gh can generate and upload the key for you.\x1b[0m\n\n",
    );
    const loginOk = exec.runSafe(["gh", "auth", "login"]);
    if (loginOk) {
      io.ok("GitHub CLI authenticated");
      exec.runSafe(["gh", "auth", "setup-git"]);
      io.ok("Git credential helper configured");
      return { id: "github", status: "done" };
    }

    io.fail("GitHub CLI authentication failed");
    return { id: "github", status: "failed" };
  },
};
