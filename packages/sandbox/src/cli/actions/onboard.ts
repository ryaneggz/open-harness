/**
 * `oh onboard [name|step]` — interactive onboarding wizard.
 *
 * Routing rules carried over from the legacy `resolveSubcommand`:
 * a positional matching a known step id (e.g. `oh onboard slack`) is a
 * step selector, not a container name.
 */

import { runOnboardCommand } from "../onboard.js";
import { STEP_IDS } from "../../onboard/types.js";

export interface OnboardActionOpts {
  force?: boolean;
  only?: string;
}

export async function onboardAction(
  target: string | undefined,
  opts: OnboardActionOpts,
): Promise<void> {
  let name: string | undefined = target;
  let only: string | undefined = opts.only;

  // A bare positional matching a step id rewrites to `--only`.
  if (!only && name && (STEP_IDS as readonly string[]).includes(name)) {
    only = name;
    name = undefined;
  }

  const exitCode = await runOnboardCommand({
    name,
    force: opts.force,
    only,
  });
  if (exitCode !== 0) process.exit(exitCode);
}
