import { describe, it, expect } from "vitest";
import { slackStep } from "../onboard/steps/slack.js";
import { execWasCalled, ioMessages, makeFakeDeps } from "../onboard/testing/fake-deps.js";

const SLACK_PKG = "/home/orchestrator/harness/packages/slack";

describe("slack step", () => {
  it("tokens in env + mom on PATH + already connected → done", async () => {
    const deps = makeFakeDeps({
      env: { SLACK_APP_TOKEN: "xapp-1", SLACK_BOT_TOKEN: "xoxb-1" },
      which: { mom: "/usr/local/bin/mom" },
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: {
            status: 0,
            stdout: "bot connected and listening for messages",
            stderr: "",
          },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "ok")).toContain(
      "Mom already running and connected (started by entrypoint)",
    );
  });

  it("tokens present + mom path dist fallback + fresh start succeeds on poll", async () => {
    const deps = makeFakeDeps({
      env: { SLACK_APP_TOKEN: "xapp-1", SLACK_BOT_TOKEN: "xoxb-1" },
      which: { mom: null },
      files: {
        [`${SLACK_PKG}/dist/main.js`]: "// stub",
        [`${SLACK_PKG}/package.json`]: "{}",
      },
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^tmux kill-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^tmux new-session -d -s slack /, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: {
            status: 0,
            stdout: "[mom] connected and listening on slack socket",
            stderr: "",
          },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    expect(ioMessages(deps, "warn")).toContain(
      "mom CLI not on PATH — using direct node invocation",
    );
  });

  it("tokens missing + user declines → skipped (bootstraps agent dir)", async () => {
    const deps = makeFakeDeps({
      askAnswers: ["n"],
      files: { "/home/orchestrator/.pi/agent/settings.json": "{}" },
      which: { mom: "/usr/local/bin/mom" },
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
    expect(deps.recorder.symlinks).toContainEqual({
      target: "/home/orchestrator/.pi/agent/settings.json",
      link: "/home/orchestrator/.openharness/agent/settings.json",
    });
  });

  it("tokens missing + user accepts + provides tokens → persists to .devcontainer/.env and connects", async () => {
    const deps = makeFakeDeps({
      home: "/home/orchestrator",
      files: { "/home/orchestrator/harness/.devcontainer": "dir" },
      which: { mom: "/usr/local/bin/mom" },
      askAnswers: ["y", "xapp-new", "xoxb-new"],
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^tmux kill-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^tmux new-session -d -s slack /, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: { status: 0, stdout: "connected and listening", stderr: "" },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    const envContents = deps.files.get("/home/orchestrator/harness/.devcontainer/.env") ?? "";
    expect(envContents).toContain("SLACK_APP_TOKEN=xapp-new");
    expect(envContents).toContain("SLACK_BOT_TOKEN=xoxb-new");
  });

  it("prompts + persists against .devcontainer/.env with preconfigured value: comments old line, inserts new after", async () => {
    const deps = makeFakeDeps({
      home: "/home/orchestrator",
      files: {
        "/home/orchestrator/harness/.devcontainer": "dir",
        "/home/orchestrator/harness/.devcontainer/.env": "SLACK_APP_TOKEN=xapp-preconfigured\n",
      },
      which: { mom: "/usr/local/bin/mom" },
      askAnswers: ["y", "xapp-new", "xoxb-new"],
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^tmux kill-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^tmux new-session -d -s slack /, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: { status: 0, stdout: "connected and listening", stderr: "" },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("done");
    const envContents = deps.files.get("/home/orchestrator/harness/.devcontainer/.env") ?? "";
    expect(envContents).toContain("# SLACK_APP_TOKEN=xapp-preconfigured");
    expect(envContents).toMatch(/# SLACK_APP_TOKEN=xapp-preconfigured\nSLACK_APP_TOKEN=xapp-new/);
    expect(envContents).toContain("SLACK_BOT_TOKEN=xoxb-new");
  });

  it("tokens set but mom never connects within polls → failed", async () => {
    const deps = makeFakeDeps({
      env: { SLACK_APP_TOKEN: "xapp-1", SLACK_BOT_TOKEN: "xoxb-1" },
      which: { mom: "/usr/local/bin/mom" },
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^tmux kill-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^tmux new-session -d -s slack /, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: { status: 0, stdout: "still connecting...", stderr: "" },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("failed");
    // Fake clock.sleep is a no-op → all 15 polls happen instantly.
    expect(deps.recorder.sleeps.length).toBeGreaterThanOrEqual(14);
  });

  it("tmux pane surfaces error marker → fails fast without exhausting polls", async () => {
    const deps = makeFakeDeps({
      env: { SLACK_APP_TOKEN: "xapp-1", SLACK_BOT_TOKEN: "xoxb-1" },
      which: { mom: "/usr/local/bin/mom" },
      execStubs: [
        { match: /^tmux has-session -t slack$/, result: { status: 1, stdout: "", stderr: "" } },
        { match: /^tmux kill-session -t slack$/, result: { status: 0, stdout: "", stderr: "" } },
        { match: /^tmux new-session -d -s slack /, result: { status: 0, stdout: "", stderr: "" } },
        {
          match: /^tmux capture-pane -t slack -p$/,
          result: { status: 0, stdout: "Missing env SLACK_APP_TOKEN", stderr: "" },
        },
      ],
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("failed");
    expect(execWasCalled(deps, /^tmux new-session /)).toBe(true);
  });

  it("empty tokens entered → warns + skipped", async () => {
    const deps = makeFakeDeps({
      askAnswers: ["y", "", ""],
      which: { mom: "/usr/local/bin/mom" },
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("skipped");
    expect(ioMessages(deps, "warn")).toContain("Tokens not provided");
  });

  it("mom not resolvable at all → failed when tokens present", async () => {
    const deps = makeFakeDeps({
      env: { SLACK_APP_TOKEN: "xapp-1", SLACK_BOT_TOKEN: "xoxb-1" },
      which: { mom: null },
    });
    const result = await slackStep.run(deps, { force: false });
    expect(result.status).toBe("failed");
  });
});
