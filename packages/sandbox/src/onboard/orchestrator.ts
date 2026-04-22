/**
 * Runs the onboarding step sequence, writes the marker, prints summaries.
 *
 * Mirrors the top-level control flow of `install/onboard.sh`:
 *   1. In --only mode: run one step, report + exit (no marker).
 *   2. Else if marker exists and --force is not set: print short-circuit.
 *   3. Else: run every step in order, collect results, write marker.
 *
 * The step list, dependency bag, and "did anything fail" mapping are
 * injectable so tests can exercise each branch without touching a shell.
 */

import * as marker from "./marker.js";
import type { Deps, Step, StepId, StepResult, StepStatus } from "./types.js";

export interface OrchestratorOptions {
  only?: StepId;
  force: boolean;
}

export interface OrchestratorResult {
  results: Record<string, StepStatus>;
  exitCode: number;
}

export async function runOnboarding(
  steps: readonly Step[],
  deps: Deps,
  opts: OrchestratorOptions,
): Promise<OrchestratorResult> {
  const { io, home, fs, clock } = deps;
  const results: Record<string, StepStatus> = {};

  if (opts.only) {
    const step = steps.find((s) => s.id === opts.only);
    if (!step) {
      io.fail(`Unknown step: ${opts.only}`);
      return { results, exitCode: 2 };
    }
    io.raw(`\n  \x1b[1m\x1b[0;36mOpen Harness — onboarding step: ${opts.only}\x1b[0m\n\n`);
    io.banner(step.label);
    const res = await safeRun(step, deps, { force: opts.force });
    results[res.id] = res.status;
    io.raw(`\n  \x1b[1m${res.id}\x1b[0m: ${res.status}\n\n`);
    return { results, exitCode: onlyExitCode(res.status) };
  }

  if (marker.exists(fs, home) && !opts.force) {
    io.banner("Already onboarded");
    const current = marker.read(fs, home);
    const completedAt = current?.completedAt ?? "unknown";
    io.raw(`  Completed: ${completedAt}\n`);
    io.raw(`\n  Run with \x1b[1m--force\x1b[0m to re-verify all steps,\n`);
    io.raw(
      `  or \x1b[1m--only <step>\x1b[0m (llm|slack|ssh|github|cloudflare|claude) to re-run one.\n\n`,
    );
    return { results, exitCode: 0 };
  }

  printWelcome(deps);

  for (const step of steps) {
    io.banner(step.label);
    const res = await safeRun(step, deps, { force: opts.force });
    results[res.id] = res.status;
  }

  marker.write(fs, home, clock.nowUtcIso(), results);
  printSummary(deps, results);

  return { results, exitCode: 0 };
}

async function safeRun(step: Step, deps: Deps, opts: { force: boolean }): Promise<StepResult> {
  try {
    return await step.run(deps, opts);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    deps.io.fail(`step '${step.id}' threw: ${message}`);
    return { id: step.id, status: "failed", message };
  }
}

function onlyExitCode(status: StepStatus): number {
  switch (status) {
    case "done":
    case "skipped":
      return 0;
    default:
      return 1;
  }
}

function printWelcome(deps: Deps): void {
  const { io } = deps;
  io.raw("\n");
  io.raw("  \x1b[1m\x1b[0;36mOpen Harness — First-Time Setup\x1b[0m\n");
  io.raw("  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  io.raw("\n");
  io.raw("  This wizard walks you through one-time authentication\n");
  io.raw("  for all services used by this sandbox.\n");
  io.raw("\n");
}

function printSummary(deps: Deps, results: Record<string, StepStatus>): void {
  const { io } = deps;
  io.banner("Onboarding Complete");
  io.raw("\n");
  const rows: [string, StepId][] = [
    ["LLM", "llm"],
    ["Slack", "slack"],
    ["SSH", "ssh"],
    ["GitHub", "github"],
    ["Cloudflare", "cloudflare"],
    ["Claude", "claude"],
  ];
  for (const [label, id] of rows) {
    io.raw(`  \x1b[0;32m${label}\x1b[0m: ${results[id] ?? "unknown"}\n`);
  }
  io.raw("\n");
  io.raw("  The dev server is now running. On future restarts,\n");
  io.raw("  the application will start automatically.\n");
  io.raw("\n");
  io.raw("  \x1b[0;36mVerify\x1b[0m: pnpm run test:setup\n");
  io.raw("  \x1b[0;36mRe-run\x1b[0m: openharness onboard --force\n");
  io.raw("\n");
}
