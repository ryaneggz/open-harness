/**
 * CLI logic extracted for testability.
 *
 * index.ts handles process-level concerns (argv, exit codes).
 * This module contains the pure logic: argument parsing, subcommand
 * routing, result formatting, and help text generation.
 */

import { existsSync } from "node:fs";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";

// ─── Environment ──────────────────────────────────────────────────

export function isInsideContainer(): boolean {
  return existsSync("/.dockerenv");
}

/** Commands that manage containers — only work from the host. */
export const HOST_ONLY_COMMANDS = new Set(["sandbox", "run", "stop", "clean", "list", "shell"]);

// ─── Constants ─────────────────────────────────────────────────────

export const SUBCOMMANDS = new Set([
  "list",
  "sandbox",
  "run",
  "shell",
  "stop",
  "clean",
  "heartbeat",
  "worktree",
  "onboard",
  "ports",
  "expose",
  "unexpose",
  "open",
]);

export const HEARTBEAT_ACTIONS = ["sync", "stop", "status", "migrate"] as const;

/** Named steps accepted by `openharness onboard <step>` — matches install/onboard.sh. */
export const ONBOARD_STEPS = new Set(["llm", "slack", "ssh", "github", "cloudflare", "claude"]);

// ─── Types ─────────────────────────────────────────────────────────

export interface ToolResult {
  content: Array<{ type: string; text?: string }>;
}

export interface SandboxModule {
  listTool: ToolDefinition;
  sandboxTool: ToolDefinition;
  runTool: ToolDefinition;
  shellTool: ToolDefinition;
  stopTool: ToolDefinition;
  cleanTool: ToolDefinition;
  heartbeatTool: ToolDefinition;
  worktreeTool: ToolDefinition;
  onboardTool: ToolDefinition;
  portsTool: ToolDefinition;
  exposeTool: ToolDefinition;
  unexposeTool: ToolDefinition;
  openTool: ToolDefinition;
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

  // ports: name optional, extra args ignored
  if (command === "ports") {
    const params = parseToolArgs(args);
    return { tool: sandbox.portsTool, params: { name: params.name } };
  }

  // expose: `openharness expose <name> <port>` → Caddy route.
  if (command === "expose") {
    const params = parseToolArgs(args);
    const first = params.name as string | undefined;
    const second = params.action as string | undefined;

    if (!first || !second) {
      return { error: "Usage: openharness expose <name> <port>" };
    }
    const port = Number(second);
    if (!Number.isFinite(port)) {
      return { error: `Port must be a number, got '${second}'.` };
    }
    if (!Number.isNaN(Number(first))) {
      return {
        error:
          `Usage: openharness expose <name> <port>\n` +
          `(The first positional is the route name, not a port. Example: openharness expose docs 8080)`,
      };
    }
    return {
      tool: sandbox.exposeTool,
      params: { routeName: first, port },
    };
  }

  // unexpose: `openharness unexpose <name>` → remove Caddy route.
  if (command === "unexpose") {
    const params = parseToolArgs(args);
    const first = params.name as string | undefined;
    if (!first) {
      return { error: "Usage: openharness unexpose <name>" };
    }
    return {
      tool: sandbox.unexposeTool,
      params: { routeName: first },
    };
  }

  // open: `openharness open <name>` or `openharness open <port>`
  if (command === "open") {
    const params = parseToolArgs(args);
    const first = params.name as string | undefined;
    if (!first) {
      return { error: "Usage: openharness open <name|port>" };
    }
    const maybePort = Number(first);
    return {
      tool: sandbox.openTool,
      params: Number.isFinite(maybePort) ? { port: maybePort } : { routeName: first },
    };
  }

  // list: no name required
  if (command === "list") {
    return { tool: sandbox.listTool, params: {} };
  }

  // onboard: name is optional; a positional matching a known step
  // (e.g. `oh onboard slack`) becomes `only`, not `name`. Matches the
  // TS `sandbox_onboard` tool schema.
  if (command === "onboard") {
    const params = parseToolArgs(args);
    if (typeof params.name === "string" && ONBOARD_STEPS.has(params.name)) {
      params.only = params.name;
      delete params.name;
    } else if (typeof params.action === "string" && ONBOARD_STEPS.has(params.action)) {
      params.only = params.action;
      delete params.action;
    }
    return { tool: sandbox.onboardTool, params };
  }

  // sandbox, run, stop, clean: name is optional (auto-resolved)
  if (command === "sandbox" || command === "run" || command === "stop" || command === "clean") {
    const params = parseToolArgs(args);
    const toolMap: Record<string, ToolDefinition> = {
      sandbox: sandbox.sandboxTool,
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
  const y = "\x1b[33m"; // yellow
  const inside = isInsideContainer();

  // Mark host-only commands as disabled when inside the container
  const h = (cmd: string, desc: string) =>
    inside ? `  ${d}${cmd}${r}  ${y}(host only)${r}` : `  ${b}${cmd}${r}  ${desc}`;

  const pad = (cmd: string, width = 36) => cmd.padEnd(width);

  let text = `${b}openharness${r} — AI-powered sandbox orchestrator ${d}(built on pi ${version})${r}

${b}Usage:${r}
  openharness <command> [options]            ${d}(alias: oh)${r}
  openharness [pi-options] [messages...]     ${d}Launch AI agent mode${r}

${b}Commands:${r}
${h(pad("sandbox [name]"), "Build and start sandbox (.devcontainer)")}
${h(pad("run [name]"), "Start container")}
${h(pad("shell <name>"), "Open interactive bash shell")}
${h(pad("stop [name]"), "Stop and remove container")}
${h(pad("clean [name]"), "Full cleanup (containers + volumes)")}
${h(pad("list"), "List running sandboxes")}
  ${b}${pad("onboard [name|step] [--force]")}${r}Setup wizard — or one step (slack, llm, ssh, github, cloudflare, claude)
  ${b}${pad("heartbeat <action> <name>")}${r}Manage heartbeats (sync|stop|status|migrate)

${b}Advanced:${r}
  ${b}${pad("worktree <name> [--base-branch]")}${r}Create git worktree for branch isolation

${b}Exposure:${r}
  ${b}${pad("ports [name]")}${r}Inspect listeners and routes
  ${b}${pad("expose <name> <port>")}${r}Expose an app via Caddy route
  ${b}${pad("unexpose <name>")}${r}Remove a Caddy route
  ${b}${pad("open <name|port>")}${r}Open a route's URL
`;

  if (inside) {
    text += `
${y}You are inside the sandbox.${r} Container management commands are disabled.
Run them from the ${b}host${r} instead.\n`;
  }

  text += `
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
  openharness sandbox

  ${d}# One-time auth setup${r}
  openharness onboard

  ${d}# Tear down${r}
  openharness clean

  ${d}# Launch AI agent mode${r}
  openharness
`;

  return text;
}
