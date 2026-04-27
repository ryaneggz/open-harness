#!/usr/bin/env node

/**
 * openharness — Open Harness CLI
 *
 * Subcommands run docker compose directly — no AI model needed.
 * Run with no arguments to launch the Pi agent (AI mode).
 */

import { main, VERSION } from "@mariozechner/pi-coding-agent";
import {
  SUBCOMMANDS,
  HOST_ONLY_COMMANDS,
  isInsideContainer,
  parseToolArgs,
  resolveSubcommand,
  helpText,
} from "./cli.js";
import { ORCHESTRATOR_USER, ORCHESTRATOR_HOME } from "../lib/config.js";

const args = process.argv.slice(2);
const firstArg = args[0];

if (firstArg === "--help" || firstArg === "-h") {
  console.log(helpText(VERSION));
  process.exit(0);
}

if (firstArg === "--version" || firstArg === "-v") {
  console.log(`openharness 0.1.0 (pi ${VERSION})`);
  process.exit(0);
}

// Block host-only commands inside the container
if (firstArg && HOST_ONLY_COMMANDS.has(firstArg) && isInsideContainer()) {
  console.error(`Error: 'openharness ${firstArg}' is a host-only command.`);
  console.error("You are inside the sandbox. Run this from the host instead.");
  process.exit(1);
}

// Subcommand dispatch — runs docker compose directly, no AI model
if (firstArg && SUBCOMMANDS.has(firstArg)) {
  runSubcommand(firstArg, args.slice(1)).catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
} else {
  // Forward to Pi main() for AI agent mode — extensions auto-discovered via pi.extensions
  main(args).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/**
 * Execute a subcommand by calling lib functions directly.
 * No Pi SDK, no AI model — just docker compose.
 */
async function runSubcommand(command: string, cmdArgs: string[]) {
  const { SandboxConfig } = await import("../lib/config.js");
  const { composeUp, composeDown, composeEnv, execCmd, psCmd } = await import("../lib/docker.js");
  const { run, runSafe } = await import("../lib/exec.js");

  const params = parseToolArgs(cmdArgs);

  switch (command) {
    case "sandbox": {
      const config = new SandboxConfig({ name: params.name as string | undefined });
      const env = composeEnv(config);
      console.log(`Starting sandbox '${config.name}'...`);
      console.log(`Compose files: ${config.composeFiles.join(", ")}`);
      run(composeUp(config), { env });

      // Validate container is running
      const { execSync } = await import("node:child_process");
      let running = false;
      try {
        const status = execSync(`docker inspect -f '{{.State.Running}}' ${config.name}`, {
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
        running = status === "true";
      } catch {
        // container not found
      }

      if (!running) {
        console.error(`\nError: container '${config.name}' is not running.`);
        console.error("Check logs: docker logs " + config.name);
        process.exit(1);
      }

      // Get port mappings (only show what's actually mapped)
      let sshPort: string | null = null;
      let appPort: string | null = null;
      try {
        const ports = execSync(`docker port ${config.name}`, {
          encoding: "utf-8",
          stdio: "pipe",
        }).trim();
        const sshMatch = ports.match(/22\/tcp -> [\d.]+:(\d+)/);
        const appMatch = ports.match(/3000\/tcp -> [\d.]+:(\d+)/);
        if (sshMatch) sshPort = sshMatch[1];
        if (appMatch) appPort = appMatch[1];
      } catch {
        // no ports mapped
      }

      console.log(`\n  Sandbox '${config.name}' is running!\n`);
      console.log("  Connect:");
      if (sshPort) {
        console.log(`    SSH:    ssh ${ORCHESTRATOR_USER}@localhost -p ${sshPort}`);
      }
      console.log(`    Shell:  openharness shell ${config.name}`);
      if (appPort) {
        console.log(`    App:    http://localhost:${appPort}`);
      }
      console.log("");
      console.log("  Next steps:");
      console.log(`    openharness onboard ${config.name}    # one-time auth setup`);
      break;
    }

    case "run": {
      const config = new SandboxConfig({ name: params.name as string | undefined });
      run(composeUp(config), { env: composeEnv(config) });
      console.log(`Sandbox '${config.name}' started.`);
      break;
    }

    case "stop": {
      const config = new SandboxConfig({ name: params.name as string | undefined });
      try {
        run(composeDown(config), { env: composeEnv(config) });
        console.log(`Sandbox '${config.name}' stopped.`);
      } catch {
        console.error(`Error: no sandbox '${config.name}' found to stop.`);
        process.exit(1);
      }
      break;
    }

    case "clean": {
      const config = new SandboxConfig({ name: params.name as string | undefined });
      const stopped = runSafe(composeDown(config, true), { env: composeEnv(config) });
      console.log(
        stopped
          ? `Sandbox '${config.name}' cleaned (containers stopped, volumes removed).`
          : `No running sandbox '${config.name}' found.`,
      );
      break;
    }

    case "shell": {
      if (!params.name) {
        console.error("Usage: openharness shell <name>");
        process.exit(1);
      }
      const cmd = execCmd(params.name as string, ["bash", "--login"], {
        user: ORCHESTRATOR_USER,
        interactive: true,
        workdir: `${ORCHESTRATOR_HOME}/harness`,
      });
      const { spawnSync } = await import("node:child_process");
      spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
      break;
    }

    case "list": {
      const { execSync } = await import("node:child_process");
      console.log("\n  Running containers:");
      try {
        const ps = execSync(psCmd().join(" "), { encoding: "utf-8" }).trim();
        console.log(ps || "  (none)");
      } catch {
        console.log("  (docker not available or no containers running)");
      }
      break;
    }

    case "onboard": {
      const { runOnboardCommand } = await import("./onboard.js");
      const name = params.name as string | undefined;
      const only = typeof params.action === "string" ? params.action : undefined;
      const exitCode = await runOnboardCommand({
        name,
        force: params.force as boolean | undefined,
        only,
      });
      if (exitCode !== 0) process.exit(exitCode);
      break;
    }

    case "heartbeat": {
      const tools = await import("../tools/index.js");
      const resolved = resolveSubcommand("heartbeat", cmdArgs, tools);
      if ("error" in resolved) {
        console.error(resolved.error);
        process.exit(1);
      }
      const result = await resolved.tool.execute(
        "cli",
        resolved.params,
        undefined,
        undefined,
        undefined as never,
      );
      for (const item of result.content) {
        if (item.type === "text" && "text" in item) console.log(item.text);
      }
      break;
    }

    case "worktree": {
      if (!params.name) {
        console.error("Usage: openharness worktree <name> [--base-branch <branch>]");
        process.exit(1);
      }
      const { worktreeTool } = await import("../tools/index.js");
      const result = await worktreeTool.execute(
        "cli",
        params,
        undefined,
        undefined,
        undefined as never,
      );
      for (const item of result.content) {
        if (item.type === "text" && "text" in item) console.log(item.text);
      }
      break;
    }

    case "ports":
    case "expose":
    case "unexpose":
    case "open": {
      const tools = await import("../tools/index.js");
      const resolved = resolveSubcommand(command, cmdArgs, tools);
      if ("error" in resolved) {
        console.error(resolved.error);
        process.exit(1);
      }
      const result = await resolved.tool.execute(
        "cli",
        resolved.params,
        undefined,
        undefined,
        undefined as never,
      );
      for (const item of result.content) {
        if (item.type === "text" && "text" in item) console.log(item.text);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}
