import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { HeartbeatLogger } from "./logger.js";
import { isActiveHours, isHeartbeatEmpty, isHeartbeatOk } from "./gates.js";
import type { HeartbeatEntry, WorkspaceRoot } from "./config.js";

/**
 * Legacy single-root runner options. Retained for back-compat — the daemon
 * still constructs the scheduler (which owns the runner) with these fields
 * in single-root mode. Per-entry paths resolve off `entry.root` per call.
 */
export interface RunnerOptions {
  workspacePath: string;
  heartbeatDir: string;
  soulFile?: string;
  memoryDir?: string;
  /**
   * Global concurrency cap across ALL entries and ALL roots. Used to avoid
   * stacking N concurrent `claude -p` processes against a single API key
   * when multiple worktrees' schedules align. Defaults to
   * `process.env.HEARTBEAT_MAX_CONCURRENT` (or 2 when unset). Set to `0` to
   * disable the cap (legacy behaviour, unlimited concurrency).
   */
  maxConcurrent?: number;
  /**
   * Optional per-root logger map keyed by `root.label`. When provided, the
   * runner writes every entry-scoped log line through the matching logger so
   * each worktree's events land in its own `heartbeats/heartbeat.log`.
   *
   * Back-compat: when omitted, the runner constructs a single logger at
   * `<heartbeatDir>/heartbeat.log` (keyed by label `""`) so legacy
   * single-root consumers continue to write to the same file as before.
   */
  loggers?: Map<string, HeartbeatLogger>;
}

/**
 * How long a cron-tick waiter is willing to sit in the semaphore queue before
 * giving up and logging a "Skipped (concurrency cap reached)" line. Matches
 * the 300s per-run spawn timeout so a queued waiter never outlives the
 * already-running process it's waiting for.
 */
const ACQUIRE_TIMEOUT_MS = 300_000;

export class HeartbeatRunner {
  private loggers: Map<string, HeartbeatLogger>;
  private running = new Set<string>();
  private maxConcurrent: number;
  private active = 0;
  private waiters: Array<{
    resolve: (acquired: boolean) => void;
    timer: ReturnType<typeof setTimeout>;
  }> = [];

  constructor(private options: RunnerOptions) {
    // Either the caller wired up per-root loggers (multi-root) or we mint a
    // single-root logger keyed by "" so entry lookup by `entry.root.label`
    // works uniformly.
    if (options.loggers && options.loggers.size > 0) {
      this.loggers = options.loggers;
    } else {
      this.loggers = new Map();
      this.loggers.set("", new HeartbeatLogger(`${options.heartbeatDir}/heartbeat.log`));
    }
    // Options wins over env so callers can force a specific cap in tests.
    const fromEnv = parseInt(process.env.HEARTBEAT_MAX_CONCURRENT ?? "", 10);
    this.maxConcurrent = options.maxConcurrent ?? (Number.isFinite(fromEnv) ? fromEnv : 2);
  }

