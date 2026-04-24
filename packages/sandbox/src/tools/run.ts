import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeUp, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const runTool: ToolDefinition = {
  name: "sandbox_run",
  label: "Run Sandbox",
  description: "Start the sandbox container (docker compose up -d --build).",
  promptSnippet: "sandbox_run — start the sandbox container",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);
    const env = composeEnv(config);

    run(composeUp(config), { env });

    return {
      content: [{ type: "text" as const, text: `Sandbox '${config.name}' started.` }],
      details: undefined,
    };
  },
};
