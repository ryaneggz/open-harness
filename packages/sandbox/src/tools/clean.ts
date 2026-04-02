import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { composeDown, composeEnv } from "../lib/docker.js";
import { runSafe } from "../lib/exec.js";

export const cleanTool: ToolDefinition = {
  name: "sandbox_clean",
  label: "Clean Sandbox",
  description: "Full cleanup: stop container, remove image, and remove git worktree for a sandbox.",
  promptSnippet: "sandbox_clean — full cleanup (container + image + worktree)",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    branch: Type.Optional(Type.String({ description: "Git branch (default: agent/<name>)" })),
    baseBranch: Type.Optional(
      Type.String({ description: "Base branch for worktree (default: development)" }),
    ),
    tag: Type.Optional(Type.String({ description: "Image tag (default: latest)" })),
    docker: Type.Optional(
      Type.Boolean({ description: "Enable Docker-in-Docker (default: false)" }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const config = new SandboxConfig(params as unknown as SandboxOptions);
    const env = composeEnv(config);
    const results: string[] = [];

    // Stop container and remove image
    const stopped = runSafe(composeDown(config, true), { env });
    if (stopped) {
      results.push(`Container and image removed for '${config.name}'.`);
    } else {
      results.push(`No running container found for '${config.name}'.`);
    }

    // Remove worktree
    const worktreeAbs = resolve(process.cwd(), config.worktreePath);
    if (existsSync(worktreeAbs)) {
      try {
        execSync(`git worktree remove ${config.worktreePath} --force`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
        results.push(`Worktree removed: ${config.worktreePath}`);
      } catch (err) {
        results.push(`Failed to remove worktree: ${(err as Error).message}`);
      }
    } else {
      results.push(`No worktree found at ${config.worktreePath}.`);
    }

    return {
      content: [{ type: "text" as const, text: results.join("\n") }],
      details: undefined,
    };
  },
};
