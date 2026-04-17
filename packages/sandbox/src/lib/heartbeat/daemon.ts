import { parseHeartbeatConfig, parseHeartbeatConfigAsync, secondsToCron } from "./config.js";
import { HeartbeatScheduler } from "./scheduler.js";
import { HeartbeatLogger } from "./logger.js";
import type { RunnerOptions } from "./runner.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, watch, type FSWatcher } from "node:fs";
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
  private watcher: FSWatcher | null = null;
  private watchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

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

  /** Parse config, start scheduling, and watch for changes */
  async start(): Promise<void> {
    const entries = await parseHeartbeatConfigAsync(
      this.options.workspacePath,
      this.options.defaultAgent,
      this.options.defaultInterval,
    );
    if (entries.length === 0) {
      this.logger.log("No heartbeats configured — nothing to schedule");
      console.log("No heartbeats configured.");
    } else {
      this.scheduler.start(entries);
      console.log(`Synced ${entries.length} heartbeat schedule(s)`);
      for (const entry of entries) {
        console.log(`  ${entry.cronExpr}  →  ${entry.filePath}`);
      }
    }
    this.startWatching();
  }

  /** Re-sync: re-parse config and differentially update schedules */
  async sync(): Promise<void> {
    const entries = await parseHeartbeatConfigAsync(
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

  /**
   * One-shot sync using synchronous I/O. Used by the CLI `sync` command
   * which runs in a short-lived process and exits immediately.
   */
  syncOnce(): void {
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

  /** Stop all scheduled heartbeats and the file watcher */
  stop(): void {
    this.stopWatching();
    this.scheduler.stop();
    console.log("Heartbeat schedules removed.");
  }

  /** Start watching the heartbeats directory for file changes */
  private startWatching(): void {
    const dir = this.options.heartbeatDir;
    if (!existsSync(dir)) return;

    try {
      this.watcher = watch(dir, { persistent: false }, (_event, filename) => {
        // Only react to .md file changes
        if (!filename || !filename.endsWith(".md")) return;

        // Debounce: coalesce rapid events into a single sync
        if (this.watchDebounceTimer) clearTimeout(this.watchDebounceTimer);
        this.watchDebounceTimer = setTimeout(() => {
          this.watchDebounceTimer = null;
          this.sync().catch((err) => {
            this.logger.log(
              `[watcher] Sync error: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }, 500);
      });

      this.watcher.on("error", (err) => {
        this.logger.log(`[watcher] Error: ${err.message}`);
      });
    } catch (err) {
      this.logger.log(
        `[watcher] Failed to watch ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Stop the file watcher and clear any pending debounce timer */
  private stopWatching(): void {
    if (this.watchDebounceTimer) {
      clearTimeout(this.watchDebounceTimer);
      this.watchDebounceTimer = null;
    }
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
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
