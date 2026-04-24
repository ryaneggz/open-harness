import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeDown, composeEnv } from "../lib/docker.js";
import { runSafe } from "../lib/exec.js";

export const cleanTool: ToolDefinition = {
  name: "sandbox_clean",
  label: "Clean Sandbox",
  description: "Full cleanup: stop containers and remove volumes.",
  promptSnippet: "sandbox_clean — stop containers and remove volumes",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);
    const env = composeEnv(config);

    const stopped = runSafe(composeDown(config, true), { env });

    const msg = stopped
      ? `Sandbox '${config.name}' cleaned (containers stopped, volumes removed).`
      : `No running sandbox '${config.name}' found.`;

    return {
      content: [{ type: "text" as const, text: msg }],
      details: undefined,
    };
  },
};
