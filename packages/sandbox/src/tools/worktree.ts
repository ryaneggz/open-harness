import { Type } from "typebox";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolDefinition } from "../types.js";

export const worktreeTool: ToolDefinition = {
  name: "sandbox_worktree",
  label: "Create Worktree",
  description:
    "Create a git worktree for a sandbox (advanced — for branch isolation without a container).",
  promptSnippet: "sandbox_worktree — create a git worktree for branch isolation",
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
    const name = params.name as string;
    const branch = (params.branch as string) ?? `agent/${name}`;
    const baseBranch = (params.baseBranch as string) ?? "main";
    const worktreePath = `.worktrees/${branch}`;
    const worktreeAbs = resolve(process.cwd(), worktreePath);

    if (existsSync(worktreeAbs)) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Worktree already exists: ${worktreePath}`,
          },
        ],
        details: undefined,
      };
    }

    try {
      execSync(`git fetch origin ${baseBranch} 2>/dev/null || true`, {
        encoding: "utf-8",
        stdio: "pipe",
      });
    } catch {
      // Ignore fetch errors
    }

    execSync(`git worktree add ${worktreePath} -b ${branch} origin/${baseBranch}`, {
      encoding: "utf-8",
      stdio: "inherit",
    });

    return {
      content: [
        {
          type: "text" as const,
          text: `Worktree created: ${worktreePath} (branch: ${branch})`,
        },
      ],
      details: undefined,
    };
  },
};
