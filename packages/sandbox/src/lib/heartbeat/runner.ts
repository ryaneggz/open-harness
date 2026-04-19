import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { basename, join } from "node:path";
import { HeartbeatLogger } from "./logger.js";
import { isActiveHours, isHeartbeatEmpty, isHeartbeatOk } from "./gates.js";
import type { HeartbeatEntry } from "./config.js";

/**
 * Legacy single-root runner options. Retained for back-compat — the daemon
 * still constructs the scheduler (which owns the runner) with these fields.
 * Per-entry paths resolve off `entry.root` in PR-2; PR-1 only threads the
 * type through and does not change spawn behaviour.
 */
export interface RunnerOptions {
  workspacePath: string;
  heartbeatDir: string;
  soulFile?: string;
  memoryDir?: string;
}

export class HeartbeatRunner {
  private logger: HeartbeatLogger;
  private running = new Set<string>();

  constructor(private options: RunnerOptions) {
    this.logger = new HeartbeatLogger(`${options.heartbeatDir}/heartbeat.log`);
  }

  async run(entry: HeartbeatEntry): Promise<void> {
    // 1. Resolve file path (relative to workspace if not absolute)
    const filePath = entry.filePath.startsWith("/")
      ? entry.filePath
      : join(this.options.workspacePath, entry.filePath);

    const entryName = basename(filePath, ".md");

    // 2. In-memory guard — composite key matches the scheduler's entryName
    //    so cross-root same-name entries don't collide, but single-root
    //    (label === "") collapses to bare `entryName` and stays identical
    //    to the legacy behaviour.
    const guardKey = entry.root.label ? `${entry.root.label}::${entryName}` : entryName;

    if (this.running.has(guardKey)) {
      this.logger.log(`[${entryName}] Skipping — previous execution still running`);
      this.logger.rotate();
      return;
    }

    this.running.add(guardKey);

    try {
      // 3a. Check active hours gate
      if (!isActiveHours(entry.activeStart, entry.activeEnd)) {
        this.logger.log(`[${entryName}] Outside active hours, skipping`);
        return;
      }

      // 3b. Check empty file gate
      if (isHeartbeatEmpty(filePath)) {
        this.logger.log(`[${entryName}] File is effectively empty, skipping`);
        return;
      }

      // 4. Read file content
      const heartbeatContent = readFileSync(filePath, "utf-8") as string;

      // 5. Build prompt (with SOUL.md if present and non-empty)
      let prompt = "";
      const soulPath = this.options.soulFile ?? join(this.options.workspacePath, "SOUL.md");
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

      this.logger.log(`[${entryName}] Running heartbeat (agent: ${entry.agent})`);

      // 6. Spawn agent with AbortSignal.timeout(300s).
      //    Note: PR-2 will add `cwd: entry.root.workspacePath` so the agent
      //    CLI resolves skills and relative paths inside the worktree. PR-1
      //    keeps spawn behaviour byte-identical to avoid behavioural change.
      const response = await this.spawnAgent(entry.agent, prompt, entryName);

      // 7. Log result (response === null means timeout/failure handled inside spawnAgent)
      if (response !== null) {
        if (isHeartbeatOk(response)) {
          this.logger.log(`[${entryName}] HEARTBEAT_OK`);
        } else {
          this.logger.log(`[${entryName}] Response: ${response}`);
        }
      }
    } finally {
      // 8. Release guard
      this.running.delete(guardKey);
      // 9. Rotate log
      this.logger.rotate();
    }
  }

  /**
   * Spawn the agent process and collect stdout.
   * Returns collected stdout string on success, null on timeout or failure.
   */
  private spawnAgent(agent: string, prompt: string, entryName: string): Promise<string | null> {
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

      let proc;
      try {
        proc = spawn(agent, args, {
          signal: AbortSignal.timeout(300_000),
        });
      } catch (err: unknown) {
        if (isAbortError(err)) {
          this.logger.log(`[${entryName}] Timed out (300s limit)`);
        } else {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.log(`[${entryName}] Failed to spawn: ${msg}`);
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
          this.logger.log(`[${entryName}] Timed out (300s limit)`);
        } else {
          this.logger.log(`[${entryName}] Spawn error: ${err.message}`);
        }
        resolve(null);
      });

      proc.on("close", (code: number | null) => {
        if (code === 124) {
          this.logger.log(`[${entryName}] Timed out (300s limit)`);
          resolve(null);
        } else if (code !== 0) {
          const snippet = stdout.slice(0, 500);
          this.logger.log(`[${entryName}] Failed (exit code ${code ?? "null"}): ${snippet}`);
          resolve(null);
        } else {
          resolve(stdout.trim());
        }
      });
    });
  }

  getLogger(): HeartbeatLogger {
    return this.logger;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}
