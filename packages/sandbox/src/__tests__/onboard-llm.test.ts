import { describe, it, expect } from "vitest";
import { llmStep } from "../onboard/steps/llm.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("llm step", () => {
  it("populated auth.json → done, no prompt", async () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.pi/agent/auth.json": JSON.stringify({ openai: { key: "x" } }) },
    });
    const result = await llmStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "ok").some((m) => m.startsWith("Already authenticated"))).toBe(true);
    expect(execWasCalled(deps, /^openharness$/)).toBe(false);
  });

  it("empty '{}' auth.json is treated as missing", async () => {
    const deps = makeFakeDeps({
      env: { OPENAI_API_KEY: "sk-1234" },
      files: { "/home/sandbox/.pi/agent/auth.json": "{}" },
    });
    const result = await llmStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "ok")).toContain("OPENAI_API_KEY set via environment");
  });

  it("no auth, no env, user declines → skipped", async () => {
    const deps = makeFakeDeps({ askAnswers: ["n"] });
    const result = await llmStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
    expect(execWasCalled(deps, /^openharness$/)).toBe(false);
  });

  it("no auth, user accepts, openharness populates auth.json → done + slack symlink", async () => {
    const deps = makeFakeDeps({
      askAnswers: [""],
      execStubs: [
        {
          match: /^openharness$/,
          sideEffect: () => {
            deps.files.set(
              "/home/sandbox/.pi/agent/auth.json",
              JSON.stringify({ openai: { key: "x" } }),
            );
          },
          result: { status: 0, stdout: "", stderr: "" },
        },
      ],
    });
    const result = await llmStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(deps.recorder.symlinks).toContainEqual({
      target: "/home/sandbox/.pi/agent/auth.json",
      link: "/home/sandbox/.pi/slack/auth.json",
    });
  });

  it("no auth, user accepts, openharness leaves auth unset → skipped + warn", async () => {
    const deps = makeFakeDeps({
      askAnswers: ["y"],
      execStubs: [{ match: /^openharness$/, result: { status: 0, stdout: "", stderr: "" } }],
    });
    const result = await llmStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
    expect(ioMessages(deps, "warn")).toContain(
      "Auth not detected — run 'openharness' and '/login' later",
    );
  });
});
