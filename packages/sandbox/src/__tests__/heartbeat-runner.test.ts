import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, basename } from "node:path";
import type { ChildProcess } from "node:child_process";
import type { HeartbeatEntry } from "../lib/heartbeat/config.js";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any dynamic imports
// ---------------------------------------------------------------------------

vi.mock("node:child_process", () => ({
  spawn: vi.fn(),
}));

vi.mock("../lib/heartbeat/gates.js", () => ({
  isActiveHours: vi.fn().mockReturnValue(true),
  isHeartbeatEmpty: vi.fn().mockReturnValue(false),
  isHeartbeatOk: vi.fn().mockReturnValue(false),
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import { spawn } from "node:child_process";
import { isActiveHours, isHeartbeatEmpty, isHeartbeatOk } from "../lib/heartbeat/gates.js";

const mockSpawn = vi.mocked(spawn);
const mockIsActiveHours = vi.mocked(isActiveHours);
const mockIsHeartbeatEmpty = vi.mocked(isHeartbeatEmpty);
const mockIsHeartbeatOk = vi.mocked(isHeartbeatOk);

// ---------------------------------------------------------------------------
// Dynamic import of the module under test (after mocks)
// ---------------------------------------------------------------------------

const { HeartbeatRunner } = await import("../lib/heartbeat/runner.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fake ChildProcess-like EventEmitter that resolves with given stdout/exitCode */
function makeChildProcess(stdout: string, exitCode: number): ChildProcess {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  const proc = {
    stdout: {
      on(event: string, cb: (...args: unknown[]) => void) {
        if (!listeners[`stdout:${event}`]) listeners[`stdout:${event}`] = [];
        listeners[`stdout:${event}`].push(cb);
        return this;
      },
    },
    stderr: {
      on(_event: string, _cb: (...args: unknown[]) => void) {
        return this;
      },
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      (listeners[event] ?? []).forEach((cb) => cb(...args));
    },
    _trigger(data: string, code: number) {
      // Emit stdout data then close
      (listeners["stdout:data"] ?? []).forEach((cb) => cb(Buffer.from(data)));
      (listeners["close"] ?? []).forEach((cb) => cb(code));
    },
  } as unknown as ChildProcess & { _trigger(data: string, code: number): void };

  // Trigger asynchronously so run() can set up listeners first
  Promise.resolve().then(() => {
    (proc as unknown as { _trigger(d: string, c: number): void })._trigger(stdout, exitCode);
  });

  return proc;
}

/** Build a fake ChildProcess that never emits close (simulates running forever until abort) */
function makeHangingChildProcess(): ChildProcess & {
  _emitError(err: Error): void;
} {
  const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};

  const proc = {
    stdout: {
      on(event: string, cb: (...args: unknown[]) => void) {
        if (!listeners[`stdout:${event}`]) listeners[`stdout:${event}`] = [];
        listeners[`stdout:${event}`].push(cb);
        return this;
      },
    },
    stderr: {
      on(_event: string, _cb: (...args: unknown[]) => void) {
        return this;
      },
    },
    on(event: string, cb: (...args: unknown[]) => void) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(cb);
      return this;
    },
    _emitError(err: Error) {
      (listeners["error"] ?? []).forEach((cb) => cb(err));
    },
  } as unknown as ChildProcess & { _emitError(err: Error): void };

  return proc;
}

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

let tmpDir: string;
let workspacePath: string;
let heartbeatDir: string;
let soulFile: string;
let heartbeatFile: string;

const ENTRY_BASENAME = "HEARTBEAT";

function makeEntry(overrides: Partial<HeartbeatEntry> = {}): HeartbeatEntry {
  return {
    cronExpr: "* * * * *",
    filePath: `${ENTRY_BASENAME}.md`,
    agent: "claude",
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), "heartbeat-runner-test-"));
  workspacePath = join(tmpDir, "workspace");
  heartbeatDir = join(tmpDir, "heartbeat");
  soulFile = join(workspacePath, "SOUL.md");
  heartbeatFile = join(workspacePath, `${ENTRY_BASENAME}.md`);

  mkdirSync(workspacePath, { recursive: true });
  mkdirSync(heartbeatDir, { recursive: true });

  // Default heartbeat file with real content
  writeFileSync(heartbeatFile, "Check system status and report.\n");

  vi.clearAllMocks();

  // Default gate mocks: everything passes
  mockIsActiveHours.mockReturnValue(true);
  mockIsHeartbeatEmpty.mockReturnValue(false);
  mockIsHeartbeatOk.mockReturnValue(false);
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeartbeatRunner", () => {
  describe("concurrency guard", () => {
    it("skips execution when entry is already running and logs message", async () => {
      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });

      // Simulate an in-flight run by adding the entry name to the internal Set
      // (accessed via the run() guard path)
      const runningSet = (runner as unknown as { running: Set<string> }).running;
      runningSet.add(ENTRY_BASENAME);

      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("previous execution still running"),
      );

      runningSet.delete(ENTRY_BASENAME);
    });
  });

  describe("active hours gating", () => {
    it("skips execution when outside active hours and logs message", async () => {
      mockIsActiveHours.mockReturnValue(false);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});

      await runner.run(makeEntry({ activeStart: 9, activeEnd: 17 }));

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/outside active hours/i));
    });
  });

  describe("empty file gating", () => {
    it("skips execution when heartbeat file is effectively empty and logs message", async () => {
      mockIsHeartbeatEmpty.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(mockSpawn).not.toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("effectively empty"));
    });
  });

  describe("prompt building", () => {
    it("builds prompt WITH SOUL.md content when SOUL.md exists and is non-empty", async () => {
      const soulContent = "You are a helpful assistant.";
      writeFileSync(soulFile, soulContent);

      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(mockSpawn).toHaveBeenCalledOnce();
      const spawnArgs = mockSpawn.mock.calls[0] as [string, string[], object];
      const promptArg = spawnArgs[1].join(" ");
      expect(promptArg).toContain(soulContent);
    });

    it("builds prompt WITHOUT SOUL.md content when SOUL.md does not exist", async () => {
      // soulFile does not exist (not written)
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(mockSpawn).toHaveBeenCalledOnce();
      const spawnArgs = mockSpawn.mock.calls[0] as [string, string[], object];
      const promptArg = spawnArgs[1].join(" ");
      // Should not contain soul content (file doesn't exist)
      expect(promptArg).not.toContain("You are a helpful assistant.");
      // Should still contain heartbeat instructions
      expect(promptArg).toContain("HEARTBEAT_OK");
    });

    it("includes today's date in the memory path within the prompt", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-04-16T12:00:00Z"));

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      vi.useRealTimers();

      const spawnArgs = mockSpawn.mock.calls[0] as [string, string[], object];
      const promptArg = spawnArgs[1].join(" ");
      expect(promptArg).toContain("2026-04-16");
    });

    it("includes the heartbeat filename (without .md) in the prompt", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      const spawnArgs = mockSpawn.mock.calls[0] as [string, string[], object];
      const promptArg = spawnArgs[1].join(" ");
      expect(promptArg).toContain(ENTRY_BASENAME);
    });

    it("includes the file content in the prompt", async () => {
      const fileContent = "Check all services are running.\n";
      writeFileSync(heartbeatFile, fileContent);

      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      const spawnArgs = mockSpawn.mock.calls[0] as [string, string[], object];
      const promptArg = spawnArgs[1].join(" ");
      expect(promptArg).toContain("Check all services are running.");
    });
  });

  describe("agent command spawning", () => {
    it("spawns claude with -p flag and --dangerously-skip-permissions", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry({ agent: "claude" }));

      expect(mockSpawn).toHaveBeenCalledOnce();
      const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
      expect(cmd).toBe("claude");
      expect(args).toContain("-p");
      expect(args).toContain("--dangerously-skip-permissions");
    });

    it("spawns codex with prompt as first argument (no -p flag)", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry({ agent: "codex" }));

      expect(mockSpawn).toHaveBeenCalledOnce();
      const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
      expect(cmd).toBe("codex");
      expect(args).not.toContain("-p");
      expect(args[0]).toContain("HEARTBEAT_OK"); // prompt is first arg
    });

    it("spawns other agents with -p flag (no --dangerously-skip-permissions)", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry({ agent: "myagent" }));

      expect(mockSpawn).toHaveBeenCalledOnce();
      const [cmd, args] = mockSpawn.mock.calls[0] as [string, string[]];
      expect(cmd).toBe("myagent");
      expect(args).toContain("-p");
      expect(args).not.toContain("--dangerously-skip-permissions");
    });
  });

  describe("response handling", () => {
    it("logs HEARTBEAT_OK when response matches", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("HEARTBEAT_OK"));
    });

    it("logs full response when not HEARTBEAT_OK", async () => {
      const response = "I performed some tasks and updated things.";
      const proc = makeChildProcess(response, 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(false);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining(response));
    });
  });

  describe("timeout handling", () => {
    it("logs timeout message when exit code is 124", async () => {
      const proc = makeChildProcess("", 124);
      mockSpawn.mockReturnValue(proc);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Timed out"));
    });

    it("logs timeout message when AbortError is thrown", async () => {
      const proc = makeHangingChildProcess();
      mockSpawn.mockReturnValue(proc as unknown as ChildProcess);

      // Emit an AbortError from the process error handler
      Promise.resolve().then(() => {
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        (proc as { _emitError(e: Error): void })._emitError(abortErr);
      });

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining("Timed out"));
    });
  });

  describe("failure handling", () => {
    it("logs failure message when agent exits with non-zero code", async () => {
      const proc = makeChildProcess("error output here", 1);
      mockSpawn.mockReturnValue(proc);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      const logSpy = vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed.*exit code 1/));
    });
  });

  describe("lifecycle", () => {
    it("clears running guard in finally block even when an error occurs", async () => {
      // Make spawn throw an error
      mockSpawn.mockImplementation(() => {
        throw new Error("spawn failed");
      });

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      // Should not throw
      await expect(runner.run(makeEntry())).resolves.not.toThrow();

      // After run completes, the entry should no longer be in the running set
      const runningSet = (runner as unknown as { running: Set<string> }).running;
      expect(runningSet.has(ENTRY_BASENAME)).toBe(false);
    });

    it("calls rotate() after execution", async () => {
      const proc = makeChildProcess("HEARTBEAT_OK", 0);
      mockSpawn.mockReturnValue(proc);
      mockIsHeartbeatOk.mockReturnValue(true);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      const rotateSpy = vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry());

      expect(rotateSpy).toHaveBeenCalledOnce();
    });

    it("calls rotate() even when gates short-circuit", async () => {
      mockIsActiveHours.mockReturnValue(false);

      const runner = new HeartbeatRunner({
        workspacePath,
        heartbeatDir,
        soulFile,
      });
      vi.spyOn(runner.getLogger(), "log").mockImplementation(() => {});
      const rotateSpy = vi.spyOn(runner.getLogger(), "rotate").mockImplementation(() => {});

      await runner.run(makeEntry({ activeStart: 9, activeEnd: 17 }));

      expect(rotateSpy).toHaveBeenCalledOnce();
    });
  });
});
