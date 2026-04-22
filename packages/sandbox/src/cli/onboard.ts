/**
 * Interactive onboarding wizard — entry point for the `openharness onboard`
 * subcommand. When invoked without a sandbox name, runs the TS orchestrator
 * in-process. When invoked with a name, shells out via `docker exec` so the
 * wizard executes inside the named container.
 */

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { execCmd } from "../lib/docker.js";
import { makeRealDeps } from "../onboard/deps.js";
import { runOnboarding } from "../onboard/orchestrator.js";
import { parseArgs } from "../onboard/args.js";
import { ALL_STEPS } from "../onboard/steps/index.js";
import { UnknownStepError } from "../onboard/types.js";

export interface OnboardInvocationOptions {
  /** Sandbox container name. When set, runs host-mode (docker exec). */
  name?: string;
  force?: boolean;
  /** Positional step id ("slack" | "llm" | …) or `--only <id>` argument. */
  only?: string;
}

export async function runOnboardCommand(opts: OnboardInvocationOptions): Promise<number> {
  if (opts.name) {
    return runHostMode(opts);
  }
  return runInContainerMode(opts);
}

function runHostMode(opts: OnboardInvocationOptions): number {
  const args = ["openharness", "onboard"];
  if (opts.force) args.push("--force");
  if (opts.only) args.push("--only", opts.only);

  const cmd = execCmd(opts.name!, args, {
    user: "sandbox",
    interactive: true,
    env: { HOME: "/home/sandbox" },
  });
  const result = spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
  if (result.status !== 0) {
    console.error(
      `Error: container '${opts.name}' is not running. Start it first: openharness run ${opts.name}`,
    );
    return 1;
  }
  return 0;
}

async function runInContainerMode(opts: OnboardInvocationOptions): Promise<number> {
  const argv: string[] = [];
  if (opts.force) argv.push("--force");
  if (opts.only) argv.push("--only", opts.only);

  let parsed;
  try {
    parsed = parseArgs(argv);
  } catch (err) {
    if (err instanceof UnknownStepError) {
      console.error(err.message);
      return 2;
    }
    throw err;
  }

  const deps = makeRealDeps();
  const { exitCode } = await runOnboarding(ALL_STEPS, deps, parsed);

  // Only run the dev-server startup if we completed the full wizard (no
  // --only), mirroring the bash script's flow.
  if (!parsed.only && exitCode === 0) {
    startApplication(deps.home);
  }
  return exitCode;
}

/**
 * Post-wizard: install deps and launch the Next.js dev server.
 * Mirrors `install/onboard.sh:454-481`. Best-effort; swallows failures so a
 * partial dev-server start doesn't mask a successful onboarding.
 */
function startApplication(home: string): void {
  const appDir = `${home}/harness/workspace/projects/next-app`;
  if (!existsSync(appDir)) return;
  console.log("\n\x1b[0;36m==> Starting Application\x1b[0m");
  console.log("  Installing dependencies and starting dev server...\n");
  spawnSync("pnpm", ["install"], { cwd: appDir, stdio: "inherit" });
  const dev = spawnSync(
    "sh",
    ["-c", "nohup pnpm dev > /tmp/next-dev.log 2>&1 & echo $! > /tmp/next-dev.pid"],
    {
      cwd: appDir,
      stdio: "inherit",
    },
  );
  if (dev.status !== 0) {
    console.warn("  (dev server start failed — see /tmp/next-dev.log)");
  }
}
