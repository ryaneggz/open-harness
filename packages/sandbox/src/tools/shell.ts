import { Type } from "typebox";
import type { ToolDefinition } from "../types.js";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const shellTool: ToolDefinition = {
  name: "sandbox_shell",
  label: "Shell into Sandbox",
  description:
    "Open an interactive login shell inside a running sandbox container. Uses the user's $SHELL (zsh by default), falling back to bash.",
  promptSnippet: "sandbox_shell — open interactive login shell ($SHELL, default zsh) in a sandbox",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const name = params.name as string;
    const cmd = execCmd(name, ["/bin/sh", "-lc", 'exec "${SHELL:-/bin/zsh}" -l'], {
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
