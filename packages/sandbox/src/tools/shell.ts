import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const shellTool: ToolDefinition = {
  name: "sandbox_shell",
  label: "Shell into Sandbox",
  description: "Open an interactive bash shell inside a running sandbox container.",
  promptSnippet: "sandbox_shell — open interactive bash shell in a sandbox",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const name = params.name as string;
    const cmd = execCmd(name, ["bash", "--login"], {
      user: "sandbox",
      interactive: true,
      workdir: "/home/sandbox/workspace",
      env: { HOME: "/home/sandbox" },
    });

    try {
      run(cmd);
    } catch {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error: container '${name}' is not running. Start it with: openharness (then /run ${name})`,
          },
        ],
        details: undefined,
      };
    }

    return {
      content: [{ type: "text" as const, text: `Shell session ended for '${name}'.` }],
      details: undefined,
    };
  },
};
