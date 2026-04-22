import { describe, it, expect } from "vitest";
import { runOnboarding } from "../onboard/orchestrator.js";
import { makeFakeDeps } from "../onboard/testing/fake-deps.js";
import type { Step, StepId, StepResult, StepStatus } from "../onboard/types.js";

function stubStep(id: StepId, status: StepStatus, label?: string): Step {
  return {
    id,
    label: label ?? `Step — ${id}`,
    run: async (): Promise<StepResult> => ({ id, status }),
  };
}

const allSteps: Step[] = [
  stubStep("llm", "done", "Step 1/6 — LLM Provider (OpenAI)"),
  stubStep("slack", "skipped", "Step 2/6 — Slack (Mom Bot)"),
  stubStep("ssh", "done", "Step 3/6 — SSH Key"),
  stubStep("github", "done", "Step 4/6 — GitHub CLI"),
  stubStep("cloudflare", "skipped", "Step 5/6 — Cloudflare Tunnel"),
  stubStep("claude", "done", "Step 6/6 — Claude Code"),
];

describe("runOnboarding", () => {
  it("runs every step in order and writes the marker", async () => {
    const deps = makeFakeDeps({ now: "2026-04-21T00:00:00Z" });
    const { results, exitCode } = await runOnboarding(allSteps, deps, { force: false });

    expect(exitCode).toBe(0);
    expect(results).toEqual({
      llm: "done",
      slack: "skipped",
      ssh: "done",
      github: "done",
      cloudflare: "skipped",
      claude: "done",
    });

    const markerPath = "/home/sandbox/.claude/.onboarded";
    expect(deps.files.has(markerPath)).toBe(true);
    const saved = JSON.parse(deps.files.get(markerPath)!);
    expect(saved.version).toBe(1);
    expect(saved.completedAt).toBe("2026-04-21T00:00:00Z");
    expect(saved.steps.llm.status).toBe("done");
    expect(saved.steps.slack.status).toBe("skipped");
  });

  it("--only short-circuits to a single step with done → exit 0", async () => {
    const deps = makeFakeDeps();
    const { results, exitCode } = await runOnboarding(allSteps, deps, {
      force: false,
      only: "slack",
    });
    // Stub 'slack' was 'skipped' → still exit 0.
    expect(exitCode).toBe(0);
    expect(results).toEqual({ slack: "skipped" });
    // No marker on --only.
    expect(deps.files.has("/home/sandbox/.claude/.onboarded")).toBe(false);
  });

  it("--only with failed step → exit 1", async () => {
    const failing: Step[] = [stubStep("github", "failed", "Step 4/6 — GitHub CLI")];
    const deps = makeFakeDeps();
    const { exitCode } = await runOnboarding(failing, deps, {
      force: false,
      only: "github",
    });
    expect(exitCode).toBe(1);
  });

  it("marker present + !force + !only → short-circuits without running steps", async () => {
    const deps = makeFakeDeps({
      files: {
        "/home/sandbox/.claude/.onboarded": JSON.stringify({
          version: 1,
          completedAt: "2026-04-20T00:00:00Z",
          steps: { llm: { status: "done" } },
        }),
      },
    });
    // Any step that ran would throw because the stubs don't record anything,
    // so the assertion is implicit: no results collected = no runs.
    const { results, exitCode } = await runOnboarding(allSteps, deps, { force: false });
    expect(exitCode).toBe(0);
    expect(results).toEqual({});
  });

  it("marker present + --force → re-runs every step", async () => {
    const deps = makeFakeDeps({
      now: "2026-04-21T05:00:00Z",
      files: {
        "/home/sandbox/.claude/.onboarded": JSON.stringify({
          version: 1,
          completedAt: "2026-04-20T00:00:00Z",
          steps: { llm: { status: "done" } },
        }),
      },
    });
    const { results } = await runOnboarding(allSteps, deps, { force: true });
    expect(Object.keys(results).length).toBe(6);
    const saved = JSON.parse(deps.files.get("/home/sandbox/.claude/.onboarded")!);
    expect(saved.completedAt).toBe("2026-04-21T05:00:00Z");
  });

  it("a step that throws is caught and recorded as failed", async () => {
    const throwing: Step = {
      id: "ssh",
      label: "Step 3/6 — SSH Key",
      run: async () => {
        throw new Error("boom");
      },
    };
    const deps = makeFakeDeps();
    const { results, exitCode } = await runOnboarding([throwing], deps, {
      force: false,
      only: "ssh",
    });
    expect(results.ssh).toBe("failed");
    expect(exitCode).toBe(1);
  });

  it("--only with unknown step id returns exit 2", async () => {
    const deps = makeFakeDeps();
    const { exitCode } = await runOnboarding(allSteps, deps, {
      force: false,
      // Pretend an invalid step slipped past parseArgs.
      only: "nope" as StepId,
    });
    expect(exitCode).toBe(2);
  });
});
