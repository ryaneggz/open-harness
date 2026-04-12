import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

export const listTool: ToolDefinition = {
  name: "sandbox_list",
  label: "List Sandboxes",
  description: "List all running sandbox containers. No parameters required.",
  promptSnippet: "sandbox_list — list running sandbox containers",
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

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
