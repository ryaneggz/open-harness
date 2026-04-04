/**
 * CLI logic extracted for testability.
 *
 * index.ts handles process-level concerns (argv, exit codes).
 * This module contains the pure logic: argument parsing, subcommand
 * routing, result formatting, and help text generation.
 */

import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

// ─── Constants ─────────────────────────────────────────────────────

export const SUBCOMMANDS = new Set([
  "list",
  "quickstart",
  "build",
  "rebuild",
  "run",
  "shell",
  "stop",
  "clean",
  "push",
  "heartbeat",
  "worktree",
]);

export const INSTALL_HINT =
  "Sandbox tools not installed. Run: openharness install @openharness/sandbox";

export const HEARTBEAT_ACTIONS = ["sync", "stop", "status", "migrate"] as const;

// ─── Types ─────────────────────────────────────────────────────────

export interface ToolResult {
  content: Array<{ type: string; text?: string }>;
}

export interface SandboxModule {
  listTool: ToolDefinition;
  quickstartTool: ToolDefinition;
  buildTool: ToolDefinition;
  rebuildTool: ToolDefinition;
  runTool: ToolDefinition;
  shellTool: ToolDefinition;
  stopTool: ToolDefinition;
  cleanTool: ToolDefinition;
  pushTool: ToolDefinition;
  heartbeatTool: ToolDefinition;
  worktreeTool: ToolDefinition;
}

// ─── Argument parsing ──────────────────────────────────────────────

/**
 * Parse CLI args into tool params object.
 */
export function parseToolArgs(args: string[]): Record<string, string | boolean> {
  const params: Record<string, string | boolean> = {};
  let positionalIndex = 0;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--base-branch" && args[i + 1]) {
      params.baseBranch = args[++i];
    } else if (arg === "--tag" && args[i + 1]) {
      params.tag = args[++i];
    } else if (arg === "--branch" && args[i + 1]) {
      params.branch = args[++i];
    } else if (arg === "--docker") {
      params.docker = true;
    } else if (!arg.startsWith("-")) {
      if (positionalIndex === 0) {
        params.name = arg;
      } else if (positionalIndex === 1) {
        params.action = arg;
      }
      positionalIndex++;
    }
  }

  return params;
}

// ─── Result formatting ─────────────────────────────────────────────

/**
 * Extract text lines from a ToolResult.
 */
export function formatResult(result: ToolResult): string[] {
  const lines: string[] = [];
  for (const item of result.content) {
    if (item.type === "text" && item.text) {
      lines.push(item.text);
    }
  }
  return lines;
}

// ─── Subcommand routing ────────────────────────────────────────────

export interface SubcommandResult {
  ok: boolean;
  error?: string;
  output?: string[];
}

/**
 * Resolve the tool and params for a subcommand, without executing.
 * Returns the tool + params to execute, or an error.
 */
export function resolveSubcommand(
  command: string,
  args: string[],
  sandbox: SandboxModule,
): { tool: ToolDefinition; params: Record<string, unknown> } | { error: string } {
  // heartbeat: <action> <name>
  if (command === "heartbeat") {
    const action = args[0];
    const name = args[1];
    if (!action || !name || !(HEARTBEAT_ACTIONS as readonly string[]).includes(action)) {
      return { error: "Usage: openharness heartbeat <sync|stop|status|migrate> <name>" };
    }
    return { tool: sandbox.heartbeatTool, params: { name, action } };
  }

  // list: no name required
  if (command === "list") {
    return { tool: sandbox.listTool, params: {} };
  }

  // all other commands: name required
  const params = parseToolArgs(args);
  if (!params.name) {
    return { error: `Usage: openharness ${command} <name> [options]` };
  }

  const toolMap: Record<string, ToolDefinition | undefined> = {
    quickstart: sandbox.quickstartTool,
    build: sandbox.buildTool,
    rebuild: sandbox.rebuildTool,
    run: sandbox.runTool,
    shell: sandbox.shellTool,
    stop: sandbox.stopTool,
    clean: sandbox.cleanTool,
    push: sandbox.pushTool,
    worktree: sandbox.worktreeTool,
  };

  const tool = toolMap[command];
  if (!tool) {
    return { error: `Unknown command: ${command}` };
  }

  return { tool, params };
}

// ─── Help text ─────────────────────────────────────────────────────

export function helpText(version: string): string {
  const b = "\x1b[1m";
  const r = "\x1b[0m";
  const d = "\x1b[2m";

  return `${b}openharness${r} — AI-powered sandbox orchestrator ${d}(built on pi ${version})${r}

${b}Usage:${r}
  openharness <command> [options]
  openharness [pi-options] [messages...]     ${d}Launch AI agent mode${r}

${b}Commands:${r} ${d}(requires: openharness install @openharness/sandbox)${r}
  ${b}list${r}                              List running sandboxes and worktrees
  ${b}quickstart${r} <name> [options]       Full setup: worktree + build + run + setup
  ${b}build${r} <name>                      Build Docker image
  ${b}rebuild${r} <name>                    Rebuild (no cache)
  ${b}run${r} <name>                        Start container
  ${b}shell${r} <name>                      Open interactive bash shell
  ${b}stop${r} <name>                       Stop and remove container
  ${b}clean${r} <name>                      Full cleanup (container + image + worktree)
  ${b}push${r} <name>                       Push image to registry
  ${b}worktree${r} <name> [options]         Create git worktree only
  ${b}heartbeat${r} <action> <name>         Manage heartbeats (sync|stop|status|migrate)

${b}Command Options:${r}
  --base-branch <branch>           Base branch (default: main)
  --docker                         Enable Docker-in-Docker
  --tag <tag>                      Image tag (default: latest)
  --branch <branch>                Git branch (default: agent/<name>)

${b}Agent Mode:${r}
  Run without a command to launch the interactive AI agent.
  The agent can orchestrate sandbox workflows conversationally
  and has access to all sandbox tools plus read, write, edit, bash.

${b}Agent Options:${r}
  --provider <name>              LLM provider (default: google)
  --model <pattern>              Model pattern or ID
  --api-key <key>                API key (defaults to env vars)
  --thinking <level>             Thinking: off, minimal, low, medium, high, xhigh
  --print, -p                    Non-interactive: process prompt and exit
  --continue, -c                 Continue previous session
  --help, -h                     Show this help
  --version, -v                  Show version

${b}Examples:${r}
  ${d}# Install sandbox tools${r}
  openharness install @openharness/sandbox

  ${d}# Provision a new sandbox${r}
  openharness quickstart my-agent --base-branch main

  ${d}# Check what's running${r}
  openharness list

  ${d}# Enter a sandbox${r}
  openharness shell my-agent

  ${d}# Tear down${r}
  openharness clean my-agent

  ${d}# Launch AI agent mode${r}
  openharness

  ${d}# Ask the agent to do it${r}
  openharness -p "provision a blog-writer agent with heartbeats"
`;
}
