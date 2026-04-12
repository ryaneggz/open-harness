import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeDown, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const stopTool: ToolDefinition = {
  name: "sandbox_stop",
  label: "Stop Sandbox",
  description: "Stop and remove the sandbox container (docker compose down).",
  promptSnippet: "sandbox_stop — stop and remove the sandbox container",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);
    const env = composeEnv(config);

    try {
      run(composeDown(config), { env });
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: no sandbox '${config.name}' found to stop.`,
          },
        ],
        details: undefined,
      };
    }

    return {
      content: [{ type: "text" as const, text: `Sandbox '${config.name}' stopped.` }],
      details: undefined,
    };
  },
};
