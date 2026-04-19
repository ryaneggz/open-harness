#!/usr/bin/env node

import { HeartbeatDaemon } from "../lib/heartbeat/index.js";
import { discoverWorkspaceRoots } from "../lib/heartbeat/discovery.js";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/home/sandbox";
const WORKSPACE = join(HOME, "harness/workspace");

// Multi-root discovery: find every git worktree under `$HOME/harness` that
// has a `workspace/heartbeats/` directory, then augment/override with any
// paths specified via the HEARTBEAT_ROOTS env var.
//
// If discovery returns zero roots (e.g. `.git/worktrees/` doesn't exist or
// git isn't available), fall back to the legacy single-root behaviour so a
// fresh sandbox with just `$HOME/harness/workspace/` still works.
const discovered = discoverWorkspaceRoots(HOME, process.env.HEARTBEAT_ROOTS);

const daemon = discovered.length
  ? new HeartbeatDaemon({
      workspaceRoots: discovered,
      defaultAgent: process.env.HEARTBEAT_AGENT ?? "claude",
      defaultInterval: parseInt(process.env.HEARTBEAT_INTERVAL ?? "1800", 10),
      // PR-4 — enable hot worktree add/remove. The daemon watches
      // `<HOME>/harness/.git/worktrees/` and re-runs the same discovery
      // call (with the same overrides) whenever git mutates that dir.
      rediscover: {
        home: HOME,
        rootsEnv: process.env.HEARTBEAT_ROOTS,
      },
    })
  : new HeartbeatDaemon({
      workspacePath: WORKSPACE,
      heartbeatDir: join(WORKSPACE, "heartbeats"),
      soulFile: process.env.SOUL_FILE ?? join(WORKSPACE, "SOUL.md"),
      memoryDir: process.env.MEMORY_DIR ?? join(WORKSPACE, "memory"),
      defaultAgent: process.env.HEARTBEAT_AGENT ?? "claude",
      defaultInterval: parseInt(process.env.HEARTBEAT_INTERVAL ?? "1800", 10),
    });

const command = process.argv[2] ?? "start";

switch (command) {
  case "start":
    // Start daemon with async config parsing, file watching, and cron scheduling
    await daemon.start();
    process.on("SIGTERM", () => {
      daemon.stop();
      process.exit(0);
    });
    process.on("SIGINT", () => {
      daemon.stop();
      process.exit(0);
    });
    console.log(`Heartbeat daemon running (pid ${process.pid})`);
    break;
  case "sync":
    // One-shot sync: parse config, print what was found, exit
    daemon.syncOnce();
    break;
  case "stop":
    daemon.stop();
    break;
  case "status":
    daemon.status();
    break;
  case "migrate":
    daemon.migrate();
    break;
  default:
    console.error("Usage: heartbeat-daemon {start|sync|stop|status|migrate}");
    process.exit(1);
}
