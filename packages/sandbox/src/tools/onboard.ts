import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { runOnboardCommand } from "../cli/onboard.js";

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
    only: Type.Optional(
      Type.String({
        description:
          "Run only one step (llm|github|slack|ssh|cloudflare|claude); skips the marker short-circuit",
      }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const exitCode = await runOnboardCommand({
      name: params.name as string | undefined,
      force: params.force as boolean | undefined,
      only: params.only as string | undefined,
    });

    if (exitCode !== 0) {
      return {
        content: [{ type: "text" as const, text: "Onboarding did not complete successfully." }],
        details: undefined,
      };
    }

    return {
      content: [{ type: "text" as const, text: "Onboarding complete." }],
      details: undefined,
    };
  },
};
