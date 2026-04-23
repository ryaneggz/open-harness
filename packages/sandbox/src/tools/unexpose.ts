import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

export const unexposeTool: ToolDefinition = {
  name: "sandbox_unexpose",
  label: "Unexpose App",
  description:
    "Stop an active exposure for a sandbox app. Phase 2 — currently returns guidance only.",
  promptSnippet: "sandbox_unexpose — stop an active port exposure (Phase 2 stub)",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name" })),
    port: Type.Number({ description: "Container port to unexpose" }),
    scope: Type.Union([Type.Literal("local"), Type.Literal("public")], {
      description: "Which exposure to remove",
    }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const port = params.port as number;
    const scope = params.scope as "local" | "public";

    const guidance =
      scope === "local"
        ? `unexpose --local not yet implemented (Phase 2).\n` +
          `Workaround: run 'openharness stop && openharness run' to rebuild with no exposures, ` +
          `or remove .devcontainer/docker-compose.expose.yml from .openharness/config.json composeOverrides.`
        : `unexpose --public not yet implemented (Phase 2).\n` +
          `Workaround: from inside the sandbox shell, run:\n` +
          `  tmux kill-session -t expose-public-${port}`;

    return {
      content: [{ type: "text" as const, text: guidance }],
      details: undefined,
    };
  },
};
