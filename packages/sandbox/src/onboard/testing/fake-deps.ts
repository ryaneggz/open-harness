/**
 * In-memory test double for {@link Deps}. Records every exec invocation and
 * IO line, exposes a scripted answer queue for `ask()`, and emulates fs on
 * a plain `Map<string, string>`.
 *
 * Tests import `makeFakeDeps({...})`, seed any files, env keys, or scripted
 * answers, then call `step.run(deps, opts)` and assert against the recorder.
 */

import type { Deps, ExecOptions, ExecResult, FsDeps, IoDeps, StepId } from "../types.js";
import { ORCHESTRATOR_HOME } from "../../lib/config.js";

export interface FakeFileState {
  [path: string]: string;
}

export interface FakeExecCall {
  cmd: string[];
  opts?: ExecOptions;
  mode: "run" | "runSafe" | "capture";
}

export interface FakeExecStub {
  match: RegExp | ((cmd: string[]) => boolean);
  /** For `run` + `runSafe` this controls success; for `capture`, stdout/stderr. */
  result?: ExecResult;
  /** Thrown from `run()` when status is non-zero. runSafe returns false instead. */
  throwFromRun?: boolean;
  /** Invoked for side-effects (e.g. "tmux starts" touches a file). */
  sideEffect?: (cmd: string[], opts?: ExecOptions) => void;
}

export interface FakeWhichStub {
  [bin: string]: string | null;
}

export interface FakeIoRecord {
  level: keyof IoDeps;
  message: string;
}

export interface FakeDepsOptions {
  env?: Record<string, string | undefined>;
  home?: string;
  files?: FakeFileState;
  askAnswers?: string[];
  execStubs?: FakeExecStub[];
  which?: FakeWhichStub;
  /** Fixed "now" for the marker completedAt field. */
  now?: string;
}

export interface FakeDeps extends Deps {
  recorder: {
    execCalls: FakeExecCall[];
    io: FakeIoRecord[];
    askQuestions: string[];
    waitForEnterCount: number;
    writtenFiles: Record<string, string[]>;
    appendedFiles: Record<string, string[]>;
    symlinks: Array<{ target: string; link: string }>;
    chmods: Array<{ path: string; mode: number }>;
    sleeps: number[];
  };
  files: Map<string, string>;
  /** Enqueue additional scripted answers at runtime. */
  queueAnswer(answer: string): void;
}

