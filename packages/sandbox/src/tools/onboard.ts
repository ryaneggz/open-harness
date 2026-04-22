import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

export const onboardTool: ToolDefinition = {
  name: "sandbox_onboard",
  label: "Onboard Sandbox",
  description:
    "Interactive first-time setup wizard. Configures SSH, GitHub CLI, Cloudflare tunnel, and Claude Code auth, then starts the dev server.",
  promptSnippet: "sandbox_onboard — interactive onboarding wizard for sandbox setup",
  parameters: Type.Object({
    name: Type.Optional(
      Type.String({ description: "Sandbox name (omit if already inside container)" }),
    ),
    force: Type.Optional(
      Type.Boolean({ description: "Re-verify all steps even if already onboarded" }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const name = params.name as string | undefined;
    const force = params.force as boolean | undefined;
    const args = force ? ["--force"] : [];

    if (name) {
      // Host mode: exec into the named container
      const cmd = execCmd(name, ["bash", "/home/sandbox/install/onboard.sh", ...args], {
        user: "sandbox",
        interactive: true,
        env: { HOME: "/home/sandbox" },
      });

      try {
        run(cmd);
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: container '${name}' is not running. Start it first: openharness run ${name}`,
            },
          ],
          details: undefined,
        };
      }
    } else {
      // Inside-container mode: run the onboard script directly
      const script = "/home/sandbox/install/onboard.sh";
      if (!existsSync(script)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: onboard.sh not found. Are you inside a sandbox container?",
            },
          ],
          details: undefined,
        };
      }

      const result = spawnSync("bash", [script, ...args], {
        stdio: "inherit",
        env: { ...process.env },
      });

      if (result.status !== 0) {
        return {
          content: [{ type: "text" as const, text: "Onboarding did not complete successfully." }],
          details: undefined,
        };
      }
    }

    return {
      content: [{ type: "text" as const, text: "Onboarding complete." }],
      details: undefined,
    };
  },
};
