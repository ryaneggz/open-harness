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
  "run",
  "shell",
  "stop",
  "clean",
  "heartbeat",
  "worktree",
  "onboard",
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
  runTool: ToolDefinition;
  shellTool: ToolDefinition;
  stopTool: ToolDefinition;
  cleanTool: ToolDefinition;
  heartbeatTool: ToolDefinition;
  worktreeTool: ToolDefinition;
  onboardTool: ToolDefinition;
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
    if (arg === "--force") {
      params.force = true;
    } else if (arg === "--base-branch" && args[i + 1]) {
      params.baseBranch = args[++i];
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

  // onboard: name is optional
  if (command === "onboard") {
    const params = parseToolArgs(args);
    return { tool: sandbox.onboardTool, params };
  }

  // quickstart, run, stop, clean: name is optional (auto-resolved)
  if (command === "quickstart" || command === "run" || command === "stop" || command === "clean") {
    const params = parseToolArgs(args);
    const toolMap: Record<string, ToolDefinition> = {
      quickstart: sandbox.quickstartTool,
      run: sandbox.runTool,
      stop: sandbox.stopTool,
      clean: sandbox.cleanTool,
    };
    return { tool: toolMap[command], params };
  }

  // worktree, shell: name required
  const params = parseToolArgs(args);
  if (!params.name) {
    return { error: `Usage: openharness ${command} <name> [options]` };
  }

  const toolMap: Record<string, ToolDefinition | undefined> = {
    shell: sandbox.shellTool,
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

${b}Commands:${r}
  ${b}list${r}                              List running sandboxes
  ${b}quickstart${r} [name]                 Build and start sandbox (.devcontainer)
  ${b}run${r} [name]                        Start container
  ${b}shell${r} <name>                      Open interactive bash shell
  ${b}stop${r} [name]                       Stop and remove container
  ${b}clean${r} [name]                      Full cleanup (containers + volumes)
  ${b}onboard${r} [name] [--force]          Interactive first-time setup wizard
  ${b}heartbeat${r} <action> <name>         Manage heartbeats (sync|stop|status|migrate)

${b}Advanced:${r}
  ${b}worktree${r} <name> [--base-branch]   Create git worktree for branch isolation

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
  ${d}# Provision and start the sandbox${r}
  openharness quickstart

  ${d}# Check what's running${r}
  openharness list

  ${d}# Enter the sandbox${r}
  openharness shell my-sandbox

  ${d}# One-time auth setup${r}
  openharness onboard my-sandbox

  ${d}# Tear down${r}
  openharness clean

  ${d}# Launch AI agent mode${r}
  openharness
`;
}