export function makeFakeDeps(opts: FakeDepsOptions = {}): FakeDeps {
  const files = new Map<string, string>();
  for (const [k, v] of Object.entries(opts.files ?? {})) files.set(k, v);

  const askAnswers = [...(opts.askAnswers ?? [])];
  const execStubs = opts.execStubs ?? [];
  const whichStubs = opts.which ?? {};
  const env: Record<string, string | undefined> = { ...(opts.env ?? {}) };

  const recorder = {
    execCalls: [] as FakeExecCall[],
    io: [] as FakeIoRecord[],
    askQuestions: [] as string[],
    waitForEnterCount: 0,
    writtenFiles: {} as Record<string, string[]>,
    appendedFiles: {} as Record<string, string[]>,
    symlinks: [] as Array<{ target: string; link: string }>,
    chmods: [] as Array<{ path: string; mode: number }>,
    sleeps: [] as number[],
  };

  const fs: FsDeps = {
    exists: (p) => files.has(p),
    readFile: (p) => {
      const v = files.get(p);
      if (v === undefined) throw new Error(`fake fs: ENOENT ${p}`);
      return v;
    },
    writeFile: (p, contents) => {
      files.set(p, contents);
      (recorder.writtenFiles[p] ??= []).push(contents);
    },
    appendFile: (p, contents) => {
      const prev = files.get(p) ?? "";
      files.set(p, prev + contents);
      (recorder.appendedFiles[p] ??= []).push(contents);
    },
    mkdirp: (_p) => {
      /* no-op in the fake fs */
    },
    symlink: (target, link) => {
      // Follow the target content if we can — tests can symlink auth files.
      const existing = files.get(target);
      if (existing !== undefined && !files.has(link)) {
        files.set(link, existing);
      }
      recorder.symlinks.push({ target, link });
    },
    chmod: (path, mode) => {
      recorder.chmods.push({ path, mode });
    },
    stat: (p) => {
      const v = files.get(p);
      if (v === undefined) return null;
      return { size: v.length };
    },
  };

  function findStub(cmd: string[]): FakeExecStub | undefined {
    for (const stub of execStubs) {
      const joined = cmd.join(" ");
      if (typeof stub.match === "function") {
        if (stub.match(cmd)) return stub;
      } else if (stub.match.test(joined)) {
        return stub;
      }
    }
    return undefined;
  }

  const exec: Deps["exec"] = {
    run: (cmd, opts) => {
      recorder.execCalls.push({ cmd, opts, mode: "run" });
      const stub = findStub(cmd);
      stub?.sideEffect?.(cmd, opts);
      const status = stub?.result?.status ?? 0;
      if (status !== 0 && stub?.throwFromRun !== false) {
        throw new Error(`fake exec: status ${status}: ${cmd.join(" ")}`);
      }
    },
    runSafe: (cmd, opts) => {
      recorder.execCalls.push({ cmd, opts, mode: "runSafe" });
      const stub = findStub(cmd);
      stub?.sideEffect?.(cmd, opts);
      const status = stub?.result?.status ?? 0;
      return status === 0;
    },
    capture: (cmd, opts) => {
      recorder.execCalls.push({ cmd, opts, mode: "capture" });
      const stub = findStub(cmd);
      stub?.sideEffect?.(cmd, opts);
      return stub?.result ?? { status: 0, stdout: "", stderr: "" };
    },
    which: (bin) => {
      if (bin in whichStubs) return whichStubs[bin];
      return null;
    },
  };

  const io: IoDeps = {
    banner: (m) => recorder.io.push({ level: "banner", message: m }),
    ok: (m) => recorder.io.push({ level: "ok", message: m }),
    skip: (m) => recorder.io.push({ level: "skip", message: m }),
    warn: (m) => recorder.io.push({ level: "warn", message: m }),
    fail: (m) => recorder.io.push({ level: "fail", message: m }),
    info: (m) => recorder.io.push({ level: "info", message: m }),
    raw: (m) => recorder.io.push({ level: "raw", message: m }),
    ask: async (q) => {
      recorder.askQuestions.push(q);
      if (askAnswers.length === 0) {
        throw new Error(`fake io: no scripted answer for ask(${JSON.stringify(q)})`);
      }
      return askAnswers.shift()!;
    },
    waitForEnter: async () => {
      recorder.waitForEnterCount += 1;
    },
  };

  const deps: FakeDeps = {
    env,
    home: opts.home ?? ORCHESTRATOR_HOME,
    fs,
    exec,
    io,
    clock: {
      nowUtcIso: () => opts.now ?? "2026-04-21T00:00:00Z",
      sleep: async (ms) => {
        recorder.sleeps.push(ms);
      },
    },
    recorder,
    files,
    queueAnswer: (answer) => askAnswers.push(answer),
  };

  return deps;
}

export function ioMessages(deps: FakeDeps, level: keyof IoDeps): string[] {
  return deps.recorder.io.filter((r) => r.level === level).map((r) => r.message);
}

export function execWasCalled(
  deps: FakeDeps,
  matcher: RegExp | ((cmd: string[]) => boolean),
): boolean {
  for (const call of deps.recorder.execCalls) {
    const cmd = call.cmd.join(" ");
    if (typeof matcher === "function") {
      if (matcher(call.cmd)) return true;
    } else if (matcher.test(cmd)) {
      return true;
    }
  }
  return false;
}

export function resultFor(id: StepId, results: Record<string, string>): string {
  return results[id];
}
