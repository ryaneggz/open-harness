import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const heartbeatTool: ToolDefinition = {
  name: "sandbox_heartbeat",
  label: "Heartbeat",
  description:
    "Manage heartbeat cron schedules for a sandbox. Actions: sync (install crontab from heartbeats.conf), stop (remove all cron entries), status (show schedules and logs), migrate (convert legacy HEARTBEAT_INTERVAL to heartbeats.conf).",
  promptSnippet: "sandbox_heartbeat — manage heartbeat cron schedules (sync/stop/status/migrate)",
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

    const cmd = execCmd(name, ["bash", "-c", `/home/sandbox/install/heartbeat.sh ${action}`], {
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
