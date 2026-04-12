/**
 * Open Harness sandbox tools extension for Pi Agent.
 *
 * Registers all sandbox management tools and slash commands.
 * Auto-loaded when @openharness/sandbox is installed as a Pi package.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { sandboxTools } from "../src/tools/index.js";

export default function (pi: ExtensionAPI) {
  // Register all sandbox tools (LLM can call these)
  for (const tool of sandboxTools) {
    pi.registerTool(tool);
  }

  // Register slash commands for direct execution (no LLM)
  pi.registerCommand("list", {
    description: "List running sandboxes",
    async handler(_args, ctx) {
      const { listTool } = await import("../src/tools/list.js");
      const result = await listTool.execute("cmd", {}, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("quickstart", {
    description: "Build and start sandbox: /quickstart [name]",
    async handler(args, ctx) {
      const params: Record<string, string> = {};
      for (const arg of args) {
        if (!arg.startsWith("-")) {
          params.name = arg;
          break;
        }
      }
      const { quickstartTool } = await import("../src/tools/quickstart.js");
      const result = await quickstartTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("run", {
    description: "Start the sandbox container: /run [name]",
    async handler(args, ctx) {
      const params: Record<string, string> = {};
      for (const arg of args) {
        if (!arg.startsWith("-")) {
          params.name = arg;
          break;
        }
      }
      const { runTool } = await import("../src/tools/run.js");
      const result = await runTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("shell", {
    description: "Open bash shell in sandbox: /shell <name>",
    async handler(args, ctx) {
      const [name] = args;
      if (!name) {
        ctx.ui.notify("Usage: /shell <name>", "error");
        return;
      }
      const { shellTool } = await import("../src/tools/shell.js");
      const result = await shellTool.execute("cmd", { name }, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("stop", {
    description: "Stop a sandbox: /stop [name]",
    async handler(args, ctx) {
      const params: Record<string, string> = {};
      for (const arg of args) {
        if (!arg.startsWith("-")) {
          params.name = arg;
          break;
        }
      }
      const { stopTool } = await import("../src/tools/stop.js");
      const result = await stopTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("clean", {
    description: "Full cleanup (containers + volumes): /clean [name]",
    async handler(args, ctx) {
      const params: Record<string, string> = {};
      for (const arg of args) {
        if (!arg.startsWith("-")) {
          params.name = arg;
          break;
        }
      }
      const { cleanTool } = await import("../src/tools/clean.js");
      const result = await cleanTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("heartbeat", {
    description: "Manage heartbeats: /heartbeat <sync|stop|status|migrate> <name>",
    async handler(args, ctx) {
      const [action, name] = args;
      if (!action || !name) {
        ctx.ui.notify("Usage: /heartbeat <sync|stop|status|migrate> <name>", "error");
        return;
      }
      if (!["sync", "stop", "status", "migrate"].includes(action)) {
        ctx.ui.notify("Invalid action. Use: sync, stop, status, or migrate", "error");
        return;
      }
      const { heartbeatTool } = await import("../src/tools/heartbeat.js");
      const result = await heartbeatTool.execute(
        "cmd",
        { name, action },
        undefined,
        undefined,
        ctx,
      );
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("worktree", {
    description: "Create a git worktree: /worktree <name> [--base-branch main]",
    async handler(args, ctx) {
      const [name, ...rest] = args;
      if (!name) {
        ctx.ui.notify("Usage: /worktree <name> [--base-branch <branch>]", "error");
        return;
      }
      const params: Record<string, string> = { name };
      for (let i = 0; i < rest.length; i++) {
        if (rest[i] === "--base-branch" && rest[i + 1]) {
          params.baseBranch = rest[++i];
        }
      }
      const { worktreeTool } = await import("../src/tools/worktree.js");
      const result = await worktreeTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });

  pi.registerCommand("onboard", {
    description: "Interactive first-time setup: /onboard [name] [--force]",
    async handler(args, ctx) {
      const params: Record<string, string | boolean> = {};
      for (const arg of args) {
        if (arg === "--force") {
          params.force = true;
        } else if (!arg.startsWith("-")) {
          params.name = arg;
        }
      }
      const { onboardTool } = await import("../src/tools/onboard.js");
      const result = await onboardTool.execute("cmd", params, undefined, undefined, ctx);
      ctx.ui.notify(result.content[0].type === "text" ? result.content[0].text : "", "info");
    },
  });
}
