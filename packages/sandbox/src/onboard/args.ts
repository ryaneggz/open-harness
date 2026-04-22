/**
 * argv parser for the onboarding CLI. Accepts the same shapes the bash
 * script did:
 *   onboard                  → { force: false }
 *   onboard --force          → { force: true }
 *   onboard --only slack     → { only: "slack", force: false }
 *   onboard --only=slack     → { only: "slack", force: false }
 *   onboard slack            → { only: "slack", force: false }  (positional)
 */

import { STEP_IDS, UnknownStepError, type ParsedArgs, type StepId } from "./types.js";

export function parseArgs(argv: readonly string[]): ParsedArgs {
  let only: StepId | undefined;
  let force = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--only") {
      const next = argv[i + 1];
      if (next === undefined) continue;
      only = ensureStepId(next);
      i++;
      continue;
    }
    if (arg.startsWith("--only=")) {
      only = ensureStepId(arg.slice("--only=".length));
      continue;
    }
    if ((STEP_IDS as readonly string[]).includes(arg)) {
      only = arg as StepId;
      continue;
    }
    // Unknown flags are ignored (bash did the same: `*) shift ;;`)
  }

  return { only, force };
}

function ensureStepId(value: string): StepId {
  if (!(STEP_IDS as readonly string[]).includes(value)) {
    throw new UnknownStepError(value);
  }
  return value as StepId;
}
