import { describe, it, expect } from "vitest";
import { claudeStep } from "../onboard/steps/claude.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("claude step", () => {
  it("returns done when ~/.claude/.credentials.json exists", async () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.claude/.credentials.json": "{}" },
    });
    const result = await claudeStep.run(deps, { force: false });
    expect(result).toEqual({ id: "claude", status: "done" });
    expect(ioMessages(deps, "ok")).toContain("Claude Code already authenticated");
    expect(execWasCalled(deps, /claude/)).toBe(false);
  });

  it("accepts the alternate credentials.json path", async () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.claude/credentials.json": "{}" },
    });
    const result = await claudeStep.run(deps, { force: false });
    expect(result.status).toBe("done");
  });

  it("prompts; 'n' answer returns skipped without running claude", async () => {
    const deps = makeFakeDeps({ askAnswers: ["n"] });
    const result = await claudeStep.run(deps, { force: false });
    expect(result).toEqual({ id: "claude", status: "skipped" });
    expect(execWasCalled(deps, /claude/)).toBe(false);
  });

  it("prompts; blank answer (default yes) runs claude --version", async () => {
    const deps = makeFakeDeps({
      askAnswers: [""],
      execStubs: [{ match: /^claude --version$/, result: { status: 0, stdout: "", stderr: "" } }],
    });
    const result = await claudeStep.run(deps, { force: false });
    expect(result).toEqual({ id: "claude", status: "done" });
    expect(execWasCalled(deps, /^claude --version$/)).toBe(true);
    expect(ioMessages(deps, "ok")).toContain("Claude Code ready");
  });

  it("claude --version failing still records done but warns", async () => {
    const deps = makeFakeDeps({
      askAnswers: ["y"],
      execStubs: [
        {
          match: /^claude --version$/,
          result: { status: 1, stdout: "", stderr: "boom" },
        },
      ],
    });
    const result = await claudeStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "warn")).toContain("Run 'claude' manually to complete auth");
  });
});
