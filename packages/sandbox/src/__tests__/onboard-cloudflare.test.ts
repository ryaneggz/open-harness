import { describe, it, expect } from "vitest";
import { cloudflareStep } from "../onboard/steps/cloudflare.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("cloudflare step", () => {
  it("no cloudflared binary → skipped", async () => {
    const deps = makeFakeDeps({ which: { cloudflared: null } });
    const result = await cloudflareStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
    expect(ioMessages(deps, "skip")).toContain("cloudflared not installed — skipping");
  });

  it("existing tunnel config + !force → done, no prompts", async () => {
    const deps = makeFakeDeps({
      which: { cloudflared: "/usr/bin/cloudflared" },
      files: { "/home/sandbox/.cloudflared": "dir" },
      execStubs: [
        {
          match: (cmd) => cmd[0] === "sh" && cmd[2].includes("config-*.yml"),
          result: {
            status: 0,
            stdout: "/home/sandbox/.cloudflared/config-open-harness.yml\n",
            stderr: "",
          },
        },
      ],
    });
    const result = await cloudflareStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "ok").some((m) => m.includes("Tunnel 'open-harness'"))).toBe(true);
  });

  it("no cert.pem + user declines → skipped", async () => {
    const deps = makeFakeDeps({
      which: { cloudflared: "/usr/bin/cloudflared" },
      askAnswers: ["n"],
      execStubs: [
        {
          match: (cmd) => cmd[0] === "sh" && cmd[2].includes("config-*.yml"),
          result: { status: 1, stdout: "", stderr: "" },
        },
      ],
    });
    const result = await cloudflareStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
  });

  it("no cert.pem + user accepts + login still leaves no cert → failed", async () => {
    const deps = makeFakeDeps({
      which: { cloudflared: "/usr/bin/cloudflared" },
      askAnswers: ["y"],
      execStubs: [
        {
          match: (cmd) => cmd[0] === "sh" && cmd[2].includes("config-*.yml"),
          result: { status: 1, stdout: "", stderr: "" },
        },
        { match: /^cloudflared login$/, result: { status: 0, stdout: "", stderr: "" } },
      ],
    });
    const result = await cloudflareStep.run(deps, { force: false });
    expect(result.status).toBe("failed");
    expect(execWasCalled(deps, /^cloudflared login$/)).toBe(true);
  });

  it("existing cert.pem + prompts → delegates to cloudflared-tunnel.sh", async () => {
    const deps = makeFakeDeps({
      which: { cloudflared: "/usr/bin/cloudflared" },
      files: { "/home/sandbox/.cloudflared/cert.pem": "pem" },
      askAnswers: ["my-tun", "", ""],
      execStubs: [
        {
          match: (cmd) => cmd[0] === "sh" && cmd[2].includes("config-*.yml"),
          result: { status: 1, stdout: "", stderr: "" },
        },
        { match: /cloudflared-tunnel\.sh/, result: { status: 0, stdout: "", stderr: "" } },
      ],
    });
    const result = await cloudflareStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(
      execWasCalled(
        deps,
        (cmd) =>
          cmd[0] === "bash" &&
          cmd[1].endsWith("/install/cloudflared-tunnel.sh") &&
          cmd[2] === "my-tun" &&
          cmd[3] === "my-tun.ruska.dev" &&
          cmd[4] === "3000",
      ),
    ).toBe(true);
  });
});
