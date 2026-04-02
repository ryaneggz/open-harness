import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { pushCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const pushTool: ToolDefinition = {
  name: "sandbox_push",
  label: "Push Sandbox Image",
  description: "Push a sandbox Docker image to the registry.",
  promptSnippet: "sandbox_push — push sandbox image to registry",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    tag: Type.Optional(Type.String({ description: "Image tag (default: latest)" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);

    run(pushCmd(config));

    return {
      content: [{ type: "text" as const, text: `Image pushed: ${config.image}` }],
      details: undefined,
    };
  },
};
