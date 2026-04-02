import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeUp, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const runTool: ToolDefinition = {
  name: "sandbox_run",
  label: "Run Sandbox",
  description: "Start a sandbox container (docker compose up -d).",
  promptSnippet: "sandbox_run — start a sandbox container",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    branch: Type.Optional(Type.String({ description: "Git branch (default: agent/<name>)" })),
    baseBranch: Type.Optional(
      Type.String({ description: "Base branch for worktree (default: development)" }),
    ),
    tag: Type.Optional(Type.String({ description: "Image tag (default: latest)" })),
    docker: Type.Optional(
      Type.Boolean({ description: "Enable Docker-in-Docker (default: false)" }),
    ),
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
