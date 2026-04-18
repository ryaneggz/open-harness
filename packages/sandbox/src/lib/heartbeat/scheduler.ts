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

export class HeartbeatScheduler {
  private jobs: Map<string, Cron> = new Map();
  private fingerprints: Map<string, string> = new Map();
  private runner: HeartbeatRunner;
  private logger: HeartbeatLogger;

  constructor(runnerOptions: RunnerOptions) {
    this.runner = new HeartbeatRunner(runnerOptions);
    this.logger = this.runner.getLogger();
  }

  start(entries: HeartbeatEntry[]): void {
    for (const entry of entries) {
      const name = this.entryName(entry);
      this.jobs.set(name, this.createJob(name, entry));
      this.fingerprints.set(name, this.fingerprint(entry));
      this.logger.log(`[${name}] Scheduled: ${entry.cronExpr}`);
    }
  }

  stop(): void {
    for (const [name, cron] of this.jobs) {
      cron.stop();
      this.logger.log(`[${name}] Stopped`);
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
    for (const [name, cron] of this.jobs) {
      const newFp = newFps.get(name);
      if (!newFp || newFp !== this.fingerprints.get(name)) {
        cron.stop();
        this.jobs.delete(name);
        this.fingerprints.delete(name);
        this.logger.log(`[${name}] Stopped (${newFp ? "changed" : "removed"})`);
      }
    }

    // Start new or changed jobs
    for (const [name, entry] of newMap) {
      if (!this.jobs.has(name)) {
        this.jobs.set(name, this.createJob(name, entry));
        this.fingerprints.set(name, this.fingerprint(entry));
        this.logger.log(`[${name}] Scheduled: ${entry.cronExpr}`);
      }
    }
  }

  private entryName(entry: HeartbeatEntry): string {
    return entry.filePath.replace(/\.md$/, "").replace(/\//g, "-");
  }

  private fingerprint(entry: HeartbeatEntry): string {
    return `${entry.cronExpr}|${entry.agent}|${entry.activeStart ?? ""}|${entry.activeEnd ?? ""}`;
  }

  private createJob(name: string, entry: HeartbeatEntry): Cron {
    return new Cron(entry.cronExpr, async () => {
      try {
        await this.runner.run(entry);
      } catch (err) {
        this.logger.log(`[${name}] Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    });
  }

  status(): SchedulerStatus[] {
    return Array.from(this.jobs.entries()).map(([name, cron]) => ({
      name,
      cronExpr: cron.getPattern() ?? "",
      nextRun: cron.nextRun(),
      isRunning: cron.isRunning(),
    }));
  }

  getRunner(): HeartbeatRunner {
    return this.runner;
  }
}
