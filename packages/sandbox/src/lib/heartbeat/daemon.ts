import {
  parseHeartbeatConfig,
  parseHeartbeatConfigAcrossRoots,
  secondsToCron,
  type HeartbeatEntry,
  type WorkspaceRoot,
} from "./config.js";
import { HeartbeatScheduler } from "./scheduler.js";
import { HeartbeatLogger } from "./logger.js";
import type { RunnerOptions } from "./runner.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";

/**
 * Legacy single-root options — a bare workspace + heartbeat directory.
 * Kept verbatim so existing callers (`cli/heartbeat-daemon.ts`, test
 * harnesses) compile and behave identically.
 */
export interface LegacyDaemonOptions {
  workspacePath: string; // ~/harness/workspace
  heartbeatDir: string; // ~/harness/workspace/heartbeats
  soulFile?: string; // ~/harness/workspace/SOUL.md
  memoryDir?: string; // ~/harness/workspace/memory
  defaultAgent?: string; // "claude"
  defaultInterval?: number; // 1800
}

/**
 * Multi-root options — PR-2 exercises this fully. Each root gets its own
 * `fs.watch` instance, entries are merged across roots, and the scheduler
 * namespaces keys by `root.label`.
 */
export interface MultiRootDaemonOptions {
  workspaceRoots: WorkspaceRoot[];
  defaultAgent?: string;
  defaultInterval?: number;
}

export type DaemonOptions = LegacyDaemonOptions | MultiRootDaemonOptions;

/**
 * Shape of the normalized options the daemon actually operates on.
 * Internally we always have at least one root; the helpers below mint one
 * from legacy options if needed.
 */
interface NormalizedDaemonOptions {
  roots: WorkspaceRoot[];
  defaultAgent?: string;
  defaultInterval?: number;
}

function isMultiRoot(opts: DaemonOptions): opts is MultiRootDaemonOptions {
  return "workspaceRoots" in opts;
}

function normalize(opts: DaemonOptions): NormalizedDaemonOptions {
  if (isMultiRoot(opts)) {
    return {
      roots: opts.workspaceRoots,
      defaultAgent: opts.defaultAgent,
      defaultInterval: opts.defaultInterval,
    };
  }
  // Legacy shape → wrap into a single-root array with label "" so composite
  // schedule/runner keys collapse back to the legacy slug, preserving
  // byte-identical output for single-root deployments.
  const root: WorkspaceRoot = {
    workspacePath: opts.workspacePath,
    heartbeatDir: opts.heartbeatDir,
    soulFile: opts.soulFile,
    memoryDir: opts.memoryDir,
    label: "",
  };
  return {
    roots: [root],
    defaultAgent: opts.defaultAgent,
    defaultInterval: opts.defaultInterval,
  };
}

export class HeartbeatDaemon {
  private scheduler: HeartbeatScheduler;
  /**
   * Per-root loggers keyed by `root.label`. Single-root deployments hold
   * exactly one entry keyed by `""` pointing at the legacy
   * `<heartbeatDir>/heartbeat.log` path, so existing consumers see no
   * behavioural change.
   */
  private loggers: Map<string, HeartbeatLogger>;
  /** One watcher per root — all fire the same debounced sync. */
  private watchers: FSWatcher[] = [];
  private watchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private normalized: NormalizedDaemonOptions;
  /** Primary root — used for logger, migrate, and legacy-shim scenarios. */
  private primaryRoot: WorkspaceRoot;

  constructor(options: DaemonOptions) {
    this.normalized = normalize(options);
    this.primaryRoot = this.normalized.roots[0];

    // Build one logger per root so each worktree's heartbeat events land in
    // its own `heartbeats/heartbeat.log`. Keyed on `root.label` to match
    // `entry.root.label` at run time (scheduler and runner both look up
    // through this same keying).
    this.loggers = new Map();
    for (const root of this.normalized.roots) {
      this.loggers.set(root.label, new HeartbeatLogger(join(root.heartbeatDir, "heartbeat.log")));
    }

    const runnerOpts: RunnerOptions = {
      workspacePath: this.primaryRoot.workspacePath,
      heartbeatDir: this.primaryRoot.heartbeatDir,
      soulFile: this.primaryRoot.soulFile,
      memoryDir: this.primaryRoot.memoryDir,
      loggers: this.loggers,
    };
    this.scheduler = new HeartbeatScheduler(runnerOpts);
  }

