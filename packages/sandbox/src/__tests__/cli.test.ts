import { describe, it, expect } from "vitest";
import {
  SUBCOMMANDS,
  HEARTBEAT_ACTIONS,
  ONBOARD_STEPS,
  parseToolArgs,
  formatResult,
  resolveSubcommand,
  helpText,
  type SandboxModule,
  type ToolResult,
} from "../cli/cli.js";

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
    sandboxTool: makeMockTool("sandbox_sandbox"),
    runTool: makeMockTool("sandbox_run"),
    shellTool: makeMockTool("sandbox_shell"),
    stopTool: makeMockTool("sandbox_stop"),
    cleanTool: makeMockTool("sandbox_clean"),
    heartbeatTool: makeMockTool("sandbox_heartbeat"),
    worktreeTool: makeMockTool("sandbox_worktree"),
    onboardTool: makeMockTool("sandbox_onboard"),
    portsTool: makeMockTool("sandbox_ports"),
    exposeTool: makeMockTool("sandbox_expose"),
    unexposeTool: makeMockTool("sandbox_unexpose"),
    openTool: makeMockTool("sandbox_open"),
  };
}

// ─── Constants ─────────────────────────────────────────────────────

describe("SUBCOMMANDS", () => {
  const expected = [
    "list",
    "sandbox",
    "run",
    "shell",
    "stop",
    "clean",
    "heartbeat",
    "worktree",
    "onboard",
    "ports",
    "expose",
    "unexpose",
    "open",
  ];

  it("contains all expected subcommands", () => {
    for (const cmd of expected) {
      expect(SUBCOMMANDS.has(cmd)).toBe(true);
    }
  });

  it("has exactly the expected count", () => {
    expect(SUBCOMMANDS.size).toBe(expected.length);
  });

  it("does not contain removed commands", () => {
    expect(SUBCOMMANDS.has("build")).toBe(false);
    expect(SUBCOMMANDS.has("rebuild")).toBe(false);
    expect(SUBCOMMANDS.has("push")).toBe(false);
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

  it("parses --force boolean flag", () => {
    expect(parseToolArgs(["my-agent", "--force"])).toEqual({
      name: "my-agent",
      force: true,
    });
  });

  it("parses --base-branch flag (for worktree)", () => {
    expect(parseToolArgs(["my-agent", "--base-branch", "main"])).toEqual({
      name: "my-agent",
      baseBranch: "main",
    });
  });

  it("parses --local boolean flag", () => {
    expect(parseToolArgs(["3000", "--local"])).toEqual({ name: "3000", local: true });
  });

  it("parses --public boolean flag", () => {
    expect(parseToolArgs(["3000", "--public"])).toEqual({ name: "3000", public: true });
  });

  it("parses --host-port flag with value", () => {
    expect(parseToolArgs(["3000", "--local", "--host-port", "3300"])).toEqual({
      name: "3000",
      local: true,
      hostPort: "3300",
    });
  });

  it("returns empty object for empty args", () => {
    expect(parseToolArgs([])).toEqual({});
  });

  it("ignores unknown flags", () => {
    expect(parseToolArgs(["my-agent", "--unknown"])).toEqual({ name: "my-agent" });
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

  describe("onboard command", () => {
    it("resolves without name (inside-container mode)", () => {
      const result = resolveSubcommand("onboard", [], sandbox);
      expect(result).toEqual({ tool: sandbox.onboardTool, params: {} });
    });

    it("resolves with name (host mode)", () => {
      const result = resolveSubcommand("onboard", ["my-agent"], sandbox);
      expect(result).toEqual({ tool: sandbox.onboardTool, params: { name: "my-agent" } });
    });

    it("resolves with --force flag", () => {
      const result = resolveSubcommand("onboard", ["my-agent", "--force"], sandbox);
      expect(result).toEqual({
        tool: sandbox.onboardTool,
        params: { name: "my-agent", force: true },
      });
    });

    it("resolves with --force only (no name)", () => {
      const result = resolveSubcommand("onboard", ["--force"], sandbox);
      expect(result).toEqual({ tool: sandbox.onboardTool, params: { force: true } });
    });

    it("routes a step name as only, not name (inside container)", () => {
      const result = resolveSubcommand("onboard", ["slack"], sandbox);
      expect(result).toEqual({ tool: sandbox.onboardTool, params: { only: "slack" } });
    });

    it("routes sandbox-name + step as name + only", () => {
      const result = resolveSubcommand("onboard", ["my-agent", "slack"], sandbox);
      expect(result).toEqual({
        tool: sandbox.onboardTool,
        params: { name: "my-agent", only: "slack" },
      });
    });

    it("accepts every documented step", () => {
      for (const step of ONBOARD_STEPS) {
        const result = resolveSubcommand("onboard", [step], sandbox);
        if ("tool" in result) {
          expect(result.params).toEqual({ only: step });
        } else {
          expect.fail(`expected success for step "${step}"`);
        }
      }
    });

    it("treats unknown positional as sandbox name (host mode)", () => {
      const result = resolveSubcommand("onboard", ["my-agent-42"], sandbox);
      expect(result).toEqual({ tool: sandbox.onboardTool, params: { name: "my-agent-42" } });
    });

    it("combines step with --force", () => {
      const result = resolveSubcommand("onboard", ["slack", "--force"], sandbox);
      expect(result).toEqual({
        tool: sandbox.onboardTool,
        params: { only: "slack", force: true },
      });
    });
  });

  describe("ONBOARD_STEPS", () => {
    it("includes the six documented step names", () => {
      expect([...ONBOARD_STEPS].sort()).toEqual(
        ["claude", "cloudflare", "github", "llm", "slack", "ssh"].sort(),
      );
    });
  });

  describe("optional-name commands", () => {
    const commands = ["sandbox", "run", "stop", "clean"];

    for (const cmd of commands) {
      it(`resolves ${cmd} with name`, () => {
        const result = resolveSubcommand(cmd, ["my-agent"], sandbox);
        expect("tool" in result).toBe(true);
        if ("tool" in result) {
          expect(result.params).toEqual({ name: "my-agent" });
        }
      });

      it(`resolves ${cmd} without name`, () => {
        const result = resolveSubcommand(cmd, [], sandbox);
        expect("tool" in result).toBe(true);
        if ("tool" in result) {
          expect(result.params).toEqual({});
        }
      });
    }
  });

  describe("required-name commands", () => {
    const commands = ["shell", "worktree"];

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
  });

  describe("tool mapping", () => {
    it("maps sandbox to sandboxTool", () => {
      const result = resolveSubcommand("sandbox", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.sandboxTool);
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

    it("maps worktree to worktreeTool", () => {
      const result = resolveSubcommand("worktree", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.worktreeTool);
    });

    it("maps onboard to onboardTool", () => {
      const result = resolveSubcommand("onboard", ["x"], sandbox);
      expect("tool" in result && result.tool).toBe(sandbox.onboardTool);
    });
  });

  describe("ports command", () => {
    it("resolves with no args", () => {
      const result = resolveSubcommand("ports", [], sandbox);
      expect(result).toEqual({ tool: sandbox.portsTool, params: { name: undefined } });
    });

    it("resolves with name", () => {
      const result = resolveSubcommand("ports", ["my-agent"], sandbox);
      expect(result).toEqual({ tool: sandbox.portsTool, params: { name: "my-agent" } });
    });
  });

  describe("expose command", () => {
    it("resolves port + --local", () => {
      const result = resolveSubcommand("expose", ["3000", "--local"], sandbox);
      if ("tool" in result) {
        expect(result.tool).toBe(sandbox.exposeTool);
        expect(result.params).toEqual({ port: 3000, scope: "local", hostPort: undefined });
      } else expect.fail("expected success");
    });

    it("resolves port + --public", () => {
      const result = resolveSubcommand("expose", ["3000", "--public"], sandbox);
      if ("tool" in result) {
        expect(result.params).toEqual({ port: 3000, scope: "public", hostPort: undefined });
      } else expect.fail("expected success");
    });

    it("accepts --host-port", () => {
      const result = resolveSubcommand("expose", ["3000", "--local", "--host-port", "3300"], sandbox);
      if ("tool" in result) {
        expect(result.params).toEqual({ port: 3000, scope: "local", hostPort: "3300" });
      } else expect.fail("expected success");
    });

    it("errors without a port", () => {
      const result = resolveSubcommand("expose", ["--local"], sandbox);
      expect("error" in result).toBe(true);
    });

    it("errors without --local or --public", () => {
      const result = resolveSubcommand("expose", ["3000"], sandbox);
      expect("error" in result).toBe(true);
      if ("error" in result) expect(result.error).toContain("--local");
    });

    it("errors on non-numeric port", () => {
      const result = resolveSubcommand("expose", ["abc", "--local"], sandbox);
      expect("error" in result).toBe(true);
    });
  });

  describe("unexpose command", () => {
    it("resolves with port + scope", () => {
      const result = resolveSubcommand("unexpose", ["3000", "--public"], sandbox);
      if ("tool" in result) {
        expect(result.tool).toBe(sandbox.unexposeTool);
        expect(result.params).toEqual({ port: 3000, scope: "public", hostPort: undefined });
      } else expect.fail("expected success");
    });
  });

  describe("open command", () => {
    it("resolves with a port", () => {
      const result = resolveSubcommand("open", ["3000"], sandbox);
      if ("tool" in result) {
        expect(result.tool).toBe(sandbox.openTool);
        expect(result.params).toEqual({ port: 3000 });
      } else expect.fail("expected success");
    });

    it("errors without a port", () => {
      const result = resolveSubcommand("open", [], sandbox);
      expect("error" in result).toBe(true);
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

  it("does not document removed commands", () => {
    // build/rebuild/push should not appear as command entries
    expect(text).not.toMatch(/^\s+build\b/m);
    expect(text).not.toMatch(/^\s+rebuild\b/m);
    expect(text).not.toMatch(/^\s+push\b/m);
  });

  it("documents agent mode options", () => {
    expect(text).toContain("--provider");
    expect(text).toContain("--model");
    expect(text).toContain("--print");
    expect(text).toContain("--continue");
  });

  it("includes usage examples", () => {
    expect(text).toContain("openharness sandbox");
    expect(text).toContain("openharness onboard");
    expect(text).toContain("openharness clean");
  });
});
