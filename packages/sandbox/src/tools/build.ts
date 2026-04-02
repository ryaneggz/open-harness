import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { buildCmd, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const buildTool: ToolDefinition = {
  name: "sandbox_build",
  label: "Build Sandbox",
  description: "Build the Docker image for a sandbox.",
  promptSnippet: "sandbox_build — build Docker image for a named sandbox",
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

    run(buildCmd(config), { env });

    return {
      content: [{ type: "text" as const, text: `Image built: ${config.image}` }],
      details: undefined,
    };
  },
};
