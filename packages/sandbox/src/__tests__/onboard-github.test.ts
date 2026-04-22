import { describe, it, expect } from "vitest";
import { githubStep } from "../onboard/steps/github.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("github step", () => {
  it("already authed → setup-git runs, returns done", async () => {
    const deps = makeFakeDeps({
      execStubs: [
        { match: /^gh auth status$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^gh auth setup-git$/, result: { status: 0, stdout: "", stderr: "" } },
      ],
    });
    const result = await githubStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(execWasCalled(deps, /^gh auth setup-git$/)).toBe(true);
    expect(ioMessages(deps, "ok")).toContain("GitHub CLI already authenticated");
  });

  it("not authed → runs gh auth login; success → done", async () => {
    const deps = makeFakeDeps({
      execStubs: [
        { match: /^gh auth status$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^gh auth login$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^gh auth setup-git$/, result: { status: 0, stdout: "", stderr: "" } },
      ],
    });
    const result = await githubStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(execWasCalled(deps, /^gh auth login$/)).toBe(true);
    expect(ioMessages(deps, "ok")).toContain("GitHub CLI authenticated");
  });

  it("gh auth login failure → failed", async () => {
    const deps = makeFakeDeps({
      execStubs: [
        { match: /^gh auth status$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^gh auth login$/, result: { status: 1, stdout: "", stderr: "" } },
      ],
    });
    const result = await githubStep.run(deps, { force: false });
    expect(result.status).toBe("failed");
    expect(ioMessages(deps, "fail")).toContain("GitHub CLI authentication failed");
  });
});
