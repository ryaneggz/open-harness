#!/usr/bin/env node

import { HeartbeatDaemon } from "../lib/heartbeat/index.js";
import { join } from "node:path";

const HOME = process.env.HOME ?? "/home/sandbox";
const WORKSPACE = join(HOME, "harness/workspace");

const daemon = new HeartbeatDaemon({
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
  case "sync":
    daemon.sync();
    // If "start", keep process alive for cron scheduling
    if (command === "start") {
      process.on("SIGTERM", () => {
        daemon.stop();
        process.exit(0);
      });
      process.on("SIGINT", () => {
        daemon.stop();
        process.exit(0);
      });
      console.log(`Heartbeat daemon running (pid ${process.pid})`);
    }
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