  async run(entry: HeartbeatEntry): Promise<void> {
    // 1. Resolve file path (relative to ENTRY root workspace if not absolute)
    const rootWorkspace = entry.root.workspacePath;
    const filePath = entry.filePath.startsWith("/")
      ? entry.filePath
      : join(rootWorkspace, entry.filePath);

    const entryName = basename(filePath, ".md");
    const logLabel = entry.root.label ? `${entry.root.label}::${entryName}` : entryName;
    const logger = this.getLoggerFor(entry.root);

    // 2. In-memory guard — composite key matches the scheduler's entryName
    //    so cross-root same-name entries don't collide, but single-root
    //    (label === "") collapses to bare `entryName` and stays identical
    //    to the legacy behaviour.
    const guardKey = entry.root.label ? `${entry.root.label}::${entryName}` : entryName;

    if (this.running.has(guardKey)) {
      logger.log(`[${logLabel}] Skipping — previous execution still running`);
      logger.rotate();
      return;
    }

    this.running.add(guardKey);

    try {
      // 3a. Check active hours gate
      if (!isActiveHours(entry.activeStart, entry.activeEnd)) {
        logger.log(`[${logLabel}] Outside active hours, skipping`);
        return;
      }

      // 3b. Check empty file gate
      if (isHeartbeatEmpty(filePath)) {
        logger.log(`[${logLabel}] File is effectively empty, skipping`);
        return;
      }

      // 4. Read file content
      const heartbeatContent = readFileSync(filePath, "utf-8") as string;

      // 5. Build prompt (with SOUL.md if present and non-empty)
      let prompt = "";
      const soulPath = entry.root.soulFile ?? join(rootWorkspace, "SOUL.md");
      if (existsSync(soulPath)) {
        const soulContent = readFileSync(soulPath, "utf-8") as string;
        if (soulContent.trim().length > 0) {
          prompt = `${soulContent}\n\n---\n\n`;
        }
      }

      const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

      prompt +=
        `You are performing a periodic heartbeat check. Read the heartbeat content below and follow its instructions strictly.\n\n` +
        `If all tasks are complete or nothing needs attention, reply with exactly: HEARTBEAT_OK\n` +
        `If any task requires action, perform it and report what you did. Keep responses concise.\n\n` +
        `If you learn anything worth remembering long-term, append it to memory/${today}.md (create the memory/ directory and file if needed).\n\n` +
        `---\n${entryName}:\n${heartbeatContent}\n---`;

      // 6. Acquire a slot from the global semaphore before spawning. Fast
      //    path (slot free) is synchronous so we don't introduce an extra
      //    microtask boundary that would race against mocked spawn-time
      //    event scheduling in tests (and avoid needless scheduling churn
      //    in the common uncontended case in production).
      const acquireResult = this.tryAcquireSlot();
      let acquired: boolean;
      if (acquireResult === "granted") {
        acquired = true;
      } else {
        acquired = await this.waitForSlot();
      }
      if (!acquired) {
        logger.log(`[${logLabel}] Skipped (concurrency cap reached)`);
        return;
      }

      logger.log(`[${logLabel}] Running heartbeat (agent: ${entry.agent})`);

      try {
        // 7. Spawn agent with AbortSignal.timeout(300s). Pass cwd when the
        //    entry comes from a labelled (discovered) root so the agent CLI
        //    resolves skills and relative paths inside the worktree's
        //    workspace. Single-root back-compat (label === "") preserves the
        //    legacy behaviour of inheriting the daemon's CWD.
        const response = await this.spawnAgent(entry.agent, prompt, logLabel, entry, logger);

        // 8. Log result (response === null means timeout/failure handled inside spawnAgent)
        if (response !== null) {
          if (isHeartbeatOk(response)) {
            logger.log(`[${logLabel}] HEARTBEAT_OK`);
          } else {
            logger.log(`[${logLabel}] Response: ${response}`);
          }
        }
      } finally {
        this.releaseSlot();
      }
    } finally {
      // Release guard + rotate log regardless of outcome
      this.running.delete(guardKey);
      logger.rotate();
    }
  }

