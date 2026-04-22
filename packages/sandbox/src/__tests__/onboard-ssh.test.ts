import { describe, it, expect } from "vitest";
import { sshStep } from "../onboard/steps/ssh.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("ssh step", () => {
  it("existing key + verified github → done", async () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.ssh/id_ed25519.pub": "ssh-ed25519 AAAA sandbox@host\n" },
      execStubs: [
        {
          match: /^ssh -T git@github\.com$/,
          result: {
            status: 1,
            stdout: "",
            stderr: "Hi sandbox! You've successfully authenticated, but GitHub does not…",
          },
        },
      ],
    });
    const result = await sshStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "ok")).toContain("GitHub SSH access verified");
  });

  it("existing key but first verify fails → prompts, second try succeeds", async () => {
    let calls = 0;
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.ssh/id_ed25519.pub": "ssh-ed25519 AAAA sandbox@host" },
      execStubs: [
        {
          match: /^ssh -T git@github\.com$/,
          sideEffect: () => {
            calls += 1;
          },
          // This stub is used for the return value only; we swap it below.
        },
      ],
    });
    // Replace the exec.capture with a two-phase counter.
    const realCapture = deps.exec.capture;
    deps.exec.capture = (cmd, opts) => {
      if (cmd.join(" ") === "ssh -T git@github.com") {
        calls += 1;
        return calls === 1
          ? { status: 1, stdout: "", stderr: "Permission denied" }
          : { status: 1, stdout: "", stderr: "You've successfully authenticated" };
      }
      return realCapture(cmd, opts);
    };
    const result = await sshStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(deps.recorder.waitForEnterCount).toBe(1);
    expect(calls).toBe(2);
  });

  it("existing key + both verifies fail → unverified", async () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/.ssh/id_ed25519.pub": "ssh-ed25519 AAAA" },
      execStubs: [
        {
          match: /^ssh -T git@github\.com$/,
          result: { status: 1, stdout: "", stderr: "Permission denied" },
        },
      ],
    });
    const result = await sshStep.run(deps, { force: false });
    expect(result.status).toBe("unverified");
  });

  it("no key → generates one, waits for enter, returns done", async () => {
    const deps = makeFakeDeps({
      execStubs: [
        { match: /^hostname$/, result: { status: 0, stdout: "test-host\n", stderr: "" } },
        {
          match: /^ssh-keygen /,
          result: { status: 0, stdout: "", stderr: "" },
          sideEffect: () => {
            deps.files.set(
              "/home/sandbox/.ssh/id_ed25519.pub",
              "ssh-ed25519 GEN sandbox@test-host",
            );
          },
        },
      ],
    });
    const result = await sshStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(execWasCalled(deps, /^ssh-keygen /)).toBe(true);
    expect(deps.recorder.waitForEnterCount).toBe(1);
  });
});
