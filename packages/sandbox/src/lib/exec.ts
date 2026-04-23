import { spawnSync, execSync, type SpawnSyncOptions } from "node:child_process";

export interface RunOptions {
  cwd?: string;
  env?: Record<string, string>;
  stdio?: "inherit" | "pipe";
}

/**
 * Run a command with stdio inherited (output streams to terminal).
 * Throws on non-zero exit code.
 */
export function run(cmd: string[], opts: RunOptions = {}): void {
  const [bin, ...args] = cmd;
  const spawnOpts: SpawnSyncOptions = {
    stdio: opts.stdio ?? "inherit",
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
  };

  const result = spawnSync(bin, args, spawnOpts);

  if (result.error) {
    throw new Error(`Failed to execute ${bin}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${cmd.join(" ")}`);
  }
}

/**
 * Run a command but ignore errors (for cleanup operations).
 * Returns true if the command succeeded.
 */
export function runSafe(cmd: string[], opts: RunOptions = {}): boolean {
  const [bin, ...args] = cmd;
  const spawnOpts: SpawnSyncOptions = {
    stdio: opts.stdio ?? "inherit",
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
  };

  const result = spawnSync(bin, args, spawnOpts);
  return result.status === 0;
}

/**
 * Run a command and capture stdout.
 * Throws on non-zero exit code.
 */
export function capture(cmd: string[], opts: Omit<RunOptions, "stdio"> = {}): string {
  const command = cmd.join(" ");
  try {
    return execSync(command, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err) {
    const error = err as { status?: number; stderr?: string };
    throw new Error(
      `Command failed with exit code ${error.status}: ${command}\n${error.stderr ?? ""}`,
    );
  }
}

/**
 * Run a command and capture stdout.
 * Returns undefined on failure (non-zero exit or spawn error) instead of throwing.
 */
export function captureSafe(cmd: string[], opts: Omit<RunOptions, "stdio"> = {}): string | undefined {
  const command = cmd.join(" ");
  try {
    return execSync(command, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch {
    return undefined;
  }
}