  /** Parse config across all roots, start scheduling, and watch each root. */
  async start(): Promise<void> {
    const entries = await this.parseAll();
    if (entries.length === 0) {
      this.primaryLogger().log("No heartbeats configured — nothing to schedule");
      console.log("No heartbeats configured.");
    } else {
      this.scheduler.start(entries);
      console.log(`Synced ${entries.length} heartbeat schedule(s)`);
      for (const entry of entries) {
        console.log(`  ${entry.cronExpr}  →  ${this.describeEntry(entry)}`);
      }
    }
    this.startWatching();
  }

  /** Re-sync: re-parse config and differentially update schedules */
  async sync(): Promise<void> {
    const entries = await this.parseAll();
    this.scheduler.sync(entries);
    console.log(`Synced ${entries.length} heartbeat schedule(s)`);
    for (const entry of entries) {
      console.log(`  ${entry.cronExpr}  →  ${this.describeEntry(entry)}`);
    }
  }

  /**
   * One-shot sync using synchronous I/O. Used by the CLI `sync` command
   * which runs in a short-lived process and exits immediately.
   *
   * In multi-root mode this still delegates to the sync parser per-root to
   * avoid awaiting promises from a CLI entry that expects to exit
   * immediately — the parser accepts a WorkspaceRoot directly.
   */
  syncOnce(): void {
    const entries: HeartbeatEntry[] = [];
    for (const root of this.normalized.roots) {
      const rootEntries = parseHeartbeatConfig(
        root,
        this.normalized.defaultAgent,
        this.normalized.defaultInterval,
      );
      for (const entry of rootEntries) entries.push(entry);
    }
    this.scheduler.sync(entries);
    console.log(`Synced ${entries.length} heartbeat schedule(s)`);
    for (const entry of entries) {
      console.log(`  ${entry.cronExpr}  →  ${this.describeEntry(entry)}`);
    }
  }

  /** Stop all scheduled heartbeats and every file watcher */
  stop(): void {
    this.stopWatching();
    this.scheduler.stop();
    console.log("Heartbeat schedules removed.");
  }

