#!/usr/bin/env node

/**
 * openharness — Open Harness CLI
 *
 * A custom Pi Agent CLI with sandbox management tools built-in.
 * Wraps Pi's main() and auto-loads sandbox tools as an extension.
 */

import { main, VERSION } from "@mariozechner/pi-coding-agent";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const extensionPath = resolve(__dirname, "extension.js");
const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args.includes("--version") || args.includes("-v")) {
  console.log(`openharness 0.1.0 (pi ${VERSION})`);
  process.exit(0);
}

// Inject the sandbox tools extension and forward to Pi
args.push("--extension", extensionPath);

main(args).catch((err) => {
  console.error(err);
  process.exit(1);
});

function printHelp() {
  const b = "\x1b[1m";
  const r = "\x1b[0m";
  const d = "\x1b[2m";

  console.log(`${b}openharness${r} — AI-powered sandbox orchestrator (built on pi ${VERSION})

${b}Usage:${r}
  openharness [options] [@files...] [messages...]

${b}Sandbox Commands${r} ${d}(slash commands inside interactive mode):${r}

  ${b}Lifecycle:${r}
    /quickstart <name> [opts]      Full setup: worktree + build + run + setup
    /build <name>                  Build Docker image
    /rebuild <name>                Rebuild (no cache)
    /run <name>                    Start container
    /stop <name>                   Stop and remove container
    /clean <name>                  Full cleanup (container + image + worktree)

  ${b}Access:${r}
    /shell <name>                  Open interactive bash shell in sandbox
    /list                          List running sandboxes and worktrees

  ${b}Registry:${r}
    /push <name>                   Push image to registry

  ${b}Heartbeat:${r}
    /heartbeat sync <name>         Sync cron schedules from heartbeats.conf
    /heartbeat stop <name>         Remove all heartbeat cron entries
    /heartbeat status <name>       Show schedules and recent logs
    /heartbeat migrate <name>      Convert legacy HEARTBEAT_INTERVAL

  ${b}Git:${r}
    /worktree <name> [opts]        Create git worktree only

  ${b}Options for /quickstart and /worktree:${r}
    --base-branch <branch>         Base branch (default: main)
    --docker                       Enable Docker-in-Docker
    --tag <tag>                    Image tag (default: latest)

${b}Sandbox Tools${r} ${d}(available to the LLM in conversational mode):${r}
  sandbox_list, sandbox_quickstart, sandbox_build, sandbox_rebuild,
  sandbox_run, sandbox_shell, sandbox_stop, sandbox_clean,
  sandbox_push, sandbox_heartbeat, sandbox_worktree

${b}Pi Options:${r}
  --provider <name>              LLM provider (default: google)
  --model <pattern>              Model pattern or ID
  --api-key <key>                API key (defaults to env vars)
  --system-prompt <text>         Custom system prompt
  --thinking <level>             Thinking level: off, minimal, low, medium, high, xhigh
  --print, -p                    Non-interactive: process prompt and exit
  --continue, -c                 Continue previous session
  --resume, -r                   Select a session to resume
  --models <patterns>            Models for Ctrl+P cycling
  --extension, -e <path>         Load additional extension
  --no-extensions, -ne           Disable extension discovery
  --skill <path>                 Load a skill file or directory
  --offline                      Disable startup network operations
  --help, -h                     Show this help
  --version, -v                  Show version

${b}Examples:${r}
  ${d}# Launch interactive mode${r}
  openharness

  ${d}# Interactive with initial prompt${r}
  openharness "provision a new blog-writer agent"

  ${d}# Non-interactive${r}
  openharness -p "list all running sandboxes"

  ${d}# Use a specific model${r}
  openharness --model anthropic/claude-sonnet-4-5
`);
}
