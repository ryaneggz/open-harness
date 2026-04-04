#!/usr/bin/env node

/**
 * openharness — Open Harness CLI
 *
 * Core agent built on Pi SDK. Sandbox tools are an optional package
 * installed via: openharness install @openharness/sandbox
 */

import { main, VERSION } from "@mariozechner/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  SUBCOMMANDS,
  INSTALL_HINT,
  resolveSubcommand,
  formatResult,
  helpText,
  type SandboxModule,
} from "./cli.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, "extension.js");

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

// Subcommand dispatch — run tool directly, no AI agent
if (firstArg && SUBCOMMANDS.has(firstArg)) {
  runSubcommand(firstArg, args.slice(1)).catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
} else {
  // Forward to Pi main() for AI agent mode
  args.push("--extension", extensionPath);
  main(args).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

/**
 * Try to import the sandbox package. Returns null if not installed.
 */
async function loadSandbox(): Promise<SandboxModule | null> {
  try {
    return (await import("@openharness/sandbox")) as SandboxModule;
  } catch {
    return null;
  }
}

/**
 * Execute a subcommand by importing from @openharness/sandbox.
 */
async function runSubcommand(command: string, args: string[]) {
  const sandbox = await loadSandbox();
  if (!sandbox) {
    console.error(INSTALL_HINT);
    process.exit(1);
  }

  const resolved = resolveSubcommand(command, args, sandbox);

  if ("error" in resolved) {
    console.error(resolved.error);
    process.exit(1);
  }

  const result = await resolved.tool.execute(
    "cli",
    resolved.params as unknown,
    undefined,
    undefined,
    undefined as never,
  );
  for (const line of formatResult(result)) {
    console.log(line);
  }
}
