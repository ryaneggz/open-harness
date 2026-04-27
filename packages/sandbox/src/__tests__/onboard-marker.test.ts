import { describe, it, expect } from "vitest";
import * as marker from "../onboard/marker.js";
import { makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("onboard marker", () => {
  it("markerPath is ~/.claude/.onboarded", () => {
    expect(marker.markerPath("/home/orchestrator")).toBe("/home/orchestrator/.claude/.onboarded");
  });

  it("exists returns false when file is absent", () => {
    const deps = makeFakeDeps();
    expect(marker.exists(deps.fs, deps.home)).toBe(false);
  });

  it("read returns parsed marker when file exists", () => {
    const path = "/home/orchestrator/.claude/.onboarded";
    const deps = makeFakeDeps({
      files: {
        [path]: JSON.stringify({
          version: 1,
          completedAt: "2026-04-21T12:00:00Z",
          steps: { llm: { status: "done" } },
        }),
      },
    });
    const parsed = marker.read(deps.fs, deps.home);
    expect(parsed?.version).toBe(1);
    expect(parsed?.completedAt).toBe("2026-04-21T12:00:00Z");
    expect(parsed?.steps.llm.status).toBe("done");
  });

  it("read returns null on invalid JSON", () => {
    const path = "/home/orchestrator/.claude/.onboarded";
    const deps = makeFakeDeps({ files: { [path]: "not json" } });
    expect(marker.read(deps.fs, deps.home)).toBeNull();
  });

  it("write creates a file with the full schema", () => {
    const deps = makeFakeDeps();
    marker.write(deps.fs, deps.home, "2026-04-21T00:00:00Z", {
      llm: "done",
      slack: "skipped",
      ssh: "done",
      github: "done",
      cloudflare: "skipped",
      claude: "done",
    });

    const path = "/home/orchestrator/.claude/.onboarded";
    expect(deps.files.has(path)).toBe(true);
    const parsed = JSON.parse(deps.files.get(path)!);
    expect(parsed.version).toBe(1);
    expect(parsed.completedAt).toBe("2026-04-21T00:00:00Z");
    expect(parsed.steps.llm.status).toBe("done");
    expect(parsed.steps.slack.status).toBe("skipped");
    expect(parsed.steps.cloudflare.status).toBe("skipped");
  });

  it("round-trip: write then read yields the same object", () => {
    const deps = makeFakeDeps();
    marker.write(deps.fs, deps.home, "2026-04-21T00:00:00Z", { llm: "done" });
    const back = marker.read(deps.fs, deps.home);
    expect(back?.steps.llm.status).toBe("done");
  });
});
