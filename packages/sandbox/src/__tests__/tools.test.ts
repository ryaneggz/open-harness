import { describe, it, expect } from "vitest";
import { sandboxTools } from "../tools/index.js";

describe("sandboxTools", () => {
  it("exports all 11 tools", () => {
    expect(sandboxTools).toHaveLength(11);
  });

  it("each tool has required fields", () => {
    for (const tool of sandboxTools) {
      expect(tool.name).toBeTruthy();
      expect(tool.label).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeTruthy();
      expect(typeof tool.execute).toBe("function");
    }
  });

  it("tool names are unique", () => {
    const names = sandboxTools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("tool names follow sandbox_ prefix convention", () => {
    for (const tool of sandboxTools) {
      expect(tool.name).toMatch(/^sandbox_/);
    }
  });

  const expectedTools = [
    "sandbox_list",
    "sandbox_quickstart",
    "sandbox_build",
    "sandbox_rebuild",
    "sandbox_run",
    "sandbox_shell",
    "sandbox_stop",
    "sandbox_clean",
    "sandbox_push",
    "sandbox_heartbeat",
    "sandbox_worktree",
  ];

  for (const name of expectedTools) {
    it(`includes ${name}`, () => {
      expect(sandboxTools.find((t) => t.name === name)).toBeTruthy();
    });
  }
});
