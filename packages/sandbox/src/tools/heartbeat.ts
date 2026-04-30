import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const heartbeatTool: ToolDefinition = {
  name: "sandbox_heartbeat",
  label: "Heartbeat",
  description:
    "Manage heartbeat daemon for a sandbox. Actions: sync (re-read heartbeat .md files), stop (remove all schedules), status (show schedules and logs), migrate (convert legacy HEARTBEAT.md to frontmatter format).",
  promptSnippet: "sandbox_heartbeat — manage heartbeat daemon (sync/stop/status/migrate)",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    action: Type.Union(
      [Type.Literal("sync"), Type.Literal("stop"), Type.Literal("status"), Type.Literal("migrate")],
      { description: "Heartbeat action: sync, stop, status, or migrate" },
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const name = params.name as string;
    const action = params.action as string;

    const cmd = execCmd(name, ["heartbeat-daemon", action], {
      user: "sandbox",
    });

    try {
      run(cmd);
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: container '${name}' is not running. Start it first.`,
          },
        ],
        details: undefined,
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `Heartbeat ${action} completed for '${name}'.`,
        },
      ],
      details: undefined,
    };
  },
};
