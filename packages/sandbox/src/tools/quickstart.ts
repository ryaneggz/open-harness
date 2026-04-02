import { Type } from "@sinclair/typebox";
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig, type SandboxOptions } from "../lib/config.js";
import { buildCmd, composeUp, composeEnv, execCmd } from "../lib/docker.js";
import { run } from "../lib/exec.js";

export const quickstartTool: ToolDefinition = {
  name: "sandbox_quickstart",
  label: "Quickstart Sandbox",
  description:
    "Full sandbox setup: create git worktree, build Docker image, start container, and run setup script. This is the primary way to provision a new agent sandbox.",
  promptSnippet: "sandbox_quickstart — full sandbox provisioning (worktree + build + run + setup)",
  parameters: Type.Object({
    name: Type.String({ description: "Sandbox name" }),
    branch: Type.Optional(Type.String({ description: "Git branch (default: agent/<name>)" })),
    baseBranch: Type.Optional(
      Type.String({
        default: "main",
        description: "Base branch for worktree (default: main)",
      }),
    ),
    tag: Type.Optional(Type.String({ description: "Image tag (default: latest)" })),
    docker: Type.Optional(
      Type.Boolean({ description: "Enable Docker-in-Docker (default: false)" }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const opts = params as unknown as SandboxOptions;
    const baseBranch = (opts.baseBranch as string) ?? "main";
    const steps: string[] = [];

    // Step 1: Create worktree
    const initialConfig = new SandboxConfig({ ...opts, baseBranch });
    const worktreeAbs = resolve(process.cwd(), initialConfig.worktreePath);

    if (!existsSync(worktreeAbs)) {
      steps.push(
        `Creating worktree: ${initialConfig.worktreePath} (branch: ${initialConfig.branch})`,
      );

      try {
        execSync(`git fetch origin ${baseBranch} 2>/dev/null || true`, {
          encoding: "utf-8",
          stdio: "pipe",
        });
      } catch {
        // Ignore fetch errors
      }

      execSync(
        `git worktree add ${initialConfig.worktreePath} -b ${initialConfig.branch} origin/${baseBranch}`,
        { encoding: "utf-8", stdio: "inherit" },
      );
    } else {
      steps.push(`Worktree already exists: ${initialConfig.worktreePath}`);
    }

    // Step 2: Re-resolve config now that worktree exists (for projectRoot)
    const config = new SandboxConfig({ ...opts, baseBranch });
    const env = composeEnv(config);

    // Step 3: Build Docker image
    steps.push(`Building image: ${config.image}`);
    run(buildCmd(config), { env });

    // Step 4: Start container
    steps.push("Starting container...");
    run(composeUp(config), { env });

    // Step 5: Run setup
    steps.push("Running setup...");
    const setupCmd = execCmd(
      config.name,
      ["bash", "-c", "/home/sandbox/install/setup.sh --non-interactive"],
      {
        user: "root",
      },
    );
    run(setupCmd);

    // Build result message
    const branch = execSync(`git -C ${initialConfig.worktreePath} branch --show-current`, {
      encoding: "utf-8",
    }).trim();

    steps.push("");
    steps.push(`Sandbox '${config.name}' is ready!`);
    steps.push(`  Worktree: ${initialConfig.worktreePath}`);
    steps.push(`  Branch:   ${branch}`);
    steps.push("");
    steps.push(`  Enter: openharness (then /shell ${config.name})`);

    return {
      content: [{ type: "text" as const, text: steps.join("\n") }],
      details: undefined,
    };
  },
};
