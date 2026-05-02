import { Type } from "typebox";
import type { ToolDefinition } from "../types.js";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeUp, composeEnv } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const sandboxTool: ToolDefinition = {
  name: "sandbox_sandbox",
  label: "Start Sandbox",
  description:
    "Start the .devcontainer sandbox. Runs docker compose up with overlays from .openharness/config.json.",
  promptSnippet: "sandbox_sandbox — start the .devcontainer sandbox",
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
