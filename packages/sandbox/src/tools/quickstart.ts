import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeUp, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const quickstartTool: ToolDefinition = {
  name: "sandbox_quickstart",
  label: "Quickstart Sandbox",
  description:
    "Build and start the sandbox container using .devcontainer. This is the primary way to provision a new sandbox.",
  promptSnippet: "sandbox_quickstart — build and start the sandbox container",
  parameters: Type.Object({
    name: Type.Optional(
      Type.String({ description: "Sandbox name (auto-resolved from git remote if omitted)" }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const opts = params as unknown as SandboxOptions;
    const config = new SandboxConfig(opts);
    const env = composeEnv(config);
    const steps: string[] = [];

    // Build and start container
    steps.push(`Starting sandbox '${config.name}'...`);
    steps.push(`Compose files: ${config.composeFiles.join(", ")}`);
    run(composeUp(config), { env });

    steps.push("");
    steps.push(`Sandbox '${config.name}' is running!`);
    steps.push("");
    steps.push("  Next steps:");
    steps.push(`    openharness onboard ${config.name}    # one-time auth setup`);
    steps.push(`    openharness shell ${config.name}       # enter the sandbox`);

    return {
      content: [{ type: "text" as const, text: steps.join("\n") }],
      details: undefined,
    };
  },
};
