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
  private runner: HeartbeatRunner;
  private logger: HeartbeatLogger;

  constructor(runnerOptions: RunnerOptions) {
    this.runner = new HeartbeatRunner(runnerOptions);
    this.logger = this.runner.getLogger();
  }

  start(entries: HeartbeatEntry[]): void {
    for (const entry of entries) {
      const name = entry.filePath.replace(/\.md$/, "").replace(/\//g, "-");
      const cron = new Cron(entry.cronExpr, async () => {
        try {
          await this.runner.run(entry);
        } catch (err) {
          this.logger.log(`[${name}] Error: ${err instanceof Error ? err.message : String(err)}`);
        }
      });
      this.jobs.set(name, cron);
      this.logger.log(`[${name}] Scheduled: ${entry.cronExpr}`);
    }
  }

  stop(): void {
    for (const [name, cron] of this.jobs) {
      cron.stop();
      this.logger.log(`[${name}] Stopped`);
    }
    this.jobs.clear();
  }

  sync(entries: HeartbeatEntry[]): void {
    this.stop();
    this.start(entries);
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
