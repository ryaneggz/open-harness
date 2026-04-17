import { parseHeartbeatConfig, secondsToCron } from "./config.js";
import { HeartbeatScheduler } from "./scheduler.js";
import { HeartbeatLogger } from "./logger.js";
import type { RunnerOptions } from "./runner.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export interface DaemonOptions {
  workspacePath: string; // ~/harness/workspace
  heartbeatDir: string; // ~/harness/workspace/heartbeats
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

  /** Migrate legacy HEARTBEAT.md into heartbeats/ with frontmatter */
  migrate(): void {
    const heartbeatsDir = join(this.options.workspacePath, "heartbeats");
    const legacyFile = join(this.options.workspacePath, "HEARTBEAT.md");
    const targetFile = join(heartbeatsDir, "default.md");

    if (existsSync(targetFile)) {
      console.log("heartbeats/default.md already exists — not overwriting.");
      return;
    }

    if (!existsSync(legacyFile)) {
      console.log("No HEARTBEAT.md found — nothing to migrate.");
      return;
    }

    const interval = this.options.defaultInterval ?? 1800;
    const agent = this.options.defaultAgent ?? "claude";
    const cronExpr = secondsToCron(interval);

    mkdirSync(heartbeatsDir, { recursive: true });

    // Read existing content and prepend frontmatter
    const existing = readFileSync(legacyFile, "utf-8");

    const activeStart = process.env.HEARTBEAT_ACTIVE_START;
    const activeEnd = process.env.HEARTBEAT_ACTIVE_END;
    let activeLine = "";
    if (activeStart && activeEnd) {
      activeLine = `\nactive: ${activeStart}-${activeEnd}`;
    }

    const content = `---
schedule: "${cronExpr}"
agent: ${agent}${activeLine}
---

${existing}`;

    writeFileSync(targetFile, content);
    console.log(`Migrated: HEARTBEAT.md → heartbeats/default.md`);
    console.log(`  Schedule: ${cronExpr} (from interval ${interval}s)`);
    console.log("");
    console.log("Add more heartbeats by creating .md files in heartbeats/ with frontmatter:");
    console.log("  ---");
    console.log('  schedule: "*/30 * * * *"');
    console.log("  agent: claude");
    console.log("  active: 9-21");
    console.log("  ---");
  }

  getScheduler(): HeartbeatScheduler {
    return this.scheduler;
  }
}
