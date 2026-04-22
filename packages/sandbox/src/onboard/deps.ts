/**
 * Wire up a real {@link Deps} bag from node APIs for production use.
 * Tests substitute fakes directly; this factory is only used by the CLI
 * entrypoint.
 */

import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { realIo } from "./io.js";
import type { Deps, ExecOptions, ExecResult, FsDeps } from "./types.js";

const fs: FsDeps = {
  exists: (path) => existsSync(path),
  readFile: (path) => readFileSync(path, "utf-8"),
  writeFile: (path, contents) => writeFileSync(path, contents),
  appendFile: (path, contents) => appendFileSync(path, contents),
  mkdirp: (path) => {
    mkdirSync(path, { recursive: true });
  },
  symlink: (target, link) => symlinkSync(target, link),
  chmod: (path, mode) => chmodSync(path, mode),
  stat: (path) => {
    try {
      const s = statSync(path);
      return { size: s.size };
    } catch {
      return null;
    }
  },
};

function mergedEnv(opts?: ExecOptions): Record<string, string> {
  const base: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v !== undefined) base[k] = v;
  }
  return { ...base, ...(opts?.env ?? {}) };
}

function run(cmd: string[], opts?: ExecOptions): void {
  const [bin, ...args] = cmd;
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    cwd: opts?.cwd,
    env: mergedEnv(opts),
  });
  if (result.error) throw new Error(`Failed to execute ${bin}: ${result.error.message}`);
  if (result.status !== 0) {
    throw new Error(`Command failed with exit code ${result.status}: ${cmd.join(" ")}`);
  }
}

function runSafe(cmd: string[], opts?: ExecOptions): boolean {
  const [bin, ...args] = cmd;
  const result = spawnSync(bin, args, {
    stdio: "inherit",
    cwd: opts?.cwd,
    env: mergedEnv(opts),
  });
  return result.status === 0;
}

function capture(cmd: string[], opts?: ExecOptions): ExecResult {
  const [bin, ...args] = cmd;
  const result = spawnSync(bin, args, {
    cwd: opts?.cwd,
    env: mergedEnv(opts),
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status ?? -1,
    stdout: (result.stdout ?? "").toString(),
    stderr: (result.stderr ?? "").toString(),
  };
}

function which(bin: string): string | null {
  const result = spawnSync("sh", ["-c", `command -v ${bin}`], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) return null;
  const path = (result.stdout ?? "").toString().trim();
  return path.length > 0 ? path : null;
}

export function makeRealDeps(): Deps {
  const envRecord: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(process.env)) envRecord[k] = v;

  return {
    env: envRecord,
    home: process.env.HOME ?? "/home/sandbox",
    fs,
    exec: { run, runSafe, capture, which },
    io: realIo(),
    clock: {
      nowUtcIso: () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
  };
}
