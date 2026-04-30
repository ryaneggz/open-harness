/**
 * Interactive onboarding wizard — entry point for the `openharness onboard`
 * subcommand. When invoked without a sandbox name, runs the TS orchestrator
 * in-process. When invoked with a name, shells out via `docker exec` so the
 * wizard executes inside the named container.
 */

import { spawnSync } from "node:child_process";
import { execCmd } from "../lib/docker.js";
import { makeRealDeps } from "../onboard/deps.js";
import { runOnboarding } from "../onboard/orchestrator.js";
import { parseArgs } from "../onboard/args.js";
import { ALL_STEPS } from "../onboard/steps/index.js";
import { STEP_IDS, UnknownStepError } from "../onboard/types.js";

export interface OnboardInvocationOptions {
  /** Sandbox container name. When set, runs host-mode (docker exec). */
  name?: string;
  force?: boolean;
  /** Positional step id ("slack" | "llm" | …) or `--only <id>` argument. */
  only?: string;
}

/**
 * A bare positional matching a step id (e.g. `oh onboard slack`) is a
 * step selector, not a container name. Without this rewrite the CLI
 * would docker-exec into a sandbox literally called "slack".
 */
export function normalizeOnboardOpts(opts: OnboardInvocationOptions): OnboardInvocationOptions {
  if (opts.name && !opts.only && (STEP_IDS as readonly string[]).includes(opts.name)) {
    return { ...opts, only: opts.name, name: undefined };
  }
  return opts;
}

export async function runOnboardCommand(opts: OnboardInvocationOptions): Promise<number> {
  const normalized = normalizeOnboardOpts(opts);
  if (normalized.name) {
    return runHostMode(normalized);
  }
  return runInContainerMode(normalized);
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
  return exitCode;
}
