import { describe, it, expect } from "vitest";
import {
  SUBCOMMANDS,
  HEARTBEAT_ACTIONS,
  INSTALL_HINT,
  parseToolArgs,
  formatResult,
  resolveSubcommand,
  helpText,
  type SandboxModule,
  type ToolResult,
} from "../cli.js";

// ─── Mock sandbox module ───────────────────────────────────────────

function makeMockTool(name: string) {
  return {
    name,
    label: name,
    description: `Mock ${name}`,
    parameters: {},
    execute: async () => ({ content: [{ type: "text", text: `${name} executed` }] }),
  };
}

function makeMockSandbox(): SandboxModule {
  return {
    listTool: makeMockTool("sandbox_list"),
    quickstartTool: makeMockTool("sandbox_quickstart"),
    buildTool: makeMockTool("sandbox_build"),
    rebuildTool: makeMockTool("sandbox_rebuild"),
    runTool: makeMockTool("sandbox_run"),
    shellTool: makeMockTool("sandbox_shell"),
    stopTool: makeMockTool("sandbox_stop"),
    cleanTool: makeMockTool("sandbox_clean"),
    pushTool: makeMockTool("sandbox_push"),
    heartbeatTool: makeMockTool("sandbox_heartbeat"),
    worktreeTool: makeMockTool("sandbox_worktree"),
  };
}

// ─── Constants ─────────────────────────────────────────────────────

describe("SUBCOMMANDS", () => {
  const expected = [
    "list",
    "quickstart",
    "build",
    "rebuild",
    "run",
    "shell",
    "stop",
    "clean",
    "push",
    "heartbeat",
    "worktree",
  ];

  it("contains all expected subcommands", () => {
    for (const cmd of expected) {
      expect(SUBCOMMANDS.has(cmd)).toBe(true);
    }
  });

  it("has exactly the expected count", () => {
    expect(SUBCOMMANDS.size).toBe(expected.length);
  });

  it("does not contain agent-mode flags", () => {
    expect(SUBCOMMANDS.has("--help")).toBe(false);
    expect(SUBCOMMANDS.has("--version")).toBe(false);
    expect(SUBCOMMANDS.has("install")).toBe(false);
  });
});

describe("HEARTBEAT_ACTIONS", () => {
  it("contains sync, stop, status, migrate", () => {
    expect([...HEARTBEAT_ACTIONS]).toEqual(["sync", "stop", "status", "migrate"]);
  });
});

describe("INSTALL_HINT", () => {
  it("mentions openharness install", () => {
    expect(INSTALL_HINT).toContain("openharness install @openharness/sandbox");
  });
});

// ─── parseToolArgs ─────────────────────────────────────────────────

describe("parseToolArgs", () => {
  it("parses a bare name as first positional", () => {
    expect(parseToolArgs(["my-agent"])).toEqual({ name: "my-agent" });
  });

  it("parses two positionals as name and action", () => {
    expect(parseToolArgs(["sync", "my-agent"])).toEqual({
      name: "sync",
      action: "my-agent",
    });
  });

  it("parses --base-branch flag", () => {
    expect(parseToolArgs(["my-agent", "--base-branch", "main"])).toEqual({
      name: "my-agent",
      baseBranch: "main",
    });
  });

  it("parses --tag flag", () => {
    expect(parseToolArgs(["my-agent", "--tag", "v2"])).toEqual({
      name: "my-agent",
      tag: "v2",
    });
  });

  it("parses --branch flag", () => {
    expect(parseToolArgs(["my-agent", "--branch", "feature/x"])).toEqual({
      name: "my-agent",
      branch: "feature/x",
    });
  });

  it("parses --docker boolean flag", () => {
    expect(parseToolArgs(["my-agent", "--docker"])).toEqual({
      name: "my-agent",
      docker: true,
    });
  });

  it("parses all flags together", () => {
    const result = parseToolArgs([
      "my-agent",
      "--base-branch",
      "main",
      "--tag",
      "v1",
      "--branch",
      "agent/test",
      "--docker",
    ]);
    expect(result).toEqual({
      name: "my-agent",
      baseBranch: "main",
      tag: "v1",
      branch: "agent/test",
      docker: true,
    });
  });

  it("returns empty object for empty args", () => {
    expect(parseToolArgs([])).toEqual({});
  });

  it("ignores unknown flags", () => {
    expect(parseToolArgs(["my-agent", "--unknown"])).toEqual({ name: "my-agent" });
  });

  it("ignores --base-branch without a following value", () => {
    // --base-branch at end of args with no value
    const result = parseToolArgs(["my-agent", "--base-branch"]);
    expect(result).toEqual({ name: "my-agent" });
    expect(result.baseBranch).toBeUndefined();
  });

  it("ignores --tag without a following value", () => {
    const result = parseToolArgs(["my-agent", "--tag"]);
    expect(result).toEqual({ name: "my-agent" });
    expect(result.tag).toBeUndefined();
  });

  it("ignores --branch without a following value", () => {
    const result = parseToolArgs(["my-agent", "--branch"]);
    expect(result).toEqual({ name: "my-agent" });
    expect(result.branch).toBeUndefined();
  });

  it("ignores positionals beyond the second", () => {
    const result = parseToolArgs(["first", "second", "third"]);
    expect(result).toEqual({ name: "first", action: "second" });
  });
});

// ─── formatResult ──────────────────────────────────────────────────