  /** Start one file watcher per root's heartbeats directory. */
  private startWatching(): void {
    for (const root of this.normalized.roots) {
      const dir = root.heartbeatDir;
      if (!existsSync(dir)) continue;

      try {
        const watcher = watch(dir, { persistent: false }, (_event, filename) => {
          // Only react to .md file changes
          if (!filename || !filename.endsWith(".md")) return;

          // Debounce: coalesce rapid events (from any root) into a single sync
          if (this.watchDebounceTimer) clearTimeout(this.watchDebounceTimer);
          this.watchDebounceTimer = setTimeout(() => {
            this.watchDebounceTimer = null;
            this.sync().catch((err) => {
              // Watcher errors are daemon-scope (not tied to a specific
              // entry), so route them to the affected root's logger if we
              // know it, otherwise the primary (parent) logger.
              this.loggerFor(root.label).log(
                `[watcher] Sync error: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
          }, 500);
        });

        watcher.on("error", (err) => {
          this.loggerFor(root.label).log(
            `[watcher:${root.label || "parent"}] Error: ${err.message}`,
          );
        });

        this.watchers.push(watcher);
      } catch (err) {
        this.loggerFor(root.label).log(
          `[watcher:${root.label || "parent"}] Failed to watch ${dir}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /** Close every file watcher and clear any pending debounce timer */
  private stopWatching(): void {
    if (this.watchDebounceTimer) {
      clearTimeout(this.watchDebounceTimer);
      this.watchDebounceTimer = null;
    }
    for (const watcher of this.watchers) {
      try {
        watcher.close();
      } catch {
        // ignore — watcher may already be closed
      }
    }
    this.watchers = [];
  }

  /**
   * Show status: daemon info, scheduled jobs grouped by root, recent logs.
   *
   * Single-root (empty label) collapses to the legacy flat format — no
   * "Roots:" header, bare slugs in the schedule list, one log tail — so
   * existing scripts grepping `cronExpr → filePath` still match.
   */
  status(): void {
    const statuses = this.scheduler.status();
    console.log(`Heartbeat daemon: running (pid ${process.pid})`);
    console.log("");

    const isMulti = this.isMultiRoot();

    if (isMulti) {
      // Multi-root: render a "Roots:" section so operators can see which
      // worktrees are active + how many schedules each contributes.
      const schedulesByLabel = new Map<string, number>();
      for (const s of statuses) {
        const label = s.name.includes("::") ? s.name.split("::", 1)[0] : "";
        schedulesByLabel.set(label, (schedulesByLabel.get(label) ?? 0) + 1);
      }
      console.log("Roots:");
      const labelColWidth = Math.max(
        ...this.normalized.roots.map((r) => (r.label || "parent").length),
        6,
      );
      for (const root of this.normalized.roots) {
        const displayLabel = root.label || "parent";
        const count = schedulesByLabel.get(root.label) ?? 0;
        const plural = count === 1 ? "" : "s";
        console.log(
          `  ${displayLabel.padEnd(labelColWidth)}  →  ${root.workspacePath} (${count} schedule${plural})`,
        );
      }
      console.log("");
    }

    if (statuses.length > 0) {
      console.log(`Heartbeat schedules: ${statuses.length}`);
      for (const s of statuses) {
        console.log(`  ${s.cronExpr}  →  ${s.name}`);
      }
    } else {
      console.log("Heartbeat schedules: none");
    }

    if (isMulti) {
      // Per-root log tails so operators can diff worktrees at a glance.
      for (const root of this.normalized.roots) {
        const logger = this.loggers.get(root.label);
        if (!logger) continue;
        const recent = logger.tail(10);
        if (recent) {
          console.log("");
          console.log(`Recent log (${root.label || "parent"}):`);
          console.log(recent);
        }
      }
    } else {
      // Legacy single-root: one log tail, unlabelled, exactly as pre-PR-3.
      const recent = this.primaryLogger().tail(10);
      if (recent) {
        console.log("");
        console.log("Recent log:");
        console.log(recent);
      }
    }
  }

  /** Migrate legacy HEARTBEAT.md into heartbeats/ with frontmatter */
  migrate(): void {
    const heartbeatsDir = join(this.primaryRoot.workspacePath, "heartbeats");
    const legacyFile = join(this.primaryRoot.workspacePath, "HEARTBEAT.md");
    const targetFile = join(heartbeatsDir, "default.md");

    if (existsSync(targetFile)) {
      console.log("heartbeats/default.md already exists — not overwriting.");
      return;
    }

    if (!existsSync(legacyFile)) {
      console.log("No HEARTBEAT.md found — nothing to migrate.");
      return;
    }

    const interval = this.normalized.defaultInterval ?? 1800;
    const agent = this.normalized.defaultAgent ?? "claude";
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

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private parseAll(): Promise<HeartbeatEntry[]> {
    return parseHeartbeatConfigAcrossRoots(
      this.normalized.roots,
      this.normalized.defaultAgent,
      this.normalized.defaultInterval,
    );
  }

  /**
   * Human-readable description for console output. Single-root (label "")
   * keeps the legacy `heartbeats/foo.md` form; multi-root prefixes with the
   * label so operators can tell worktrees apart at a glance.
   */
  private describeEntry(entry: HeartbeatEntry): string {
    return entry.root.label ? `${entry.root.label}::${entry.filePath}` : entry.filePath;
  }

  /**
   * Primary logger = the one owned by the first root (typically the parent
   * checkout). Daemon-scope operational messages without a clearer owner
   * land here; spec § "Logger" option 1 explicitly avoids a new daemon-wide
   * log file.
   */
  private primaryLogger(): HeartbeatLogger {
    const logger = this.loggers.get(this.primaryRoot.label);
    if (!logger) {
      // Constructor guarantees a logger per root, so this would be a bug.
      throw new Error(
        `HeartbeatDaemon: no logger registered for primary root label "${this.primaryRoot.label}"`,
      );
    }
    return logger;
  }

  /** Logger for a specific root label, with primary logger as fallback. */
  private loggerFor(rootLabel: string): HeartbeatLogger {
    return this.loggers.get(rootLabel) ?? this.primaryLogger();
  }

  /**
   * True when the daemon is running under multi-root semantics. A single
   * root with an empty label is the legacy back-compat shape and must
   * render status() output byte-identically to pre-PR-3.
   */
  private isMultiRoot(): boolean {
    if (this.normalized.roots.length !== 1) return true;
    return this.normalized.roots[0].label !== "";
  }
}
