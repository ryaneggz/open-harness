import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeDown, buildCmd, composeUp, composeEnv } from "../lib/docker.js";
import { run, runSafe } from "../lib/exec.js";

export const rebuildTool: ToolDefinition = {
  name: "sandbox_rebuild",
  label: "Rebuild Sandbox",
  description: "Tear down, rebuild Docker image (no cache), and start the sandbox container.",
  promptSnippet: "sandbox_rebuild — full rebuild with no cache",
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

    runSafe(composeDown(config, true), { env });
    run(buildCmd(config, true), { env });
    run(composeUp(config), { env });

    return {
      content: [{ type: "text" as const, text: `Sandbox '${config.name}' rebuilt and started.` }],
      details: undefined,
    };
  },
};