describe("formatResult", () => {
  it("extracts text content items", () => {
    const result: ToolResult = {
      content: [
        { type: "text", text: "line 1" },
        { type: "text", text: "line 2" },
      ],
    };
    expect(formatResult(result)).toEqual(["line 1", "line 2"]);
  });

  it("skips non-text content types", () => {
    const result: ToolResult = {
      content: [
        { type: "image", text: "ignored" },
        { type: "text", text: "kept" },
      ],
    };
    expect(formatResult(result)).toEqual(["kept"]);
  });

  it("skips text items with empty or missing text", () => {
    const result: ToolResult = {
      content: [{ type: "text" }, { type: "text", text: "" }, { type: "text", text: "ok" }],
    };
    expect(formatResult(result)).toEqual(["ok"]);
  });

  it("returns empty array for empty content", () => {
    expect(formatResult({ content: [] })).toEqual([]);
  });
});

// ─── resolveSubcommand ─────────────────────────────────────────────

describe("resolveSubcommand", () => {
  const sandbox = makeMockSandbox();

  describe("list command", () => {
    it("resolves to listTool with empty params", () => {
      const result = resolveSubcommand("list", [], sandbox);
      expect(result).toEqual({ tool: sandbox.listTool, params: {} });
    });

    it("ignores extra arguments", () => {
      const result = resolveSubcommand("list", ["extra", "--flag"], sandbox);
      expect(result).toEqual({ tool: sandbox.listTool, params: {} });
    });
  });

  describe("heartbeat command", () => {
    it("resolves with valid action and name", () => {
      const result = resolveSubcommand("heartbeat", ["sync", "my-agent"], sandbox);
      expect(result).toEqual({
        tool: sandbox.heartbeatTool,
        params: { action: "sync", name: "my-agent" },
      });
    });

    for (const action of HEARTBEAT_ACTIONS) {
      it(`accepts action: ${action}`, () => {
        const result = resolveSubcommand("heartbeat", [action, "test"], sandbox);
        expect("tool" in result).toBe(true);
      });
    }

    it("returns error for missing action", () => {
      const result = resolveSubcommand("heartbeat", [], sandbox);
      expect("error" in result).toBe(true);
    });

    it("returns error for missing name", () => {
      const result = resolveSubcommand("heartbeat", ["sync"], sandbox);
      expect("error" in result).toBe(true);
    });

    it("returns error for invalid action", () => {
      const result = resolveSubcommand("heartbeat", ["invalid", "my-agent"], sandbox);
      expect("error" in result).toBe(true);
    });
  });

  describe("named commands", () => {
    const commands = [
      "quickstart",
      "build",
      "rebuild",
      "run",
      "shell",
      "stop",
      "clean",
      "push",
      "worktree",
    ];

    for (const cmd of commands) {
      it(`resolves ${cmd} with name`, () => {
        const result = resolveSubcommand(cmd, ["my-agent"], sandbox);
        expect("tool" in result).toBe(true);
        if ("tool" in result) {
          expect(result.params).toEqual({ name: "my-agent" });
        }
      });

      it(`${cmd} returns error without name`, () => {
        const result = resolveSubcommand(cmd, [], sandbox);
        expect("error" in result).toBe(true);
        if ("error" in result) {
          expect(result.error).toContain(cmd);
          expect(result.error).toContain("<name>");
        }
      });
    }

    it("passes flags through for quickstart", () => {
      const result = resolveSubcommand(
        "quickstart",
        ["my-agent", "--base-branch", "main", "--docker"],
        sandbox,
      );
      expect("tool" in result).toBe(true);
      if ("tool" in result) {
        expect(result.params).toEqual({
          name: "my-agent",
          baseBranch: "main",
          docker: true,
        });
      }
    });
  });

  describe("tool mapping", () => {
    it("maps quickstart to quickstartTool", () => {
      const result = resolveSubcommand("quickstart", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.quickstartTool);
    });

    it("maps build to buildTool", () => {
      const result = resolveSubcommand("build", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.buildTool);
    });

    it("maps rebuild to rebuildTool", () => {
      const result = resolveSubcommand("rebuild", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.rebuildTool);
    });

    it("maps run to runTool", () => {
      const result = resolveSubcommand("run", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.runTool);
    });

    it("maps shell to shellTool", () => {
      const result = resolveSubcommand("shell", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.shellTool);
    });

    it("maps stop to stopTool", () => {
      const result = resolveSubcommand("stop", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.stopTool);
    });

    it("maps clean to cleanTool", () => {
      const result = resolveSubcommand("clean", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.cleanTool);
    });

    it("maps push to pushTool", () => {
      const result = resolveSubcommand("push", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.pushTool);
    });

    it("maps worktree to worktreeTool", () => {
      const result = resolveSubcommand("worktree", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.worktreeTool);
    });
  });
});

// ─── helpText ──────────────────────────────────────────────────────

describe("helpText", () => {
  const text = helpText("1.0.0");

  it("includes the version", () => {
    expect(text).toContain("1.0.0");
  });

  it("includes openharness branding", () => {
    expect(text).toContain("openharness");
  });

  it("documents all subcommands", () => {
    for (const cmd of SUBCOMMANDS) {
      expect(text).toContain(cmd);
    }
  });

  it("documents all CLI flags", () => {
    expect(text).toContain("--base-branch");
    expect(text).toContain("--docker");
    expect(text).toContain("--tag");
    expect(text).toContain("--branch");
  });

  it("documents agent mode options", () => {
    expect(text).toContain("--provider");
    expect(text).toContain("--model");
    expect(text).toContain("--print");
    expect(text).toContain("--continue");
  });

  it("includes usage examples", () => {
    expect(text).toContain("openharness quickstart my-agent");
    expect(text).toContain("openharness list");
    expect(text).toContain("openharness shell my-agent");
    expect(text).toContain("openharness clean my-agent");
  });
});
