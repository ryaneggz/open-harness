import { Cron } from "croner";
import type { HeartbeatEntry } from "./config.js";
import { HeartbeatRunner, type RunnerOptions } from "./runner.js";
import { HeartbeatLogger } from "./logger.js";

export interface SchedulerStatus {
  name: string;
  cronExpr: string;
  nextRun: Date | null;
  isRunning: boolean;
}

/**
 * Internal record pairing a scheduled `Cron` with the owning root label —
 * saved at schedule time so `sync()` / `stop()` can route the corresponding
 * log line to the same per-root logger the runner uses for that entry.
 * Without this the scheduler would have no way to reconstruct the root from
 * the flat job map, since the composite name strips path info.
 */
interface ScheduledJob {
  cron: Cron;
  rootLabel: string;
}

export class HeartbeatScheduler {
  private jobs: Map<string, ScheduledJob> = new Map();
  private fingerprints: Map<string, string> = new Map();
  private runner: HeartbeatRunner;

  constructor(runnerOptions: RunnerOptions) {
    this.runner = new HeartbeatRunner(runnerOptions);
  }

  start(entries: HeartbeatEntry[]): void {
    for (const entry of entries) {
      const name = this.entryName(entry);
      this.jobs.set(name, {
        cron: this.createJob(name, entry),
        rootLabel: entry.root.label,
      });
      this.fingerprints.set(name, this.fingerprint(entry));
      this.loggerFor(entry.root.label).log(`[${name}] Scheduled: ${entry.cronExpr}`);
    }
  }

  stop(): void {
    for (const [name, job] of this.jobs) {
      job.cron.stop();
      this.loggerFor(job.rootLabel).log(`[${name}] Stopped`);
    }
    this.jobs.clear();
    this.fingerprints.clear();
  }

  /** Differential sync: only stop/start jobs that changed */
  sync(entries: HeartbeatEntry[]): void {
    const newMap = new Map<string, HeartbeatEntry>();
    const newFps = new Map<string, string>();
    for (const entry of entries) {
      const name = this.entryName(entry);
      newMap.set(name, entry);
      newFps.set(name, this.fingerprint(entry));
    }

    // Stop removed or changed jobs
    for (const [name, job] of this.jobs) {
      const newFp = newFps.get(name);
      if (!newFp || newFp !== this.fingerprints.get(name)) {
        job.cron.stop();
        this.jobs.delete(name);
        this.fingerprints.delete(name);
        this.loggerFor(job.rootLabel).log(`[${name}] Stopped (${newFp ? "changed" : "removed"})`);
      }
    }

    // Start new or changed jobs
    for (const [name, entry] of newMap) {
      if (!this.jobs.has(name)) {
        this.jobs.set(name, {
          cron: this.createJob(name, entry),
          rootLabel: entry.root.label,
        });
        this.fingerprints.set(name, this.fingerprint(entry));
        this.loggerFor(entry.root.label).log(`[${name}] Scheduled: ${entry.cronExpr}`);
      }
    }
  }

  /**
   * Composite schedule key: `<label>::<slug>` when label is non-empty,
   * otherwise just `<slug>`. The empty-label branch keeps single-root slugs
   * byte-identical to the legacy `filePath → slug` mapping so existing
   * consumers (logs, status output, tests) see no change.
   */
  private entryName(entry: HeartbeatEntry): string {
    const slug = entry.filePath.replace(/\.md$/, "").replace(/\//g, "-");
    return entry.root.label ? `${entry.root.label}::${slug}` : slug;
  }

  /**
   * Fingerprint includes the root's workspacePath so the same filename in
   * two different worktrees produces distinct fingerprints — a path change
   * forces a reschedule even if cronExpr/agent/active didn't move.
   */
  private fingerprint(entry: HeartbeatEntry): string {
    return `${entry.root.workspacePath}|${entry.cronExpr}|${entry.agent}|${entry.activeStart ?? ""}|${entry.activeEnd ?? ""}`;
  }

  /**
   * Fetch the logger owned by the given root label from the runner. We go
   * through the runner (rather than holding a second reference) so there's
   * only one source of truth for the per-root logger map — the runner owns
   * it, scheduler borrows.
   */
  private loggerFor(rootLabel: string): HeartbeatLogger {
    // Synthetic root object — only `label` is read by getLoggerFor, the
    // other fields are unused during logger lookup.
    return this.runner.getLoggerFor({
      workspacePath: "",
      heartbeatDir: "",
      label: rootLabel,
    });
  }

  private createJob(name: string, entry: HeartbeatEntry): Cron {
    return new Cron(entry.cronExpr, async () => {
      try {
        await this.runner.run(entry);
      } catch (err) {
        this.loggerFor(entry.root.label).log(
          `[${name}] Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    });
  }

  status(): SchedulerStatus[] {
    return Array.from(this.jobs.entries()).map(([name, job]) => ({
      name,
      cronExpr: job.cron.getPattern() ?? "",
      nextRun: job.cron.nextRun(),
      isRunning: job.cron.isRunning(),
    }));
  }

  getRunner(): HeartbeatRunner {
    return this.runner;
  }
}
