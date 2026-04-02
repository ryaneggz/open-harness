import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

export const listTool: ToolDefinition = {
  name: "sandbox_list",
  label: "List Sandboxes",
  description: "List all running sandbox containers and git worktrees. No parameters required.",
  promptSnippet: "sandbox_list — list running sandbox containers and worktrees",
  parameters: Type.Object({}),

  async execute() {
    const lines: string[] = [];

    lines.push("\n  Running containers:");
    try {
      const ps = execSync(
        'docker ps --filter "label=com.docker.compose.service=sandbox" --format "table {{.Names}}\\t{{.Status}}\\t{{.Image}}"',
        { encoding: "utf-8" },
      ).trim();
      lines.push(ps || "  (none)");
    } catch {
      lines.push("  (docker not available or no containers running)");
    }

    lines.push("\n  Worktrees:");
    try {
      const wt = execSync("git worktree list", { encoding: "utf-8" }).trim();
      lines.push(wt);
    } catch {
      lines.push("  (not a git repository)");
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