  /**
   * Spawn the agent process and collect stdout.
   * Returns collected stdout string on success, null on timeout or failure.
   */
  private spawnAgent(
    agent: string,
    prompt: string,
    logLabel: string,
    entry: HeartbeatEntry,
    logger: HeartbeatLogger,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      let args: string[];

      switch (agent) {
        case "claude":
          args = ["-p", prompt, "--dangerously-skip-permissions"];
          break;
        case "codex":
          args = [prompt];
          break;
        default:
          args = ["-p", prompt];
      }

      // Only pass cwd for discovered roots (labelled). Single-root back-compat
      // intentionally keeps spawnOptions free of `cwd` so existing tests that
      // assert on the exact spawn call shape stay green.
      const spawnOptions: Parameters<typeof spawn>[2] = {
        signal: AbortSignal.timeout(300_000),
      };
      if (entry.root.label) {
        (spawnOptions as { cwd?: string }).cwd = entry.root.workspacePath;
      }

      let proc;
      try {
        proc = spawn(agent, args, spawnOptions);
      } catch (err: unknown) {
        if (isAbortError(err)) {
          logger.log(`[${logLabel}] Timed out (300s limit)`);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          logger.log(`[${logLabel}] Failed to spawn: ${msg}`);
        }
        resolve(null);
        return;
      }

      let stdout = "";

      proc.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });

      proc.on("error", (err: Error) => {
        if (isAbortError(err)) {
          logger.log(`[${logLabel}] Timed out (300s limit)`);
        } else {
          logger.log(`[${logLabel}] Spawn error: ${err.message}`);
        }
        resolve(null);
      });

      proc.on("close", (code: number | null) => {
        if (code === 124) {
          logger.log(`[${logLabel}] Timed out (300s limit)`);
          resolve(null);
        } else if (code !== 0) {
          const snippet = stdout.slice(0, 500);
          logger.log(`[${logLabel}] Failed (exit code ${code ?? "null"}): ${snippet}`);
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  /**
   * Legacy accessor — returns the primary logger. In single-root mode this
   * is the sole logger (label `""`) writing to the original
   * `heartbeats/heartbeat.log` path. In multi-root mode it's the first
   * logger registered (typically the parent root). Prefer `getLoggerFor`
   * when an owning root is known.
   */
  getLogger(): HeartbeatLogger {
    const first = this.loggers.values().next().value;
    if (!first) {
      // Should not happen: constructor guarantees at least one logger.
      throw new Error("HeartbeatRunner has no loggers registered");
    }
    return first;
  }

  /**
   * Return the logger owned by `root`. Falls back to the primary logger if
   * no per-label logger is registered — guarantees callers always get a
   * usable logger even for unknown roots (e.g., entries from a root that
   * was removed between discovery and execution).
   */
  getLoggerFor(root: WorkspaceRoot): HeartbeatLogger {
    const byLabel = this.loggers.get(root.label);
    if (byLabel) return byLabel;
    return this.getLogger();
  }

  // ---------------------------------------------------------------------------
  // Global concurrency semaphore
  // ---------------------------------------------------------------------------

  /**
   * Synchronous fast-path: grant a slot immediately when the cap is
   * disabled or a slot is free. Returns `"granted"` in those cases and
   * `"queued"` when the caller must `waitForSlot()` asynchronously.
   *
   * Separating acquire into a sync fast path + async wait keeps the common
   * uncontended case free of an extra microtask boundary — important both
   * for production (less scheduling churn) and for tests that rely on
   * precise event ordering with mocked child_process spawn.
   */
  private tryAcquireSlot(): "granted" | "queued" {
    if (this.maxConcurrent === 0) return "granted";
    if (this.active < this.maxConcurrent) {
      this.active += 1;
      return "granted";
    }
    return "queued";
  }

  /**
   * Slow path: enqueue a waiter and resolve `true` when a slot is handed off
   * by `releaseSlot()`, or `false` if the waiter expires before a slot
   * becomes available.
   */
  private waitForSlot(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        // Waiter expired — remove from queue and resolve `false`.
        const idx = this.waiters.findIndex((w) => w.resolve === resolve);
        if (idx >= 0) this.waiters.splice(idx, 1);
        resolve(false);
      }, ACQUIRE_TIMEOUT_MS);
      // Don't block Node from exiting on this timer alone.
      if (typeof timer === "object" && timer !== null && "unref" in timer) {
        (timer as { unref: () => void }).unref();
      }
      this.waiters.push({ resolve, timer });
    });
  }

  /**
   * Release a slot. If waiters are queued FIFO, the head of the queue is
   * granted the slot immediately and its timeout cleared.
   */
  private releaseSlot(): void {
    if (this.maxConcurrent === 0) return;
    if (this.waiters.length > 0) {
      const next = this.waiters.shift();
      if (next) {
        clearTimeout(next.timer);
        // `active` stays the same: we hand our slot directly to the waiter.
        next.resolve(true);
        return;
      }
    }
    this.active = Math.max(0, this.active - 1);
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
