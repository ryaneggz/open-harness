/**
 * Step 4/6 — GitHub CLI. Port of `install/onboard.sh:334-354`.
 *
 * - If `gh auth status` succeeds → run `gh auth setup-git` best-effort, done.
 * - Else run `gh auth login` interactively; success → done, failure → failed.
 */

import type { Step, StepResult } from "../types.js";

export const githubStep: Step = {
  id: "github",
  label: "Step 4/6 — GitHub CLI",
  async run(deps): Promise<StepResult> {
    const { io, exec } = deps;

    const statusOk = exec.runSafe(["gh", "auth", "status"]);
    if (statusOk) {
      io.ok("GitHub CLI already authenticated");
      exec.runSafe(["gh", "auth", "setup-git"]);
      io.ok("Git credential helper configured");
      return { id: "github", status: "done" };
    }

    io.raw("  Running: \x1b[0;36mgh auth login\x1b[0m\n\n");
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
