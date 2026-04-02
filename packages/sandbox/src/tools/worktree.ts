import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";

export const worktreeTool: ToolDefinition = {
  name: "sandbox_worktree",
  label: "Create Worktree",
  description: "Create a git worktree for a sandbox (without building or starting the container).",
  promptSnippet: "sandbox_worktree — create a git worktree for a sandbox",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    branch: Type.Optional(Type.String({ description: "Git branch (default: agent/<name>)" })),
    baseBranch: Type.Optional(
      Type.String({
        default: "main",
        description: "Base branch for worktree (default: main)",
      }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);
    const worktreeAbs = resolve(process.cwd(), config.worktreePath);

    if (existsSync(worktreeAbs)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Worktree already exists: ${config.worktreePath}`,
          },
        ],
        details: undefined,
      };
    }

    try {
      execSync(`git fetch origin ${config.baseBranch} 2>/dev/null || true`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch {
      // Ignore fetch errors
    }

    execSync(
      `git worktree add ${config.worktreePath} -b ${config.branch} origin/${config.baseBranch}`,
      { encoding: "utf-8", stdio: "inherit" },
    );

    return {
      content: [
        {
          type: "text" as const,
          text: `Worktree created: ${config.worktreePath} (branch: ${config.branch})`,
        },
      ],
      details: undefined,
    };
  },
};
