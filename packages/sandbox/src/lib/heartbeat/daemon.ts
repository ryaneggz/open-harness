import { parseHeartbeatConfig, secondsToCron } from "./config.js";
import { HeartbeatScheduler } from "./scheduler.js";
import { HeartbeatLogger } from "./logger.js";
import type { RunnerOptions } from "./runner.js";
import { existsSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { join } from "node:path";

export interface DaemonOptions {
  workspacePath: string; // ~/harness/workspace
  heartbeatDir: string; // ~/.heartbeat
  soulFile?: string; // ~/harness/workspace/SOUL.md
  memoryDir?: string; // ~/harness/workspace/memory
  defaultAgent?: string; // "claude"
  defaultInterval?: number; // 1800
}

export class HeartbeatDaemon {
  private scheduler: HeartbeatScheduler;
  private logger: HeartbeatLogger;

  constructor(private options: DaemonOptions) {
    const runnerOpts: RunnerOptions = {
      workspacePath: options.workspacePath,
      heartbeatDir: options.heartbeatDir,
      soulFile: options.soulFile,
      memoryDir: options.memoryDir,
    };
    this.scheduler = new HeartbeatScheduler(runnerOpts);
    this.logger = new HeartbeatLogger(join(options.heartbeatDir, "heartbeat.log"));
  }

  /** Parse config and start scheduling */
  start(): void {
    const entries = parseHeartbeatConfig(
      this.options.workspacePath,
      this.options.defaultAgent,
      this.options.defaultInterval,
    );
    if (entries.length === 0) {
      this.logger.log("No heartbeats configured — nothing to schedule");
      console.log("No heartbeats configured.");
      return;
    }
    this.scheduler.start(entries);
    console.log(`Synced ${entries.length} heartbeat schedule(s)`);
    for (const entry of entries) {
      console.log(`  ${entry.cronExpr}  →  ${entry.filePath}`);
    }
  }

  /** Re-sync: stop existing, re-parse config, start fresh */
  sync(): void {
    const entries = parseHeartbeatConfig(
      this.options.workspacePath,
      this.options.defaultAgent,
      this.options.defaultInterval,
    );
    this.scheduler.sync(entries);
    console.log(`Synced ${entries.length} heartbeat schedule(s)`);
    for (const entry of entries) {
      console.log(`  ${entry.cronExpr}  →  ${entry.filePath}`);
    }
  }

  /** Stop all scheduled heartbeats */
  stop(): void {
    this.scheduler.stop();
    console.log("Heartbeat schedules removed.");
  }

  /** Show status: daemon info, scheduled jobs, recent logs */
  status(): void {
    const statuses = this.scheduler.status();
    console.log(`Heartbeat daemon: running (pid ${process.pid})`);
    console.log("");
    if (statuses.length > 0) {
      console.log(`Heartbeat schedules: ${statuses.length}`);
      for (const s of statuses) {
        console.log(`  ${s.cronExpr}  →  ${s.name}`);
      }
    } else {
      console.log("Heartbeat schedules: none");
    }
    // Recent logs
    const recent = this.logger.tail(10);
    if (recent) {
      console.log("");
      console.log("Recent log:");
      console.log(recent);
    }
  }

  /** Migrate legacy HEARTBEAT_INTERVAL to heartbeats.conf */
  migrate(): void {
    const configFile = join(this.options.workspacePath, "heartbeats.conf");
    if (existsSync(configFile)) {
      console.log("heartbeats.conf already exists — not overwriting.");
      console.log(`Edit it directly: ${configFile}`);
      return;
    }

    const interval = this.options.defaultInterval ?? 1800;
    const agent = this.options.defaultAgent ?? "claude";
    const cronExpr = secondsToCron(interval);

    const heartbeatsDir = join(this.options.workspacePath, "heartbeats");
    mkdirSync(heartbeatsDir, { recursive: true });

    // Move legacy HEARTBEAT.md to heartbeats/default.md
    const legacyFile = join(this.options.workspacePath, "HEARTBEAT.md");
    const defaultFile = join(heartbeatsDir, "default.md");
    if (existsSync(legacyFile) && !existsSync(defaultFile)) {
      renameSync(legacyFile, defaultFile);
      console.log("Moved HEARTBEAT.md → heartbeats/default.md");
    }

    // Build active range line if env vars set
    const activeStart = process.env.HEARTBEAT_ACTIVE_START;
    const activeEnd = process.env.HEARTBEAT_ACTIVE_END;
    let activeLine = "";
    if (activeStart && activeEnd) {
      activeLine = ` | ${agent} | ${activeStart}-${activeEnd}`;
    }

    // Write config file (match bash cmd_migrate output)
    const content = `# Heartbeat Schedule Configuration
# =================================
# Format: <cron-expression> | <file-path> | [agent] | [active_start-active_end]
#
# - cron-expression: Standard 5-field cron (min hour dom mon dow)
# - file-path: Relative to ~/harness/workspace/
# - agent: (optional) Override HEARTBEAT_AGENT env var. Default: ${agent}
# - active_start-active_end: (optional) Hours (0-23). Only run during this window.
#
# Examples:
#   */30 * * * * | heartbeats/default.md
#   */15 * * * * | heartbeats/check-deployments.md | claude | 9-18
#   0 */4 * * *  | heartbeats/memory-distill.md
#   0 20 * * *   | heartbeats/daily-summary.md
#
# After editing, run: heartbeat.sh sync (or from host: make heartbeat)

${cronExpr} | heartbeats/default.md${activeLine}
`;
    writeFileSync(configFile, content);
    console.log(`Created: ${configFile}`);
    console.log(`  Schedule: ${cronExpr} (from HEARTBEAT_INTERVAL=${interval}s)`);
    console.log("");
    console.log(
      "Add more heartbeats by editing heartbeats.conf and placing .md files in heartbeats/",
    );
    console.log("Then run: heartbeat.sh sync");
  }

  getScheduler(): HeartbeatScheduler {
    return this.scheduler;
  }
}
