import {
  parseHeartbeatConfig,
  parseHeartbeatConfigAcrossRoots,
  secondsToCron,
  type HeartbeatEntry,
  type WorkspaceRoot,
} from "./config.js";
import { HeartbeatScheduler } from "./scheduler.js";
import { HeartbeatLogger } from "./logger.js";
import { discoverWorkspaceRoots } from "./discovery.js";
import type { RunnerOptions } from "./runner.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync, watch, type FSWatcher } from "node:fs";
import { join } from "node:path";

/**
 * Soft cap: warn (don't fail) when the number of watched roots exceeds this.
 * Node's default inotify limit is ~8k; realistic worktree counts never get
 * close, so exceeding this almost always indicates a mis-discovery loop.
 */
const ROOT_COUNT_WARN_THRESHOLD = 32;

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
  /**
   * PR-4 — opt-in hot worktree add/remove. When set, the daemon installs a
   * watcher on `<home>/harness/.git/worktrees/` (git's own worktree-tracking
   * directory) and re-runs `discoverWorkspaceRoots(home, rootsEnv)` whenever
   * entries appear or disappear. Newly-discovered roots get a heartbeat-dir
   * watcher + logger; removed roots have theirs torn down. The scheduler is
   * differentially re-synced.
   *
   * Callers that construct `workspaceRoots` manually (e.g. tests, operators
   * pinning a fixed list) can omit this — the top-level watcher simply never
   * starts.
   */
  rediscover?: {
    /** Absolute path used as the HOME argument to `discoverWorkspaceRoots`. */
    home: string;
    /**
     * Raw value of `HEARTBEAT_ROOTS` (or equivalent override string) so
     * rediscovery honours the same overrides the CLI used at startup.
     */
    rootsEnv?: string;
  };
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
  /**
   * Present only when constructed via `MultiRootDaemonOptions.rediscover`.
   * Drives the `.git/worktrees/` watcher in PR-4. Legacy single-root setups
   * never set this, so rediscovery is a no-op there.
   */
  rediscover?: MultiRootDaemonOptions["rediscover"];
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
      rediscover: opts.rediscover,
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
  /**
   * Per-root heartbeat-dir watchers keyed by `root.label`. Keyed (not an
   * array) so PR-4's `rediscoverRoots()` can tear down a single root's
   * watcher when its worktree disappears, without disturbing the others.
   */
  private heartbeatWatchers: Map<string, FSWatcher> = new Map();
  private watchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * PR-4 — watcher on `<home>/harness/.git/worktrees/`. Fires when git adds
   * or removes a worktree entry; callback triggers `rediscoverRoots()` to
   * differentially sync roots. `null` when not in multi-root rediscovery
   * mode, when `.git/worktrees/` doesn't exist yet, or after `stop()`.
   */
  private topLevelWatcher: FSWatcher | null = null;
  private topLevelDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  /**
   * Serializes `rediscoverRoots()` calls so overlapping top-level-watcher
   * events (e.g. `git worktree add` emits multiple mutation events in
   * rapid succession) can't interleave logger/watcher teardown with
   * startup. The debounce timer already coalesces bursts; this guards
   * against a regular `sync()` racing a rediscovery.
   */
  private rediscoverInFlight: Promise<void> | null = null;
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
      this.watchRoot(root);
    }
    // PR-4 — only install the top-level watcher when rediscovery is
    // configured. Legacy single-root (opts.rediscover undefined) never
    // watches `.git/worktrees/` because no caller could act on the event.
    this.startTopLevelWatcher();
  }

  /**
   * Install a heartbeat-directory watcher for a single root. Extracted from
   * `startWatching()` so PR-4's `rediscoverRoots()` can add watchers for
   * newly-discovered roots without re-iterating the whole set.
   *
   * Idempotent: if a watcher already exists for this label, returns
   * early. Silently skips roots whose `heartbeatDir` is missing — those
   * will be picked up on the next rediscovery if they appear later.
   */
  private watchRoot(root: WorkspaceRoot): void {
    if (this.heartbeatWatchers.has(root.label)) return;

    const dir = root.heartbeatDir;
    if (!existsSync(dir)) return;

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
        this.loggerFor(root.label).log(`[watcher:${root.label || "parent"}] Error: ${err.message}`);
      });

      this.heartbeatWatchers.set(root.label, watcher);
    } catch (err) {
      this.loggerFor(root.label).log(
        `[watcher:${root.label || "parent"}] Failed to watch ${dir}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Close and drop the heartbeat-dir watcher for a single root (if any). */
  private unwatchRoot(label: string): void {
    const watcher = this.heartbeatWatchers.get(label);
    if (!watcher) return;
    try {
      watcher.close();
    } catch {
      // ignore — watcher may already be closed
    }
    this.heartbeatWatchers.delete(label);
  }

  /**
   * PR-4 — watch `<home>/harness/.git/worktrees/` so new or removed
   * worktrees are picked up without a daemon restart. Git maintains one
   * subdirectory in that path per non-parent worktree; directory entries
   * appearing/disappearing exactly corresponds to worktrees being
   * added/removed, which is what we want to react to.
   *
   * Only installs the watcher when:
   *  1. The constructor was given `rediscover` options (i.e., the CLI
   *     provisioned this daemon via discovery); AND
   *  2. `<home>/harness/.git/worktrees/` exists.
   *
   * Skipped silently otherwise — both cases are normal (legacy single-root
   * daemon, fresh repo with no worktrees, non-git test fixtures).
   */
  private startTopLevelWatcher(): void {
    const rediscover = this.normalized.rediscover;
    if (!rediscover) return;

    const worktreesDir = join(rediscover.home, "harness", ".git", "worktrees");
    if (!existsSync(worktreesDir)) {
      this.primaryLogger().log(
        `[watcher:worktrees] ${worktreesDir} does not exist — hot worktree add/remove disabled`,
      );
      return;
    }

    try {
      const watcher = watch(worktreesDir, { persistent: false }, () => {
        // Git briefly creates/deletes intermediary dirs during a single
        // `worktree add` — same 500ms debounce as the heartbeat-dir watcher
        // so a burst collapses to one rediscovery pass.
        if (this.topLevelDebounceTimer) clearTimeout(this.topLevelDebounceTimer);
        this.topLevelDebounceTimer = setTimeout(() => {
          this.topLevelDebounceTimer = null;
          void this.rediscoverRoots().catch((err) => {
            this.primaryLogger().log(
              `[watcher:worktrees] Rediscovery error: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
        }, 500);
      });

      watcher.on("error", (err) => {
        this.primaryLogger().log(`[watcher:worktrees] Error: ${err.message}`);
      });

      this.topLevelWatcher = watcher;
    } catch (err) {
      this.primaryLogger().log(
        `[watcher:worktrees] Failed to watch ${worktreesDir}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Close the top-level watcher and clear its debounce timer. */
  private stopTopLevelWatcher(): void {
    if (this.topLevelDebounceTimer) {
      clearTimeout(this.topLevelDebounceTimer);
      this.topLevelDebounceTimer = null;
    }
    if (this.topLevelWatcher) {
      try {
        this.topLevelWatcher.close();
      } catch {
        // ignore — watcher may already be closed
      }
      this.topLevelWatcher = null;
    }
  }

  /**
   * PR-4 — re-run discovery and differentially reconcile roots.
   *
   * Triggered by the `.git/worktrees/` watcher (or called directly from
   * tests). Steps:
   *   1. Re-run `discoverWorkspaceRoots(home, rootsEnv)`.
   *   2. Diff against `this.normalized.roots` by `workspacePath`:
   *        added   = new  - old
   *        removed = old  - new
   *      Untouched paths keep their existing logger/watcher instances.
   *   3. For each removed root: close its heartbeat-dir watcher, drop its
   *      logger, drop it from `normalized.roots`.
   *   4. For each added root: instantiate a logger, install a heartbeat-dir
   *      watcher, append to `normalized.roots`.
   *   5. Call `sync()` once so the scheduler differentially reconciles
   *      entries (scheduler already handles add/remove correctly).
   *
   * Serialized via `rediscoverInFlight` so overlapping top-level events
   * queue rather than interleave. Safe to call when `rediscover` is unset —
   * it simply returns.
   */
  async rediscoverRoots(): Promise<void> {
    const rediscover = this.normalized.rediscover;
    if (!rediscover) return;

    // Serialize: if a rediscovery is in flight, wait for it to finish then
    // run our own pass (the FS state could have changed again in the gap).
    if (this.rediscoverInFlight) {
      await this.rediscoverInFlight;
    }

    this.rediscoverInFlight = this.doRediscover(rediscover);
    try {
      await this.rediscoverInFlight;
    } finally {
      this.rediscoverInFlight = null;
    }
  }

  private async doRediscover(
    rediscover: NonNullable<NormalizedDaemonOptions["rediscover"]>,
  ): Promise<void> {
    const fresh = discoverWorkspaceRoots(rediscover.home, rediscover.rootsEnv);

    const oldByPath = new Map(this.normalized.roots.map((r) => [r.workspacePath, r]));
    const newByPath = new Map(fresh.map((r) => [r.workspacePath, r]));

    const added: WorkspaceRoot[] = [];
    const removed: WorkspaceRoot[] = [];
    for (const [path, root] of newByPath) {
      if (!oldByPath.has(path)) added.push(root);
    }
    for (const [path, root] of oldByPath) {
      if (!newByPath.has(path)) removed.push(root);
    }

    if (added.length === 0 && removed.length === 0) return;

    // Tear down removed roots first so their watcher/logger state is gone
    // before `sync()` re-parses and the scheduler drops their entries.
    for (const root of removed) {
      this.unwatchRoot(root.label);
      this.loggers.delete(root.label);
      this.primaryLogger().log(
        `[watcher:worktrees] Removed root ${root.label || "parent"} (${root.workspacePath})`,
      );
    }

    // Bring in new roots: logger first, then watcher (watcher callback uses
    // `loggerFor(root.label)`).
    for (const root of added) {
      this.loggers.set(root.label, new HeartbeatLogger(join(root.heartbeatDir, "heartbeat.log")));
      this.watchRoot(root);
      this.primaryLogger().log(
        `[watcher:worktrees] Added root ${root.label || "parent"} (${root.workspacePath})`,
      );
    }

    // Replace the normalized root list with the fresh set in their
    // deterministic path-sorted order so logs/status remain stable.
    this.normalized.roots = fresh;

    // Soft warn if we blow past the watcher threshold — see
    // ROOT_COUNT_WARN_THRESHOLD rationale.
    if (this.normalized.roots.length > ROOT_COUNT_WARN_THRESHOLD) {
      this.primaryLogger().log(
        `[watcher:worktrees] Warning: ${this.normalized.roots.length} roots exceeds soft cap of ${ROOT_COUNT_WARN_THRESHOLD}`,
      );
    }

    // Differential scheduler re-sync. The scheduler is idempotent so it's
    // fine if a regular heartbeat-dir event fires during this window.
    await this.sync();
  }

  /** Close every file watcher and clear any pending debounce timer */
  private stopWatching(): void {
    if (this.watchDebounceTimer) {
      clearTimeout(this.watchDebounceTimer);
      this.watchDebounceTimer = null;
    }
    for (const watcher of this.heartbeatWatchers.values()) {
      try {
        watcher.close();
      } catch {
        // ignore — watcher may already be closed
      }
    }
    this.heartbeatWatchers.clear();
    this.stopTopLevelWatcher();
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
