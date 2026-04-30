import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "node:events";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any dynamic imports
// ---------------------------------------------------------------------------

// Mock node:fs — watch returns a controllable EventEmitter
const mockWatch = vi.fn();
const mockExistsSync = vi.fn();
const mockReadFileSync = vi.fn().mockReturnValue("");

vi.mock("node:fs", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
    watch: (...args: unknown[]) => mockWatch(...args),
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  };
});

// Mock node:fs/promises for async config parsing
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

vi.mock("node:fs/promises", () => ({
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// Mock the scheduler so the daemon test doesn't need runner/croner internals
const mockSchedulerStart = vi.fn();
const mockSchedulerStop = vi.fn();
const mockSchedulerSync = vi.fn();
const mockSchedulerStatus = vi.fn().mockReturnValue([]);

vi.mock("../lib/heartbeat/scheduler.js", () => ({
  HeartbeatScheduler: vi.fn().mockImplementation(() => ({
    start: mockSchedulerStart,
    stop: mockSchedulerStop,
    sync: mockSchedulerSync,
    status: mockSchedulerStatus,
  })),
}));

// Mock discovery so PR-4 tests can script what `rediscoverRoots()` sees on
// each call without standing up a real git repo.
const mockDiscoverWorkspaceRoots = vi.fn();
vi.mock("../lib/heartbeat/discovery.js", () => ({
  discoverWorkspaceRoots: (...args: unknown[]) => mockDiscoverWorkspaceRoots(...args),
}));

// ---------------------------------------------------------------------------
// Dynamic import of the module under test
// ---------------------------------------------------------------------------

const { HeartbeatDaemon } = await import("../lib/heartbeat/daemon.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createFakeWatcher(): EventEmitter & { close: ReturnType<typeof vi.fn> } {
  const emitter = new EventEmitter() as EventEmitter & { close: ReturnType<typeof vi.fn> };
  emitter.close = vi.fn();
  return emitter;
}

const DAEMON_OPTIONS = {
  workspacePath: "/tmp/workspace",
  heartbeatDir: "/tmp/workspace/heartbeats",
  defaultAgent: "claude",
  defaultInterval: 1800,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockExistsSync.mockReturnValue(true);
  mockReaddir.mockResolvedValue([]);
  mockReadFile.mockResolvedValue("");
  mockReadFileSync.mockReturnValue("");
  mockDiscoverWorkspaceRoots.mockReturnValue([]);

  // Re-establish scheduler mock after clearAllMocks
  const { HeartbeatScheduler } = await import("../lib/heartbeat/scheduler.js");
  vi.mocked(HeartbeatScheduler).mockImplementation(
    () =>
      ({
        start: mockSchedulerStart,
        stop: mockSchedulerStop,
        sync: mockSchedulerSync,
        status: mockSchedulerStatus,
      }) as unknown as InstanceType<typeof HeartbeatScheduler>,
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HeartbeatDaemon", () => {
  describe("start()", () => {
    it("calls fs.watch on the heartbeats directory", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      expect(mockWatch).toHaveBeenCalledWith(
        DAEMON_OPTIONS.heartbeatDir,
        { persistent: false },
        expect.any(Function),
      );
    });

    it("does not call fs.watch when heartbeatDir does not exist", async () => {
      mockExistsSync.mockImplementation((p) => {
        // heartbeatsDir doesn't exist for the watch check
        if (String(p) === DAEMON_OPTIONS.heartbeatDir) return false;
        return true;
      });

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      expect(mockWatch).not.toHaveBeenCalled();
    });
  });

  describe("file watcher auto-sync", () => {
    it("debounces multiple events into a single sync", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      // Setup: provide a heartbeat file for sync to find
      mockReaddir.mockResolvedValue(["test.md"]);
      mockReadFile.mockResolvedValue(`---\nschedule: "*/5 * * * *"\n---\n`);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      // Capture the watch callback
      const watchCallback = mockWatch.mock.calls[0][2] as (event: string, filename: string) => void;

      // Fire multiple events rapidly
      watchCallback("change", "a.md");
      watchCallback("change", "b.md");
      watchCallback("rename", "c.md");

      // readdir has been called once during start()
      const callCountAfterStart = mockReaddir.mock.calls.length;

      // Advance past debounce (500ms)
      await vi.advanceTimersByTimeAsync(600);

      // Should have triggered exactly one additional sync
      expect(mockReaddir.mock.calls.length).toBe(callCountAfterStart + 1);
    });

    it("ignores non-.md file events", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      const watchCallback = mockWatch.mock.calls[0][2] as (event: string, filename: string) => void;
      const callCountAfterStart = mockReaddir.mock.calls.length;

      // Fire event for a non-.md file
      watchCallback("change", "heartbeat.log");
      await vi.advanceTimersByTimeAsync(600);

      // No additional sync should have occurred
      expect(mockReaddir.mock.calls.length).toBe(callCountAfterStart);
    });

    it("ignores events with null filename", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      const watchCallback = mockWatch.mock.calls[0][2] as (
        event: string,
        filename: string | null,
      ) => void;
      const callCountAfterStart = mockReaddir.mock.calls.length;

      watchCallback("change", null as unknown as string);
      await vi.advanceTimersByTimeAsync(600);

      expect(mockReaddir.mock.calls.length).toBe(callCountAfterStart);
    });
  });

  describe("stop()", () => {
    it("closes the file watcher", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      daemon.stop();

      expect(fakeWatcher.close).toHaveBeenCalledOnce();
    });

    it("clears pending debounce timer on stop", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      const watchCallback = mockWatch.mock.calls[0][2] as (event: string, filename: string) => void;

      // Fire event to start debounce timer
      watchCallback("change", "test.md");

      const callCountBeforeStop = mockReaddir.mock.calls.length;

      // Stop before debounce fires
      daemon.stop();

      // Advance past debounce — sync should NOT fire
      await vi.advanceTimersByTimeAsync(600);
      expect(mockReaddir.mock.calls.length).toBe(callCountBeforeStop);
    });

    it("is safe to call when no watcher was started", () => {
      mockExistsSync.mockReturnValue(false);
      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      expect(() => daemon.stop()).not.toThrow();
    });
  });

  describe("syncOnce()", () => {
    it("performs a one-shot sync without starting a watcher", () => {
      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      daemon.syncOnce();

      // syncOnce uses sync I/O (readdirSync), not watch
      expect(mockWatch).not.toHaveBeenCalled();
    });
  });

  describe("multi-root watcher", () => {
    it("starts one fs.watch per workspace root", async () => {
      const watcherA = createFakeWatcher();
      const watcherB = createFakeWatcher();
      mockWatch.mockReturnValueOnce(watcherA).mockReturnValueOnce(watcherB);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/tmp/a/workspace",
            heartbeatDir: "/tmp/a/workspace/heartbeats",
            label: "agent-foo",
          },
          {
            workspacePath: "/tmp/b/workspace",
            heartbeatDir: "/tmp/b/workspace/heartbeats",
            label: "feat-bar",
          },
        ],
        defaultAgent: "claude",
        defaultInterval: 1800,
      });
      await daemon.start();

      expect(mockWatch).toHaveBeenCalledTimes(2);
      expect(mockWatch).toHaveBeenCalledWith(
        "/tmp/a/workspace/heartbeats",
        { persistent: false },
        expect.any(Function),
      );
      expect(mockWatch).toHaveBeenCalledWith(
        "/tmp/b/workspace/heartbeats",
        { persistent: false },
        expect.any(Function),
      );
    });

    it("closes every watcher on stop()", async () => {
      const watcherA = createFakeWatcher();
      const watcherB = createFakeWatcher();
      mockWatch.mockReturnValueOnce(watcherA).mockReturnValueOnce(watcherB);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/tmp/a/workspace",
            heartbeatDir: "/tmp/a/workspace/heartbeats",
            label: "agent-foo",
          },
          {
            workspacePath: "/tmp/b/workspace",
            heartbeatDir: "/tmp/b/workspace/heartbeats",
            label: "feat-bar",
          },
        ],
      });
      await daemon.start();
      daemon.stop();

      expect(watcherA.close).toHaveBeenCalledOnce();
      expect(watcherB.close).toHaveBeenCalledOnce();
    });

    it("debounces events across roots into a single sync", async () => {
      const watcherA = createFakeWatcher();
      const watcherB = createFakeWatcher();
      mockWatch.mockReturnValueOnce(watcherA).mockReturnValueOnce(watcherB);

      mockReaddir.mockResolvedValue(["test.md"]);
      mockReadFile.mockResolvedValue(`---\nschedule: "*/5 * * * *"\n---\n`);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/tmp/a/workspace",
            heartbeatDir: "/tmp/a/workspace/heartbeats",
            label: "agent-foo",
          },
          {
            workspacePath: "/tmp/b/workspace",
            heartbeatDir: "/tmp/b/workspace/heartbeats",
            label: "feat-bar",
          },
        ],
      });
      await daemon.start();

      const callbackA = mockWatch.mock.calls[0][2] as (event: string, filename: string) => void;
      const callbackB = mockWatch.mock.calls[1][2] as (event: string, filename: string) => void;

      // Each root parses once during start() — record baseline.
      const callCountAfterStart = mockReaddir.mock.calls.length;

      // Fire events from both roots rapidly — a single debounced sync must result.
      callbackA("change", "a.md");
      callbackB("change", "b.md");
      callbackA("rename", "c.md");

      await vi.advanceTimersByTimeAsync(600);

      // A single sync() ran — re-parsing both roots once (2 readdir calls, one per root).
      expect(mockReaddir.mock.calls.length).toBe(callCountAfterStart + 2);
    });

    it("skips roots whose heartbeatDir does not exist without aborting other roots", async () => {
      const watcherA = createFakeWatcher();
      mockWatch.mockReturnValue(watcherA);

      // Only root A's dir exists.
      mockExistsSync.mockImplementation((p) => String(p) === "/tmp/a/workspace/heartbeats");

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/tmp/a/workspace",
            heartbeatDir: "/tmp/a/workspace/heartbeats",
            label: "agent-foo",
          },
          {
            workspacePath: "/tmp/missing/workspace",
            heartbeatDir: "/tmp/missing/workspace/heartbeats",
            label: "missing",
          },
        ],
      });
      await daemon.start();

      // Exactly one watcher started — the one whose dir exists.
      expect(mockWatch).toHaveBeenCalledTimes(1);
    });
  });

  describe("watcher error handling", () => {
    it("handles fs.watch errors gracefully", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      // Emit an error on the watcher — should not throw
      expect(() => fakeWatcher.emit("error", new Error("ENOSPC"))).not.toThrow();
    });

    it("handles fs.watch setup failure gracefully", async () => {
      mockWatch.mockImplementation(() => {
        throw new Error("ENOENT");
      });

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      // Should not throw
      await expect(daemon.start()).resolves.not.toThrow();
    });
  });

  describe("status()", () => {
    /**
     * Capture console.log output for one invocation so we can assert on
     * the literal shape of the status report. The daemon emits everything
     * via console.log (operators run this interactively), so stdout is
     * the user contract we're protecting.
     */
    function captureStatus(fn: () => void): string {
      const lines: string[] = [];
      const spy = vi.spyOn(console, "log").mockImplementation((msg?: unknown) => {
        lines.push(String(msg ?? ""));
      });
      try {
        fn();
      } finally {
        spy.mockRestore();
      }
      return lines.join("\n");
    }

    it("renders legacy single-root format unchanged (no Roots: header, no label prefix, one log tail)", () => {
      // Single-root (legacy) input — label implicitly "" via normalize().
      mockSchedulerStatus.mockReturnValueOnce([
        { name: "nightly-release", cronExpr: "50 23 * * *", nextRun: null, isRunning: true },
        { name: "test-sys-metrics", cronExpr: "*/2 * * * *", nextRun: null, isRunning: true },
      ]);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      const out = captureStatus(() => daemon.status());

      // Must retain the exact pre-PR-3 contract: bare slug after `→`,
      // existing scripts grep this format.
      expect(out).toContain("Heartbeat daemon: running (pid");
      expect(out).toContain("Heartbeat schedules: 2");
      expect(out).toContain("50 23 * * *  →  nightly-release");
      expect(out).toContain("*/2 * * * *  →  test-sys-metrics");

      // No multi-root scaffolding leaks into single-root output.
      expect(out).not.toContain("Roots:");
      expect(out).not.toContain("Recent log (parent):");
      expect(out).not.toMatch(/::/); // no label::slug names
    });

    it("renders multi-root status with Roots: section, namespaced schedules, and per-root log tails", () => {
      mockSchedulerStatus.mockReturnValueOnce([
        {
          name: "parent::nightly-release",
          cronExpr: "50 23 * * *",
          nextRun: null,
          isRunning: true,
        },
        {
          name: "sdr-pallet::morning-pipeline",
          cronExpr: "0 13 * * 1-5",
          nextRun: null,
          isRunning: true,
        },
        {
          name: "sdr-pallet::stuck-lead-sweep",
          cronExpr: "0 15 * * 1-5",
          nextRun: null,
          isRunning: true,
        },
      ]);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/home/sandbox/harness/workspace",
            heartbeatDir: "/home/sandbox/harness/workspace/heartbeats",
            label: "parent",
          },
          {
            workspacePath: "/home/sandbox/harness/.worktrees/agent/sdr-pallet/workspace",
            heartbeatDir: "/home/sandbox/harness/.worktrees/agent/sdr-pallet/workspace/heartbeats",
            label: "sdr-pallet",
          },
        ],
        defaultAgent: "claude",
        defaultInterval: 1800,
      });

      const out = captureStatus(() => daemon.status());

      expect(out).toContain("Heartbeat daemon: running (pid");
      expect(out).toContain("Roots:");
      // Each root is announced with its workspace path and schedule count.
      expect(out).toMatch(/parent\s+→\s+\/home\/sandbox\/harness\/workspace \(1 schedule\)/);
      expect(out).toMatch(/sdr-pallet\s+→\s+.*sdr-pallet\/workspace \(2 schedules\)/);
      // Composite names preserved in the Schedules: section.
      expect(out).toContain("parent::nightly-release");
      expect(out).toContain("sdr-pallet::morning-pipeline");
      // Per-root log tails, one heading per root — mocked fs returns "" so
      // no log body lines appear, but absence of `Recent log (...)` would
      // prove we regressed to single-tail output. We assert at least that
      // the single-tail heading is NOT present in multi-root.
      expect(out).not.toContain("\nRecent log:\n");
    });

    it("single-root with empty label stays in legacy format even when constructed via workspaceRoots", () => {
      // Operators (or future code) could plausibly pass a one-element
      // `workspaceRoots` with label "" — should still render the legacy
      // layout because the multi-root flag is label-driven, not
      // array-length driven.
      mockSchedulerStatus.mockReturnValueOnce([
        { name: "nightly", cronExpr: "0 0 * * *", nextRun: null, isRunning: true },
      ]);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [
          {
            workspacePath: "/tmp/workspace",
            heartbeatDir: "/tmp/workspace/heartbeats",
            label: "",
          },
        ],
      });
      const out = captureStatus(() => daemon.status());

      expect(out).not.toContain("Roots:");
      expect(out).toContain("0 0 * * *  →  nightly");
    });
  });

  // ---------------------------------------------------------------------------
  // PR-4 — top-level `.git/worktrees/` watcher + rediscoverRoots()
  // ---------------------------------------------------------------------------
  describe("top-level worktrees watcher (PR-4)", () => {
    const ROOT_A = {
      workspacePath: "/tmp/a/workspace",
      heartbeatDir: "/tmp/a/workspace/heartbeats",
      label: "agent-foo",
    };
    const ROOT_B = {
      workspacePath: "/tmp/b/workspace",
      heartbeatDir: "/tmp/b/workspace/heartbeats",
      label: "feat-bar",
    };
    const ROOT_C = {
      workspacePath: "/tmp/c/workspace",
      heartbeatDir: "/tmp/c/workspace/heartbeats",
      label: "agent-baz",
    };

    it("does NOT install the top-level watcher for legacy single-root construction", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      // Only the heartbeat-dir watcher was created — no second `fs.watch`
      // call for `.git/worktrees/`.
      expect(mockWatch).toHaveBeenCalledTimes(1);
      expect(mockWatch.mock.calls[0][0]).toBe(DAEMON_OPTIONS.heartbeatDir);

      // Discovery must not have been consulted at all for a legacy daemon.
      expect(mockDiscoverWorkspaceRoots).not.toHaveBeenCalled();

      daemon.stop();
    });

    it("does NOT install the top-level watcher when multi-root opts omit `rediscover`", async () => {
      const fakeWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(fakeWatcher);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
      });
      await daemon.start();

      expect(mockWatch).toHaveBeenCalledTimes(1);
      expect(mockWatch).toHaveBeenCalledWith(
        ROOT_A.heartbeatDir,
        { persistent: false },
        expect.any(Function),
      );

      daemon.stop();
    });

    it("installs a watcher on <home>/harness/.git/worktrees/ when `rediscover` is set", async () => {
      // Return a distinct fake watcher per call so we can tell which is which.
      const heartbeatWatcher = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      mockWatch.mockReturnValueOnce(heartbeatWatcher).mockReturnValueOnce(worktreesWatcher);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();

      expect(mockWatch).toHaveBeenCalledTimes(2);
      expect(mockWatch).toHaveBeenCalledWith(
        "/fake/home/harness/.git/worktrees",
        { persistent: false },
        expect.any(Function),
      );

      daemon.stop();
    });

    it("skips the top-level watcher silently when `.git/worktrees/` does not exist", async () => {
      // Heartbeat dir exists; worktrees dir does not.
      mockExistsSync.mockImplementation((p) => {
        if (String(p) === "/fake/home/harness/.git/worktrees") return false;
        return true;
      });

      const heartbeatWatcher = createFakeWatcher();
      mockWatch.mockReturnValue(heartbeatWatcher);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();

      // Only heartbeat-dir watcher — worktrees dir was missing so no watch.
      expect(mockWatch).toHaveBeenCalledTimes(1);
      expect(mockWatch.mock.calls[0][0]).toBe(ROOT_A.heartbeatDir);

      daemon.stop();
    });

    it("rediscoverRoots() adds a new root: installs its watcher + picks up its entries", async () => {
      const heartbeatWatcherA = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      const heartbeatWatcherC = createFakeWatcher();
      mockWatch
        .mockReturnValueOnce(heartbeatWatcherA) // root A heartbeat dir
        .mockReturnValueOnce(worktreesWatcher) // .git/worktrees dir
        .mockReturnValueOnce(heartbeatWatcherC); // root C heartbeat dir (post-rediscovery)

      // Startup discovery would have returned [A]; the constructor accepts
      // that via `workspaceRoots`. Prime the mock so the next `rediscover`
      // call returns [A, C] — simulating `git worktree add` for C.
      mockDiscoverWorkspaceRoots.mockReturnValue([ROOT_A, ROOT_C]);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home", rootsEnv: "OVERRIDE=x" },
      });
      await daemon.start();

      // Fire the top-level watcher — capture the callback registered by
      // the second `fs.watch` call (the worktrees one).
      const worktreesCallback = mockWatch.mock.calls[1][2] as (
        event: string,
        filename: string,
      ) => void;
      worktreesCallback("rename", "new-worktree-dir");

      // Advance past the 500ms debounce; rediscovery kicks off.
      await vi.advanceTimersByTimeAsync(600);
      // Flush pending microtasks from the async rediscoverRoots call chain.
      await vi.runAllTimersAsync();

      // Discovery was consulted with the same (home, rootsEnv) the CLI used.
      expect(mockDiscoverWorkspaceRoots).toHaveBeenCalledWith("/fake/home", "OVERRIDE=x");

      // A heartbeat-dir watcher was installed for the newly-added root C.
      const watchCalls = mockWatch.mock.calls.map((c) => c[0]);
      expect(watchCalls).toContain(ROOT_C.heartbeatDir);

      // Scheduler.sync was called (differential re-sync after root changes).
      expect(mockSchedulerSync).toHaveBeenCalled();

      daemon.stop();
    });

    it("rediscoverRoots() removes a vanished root: closes its watcher + drops its logger entry", async () => {
      const heartbeatWatcherA = createFakeWatcher();
      const heartbeatWatcherB = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      mockWatch
        .mockReturnValueOnce(heartbeatWatcherA)
        .mockReturnValueOnce(heartbeatWatcherB)
        .mockReturnValueOnce(worktreesWatcher);

      // Fresh discovery now returns only [A] — B vanished (e.g., `git worktree remove`).
      mockDiscoverWorkspaceRoots.mockReturnValue([ROOT_A]);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A, ROOT_B],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();

      const worktreesCallback = mockWatch.mock.calls[2][2] as (
        event: string,
        filename: string,
      ) => void;
      worktreesCallback("rename", "removed-dir");

      await vi.advanceTimersByTimeAsync(600);
      await vi.runAllTimersAsync();

      // Root B's heartbeat-dir watcher must have been closed.
      expect(heartbeatWatcherB.close).toHaveBeenCalled();
      // Root A's heartbeat-dir watcher must still be open.
      expect(heartbeatWatcherA.close).not.toHaveBeenCalled();
      // Scheduler was re-synced so it drops B's entries on next pass.
      expect(mockSchedulerSync).toHaveBeenCalled();

      daemon.stop();
    });

    it("rediscoverRoots() is a no-op when `rediscover` is unset", async () => {
      const daemon = new HeartbeatDaemon(DAEMON_OPTIONS);
      await daemon.start();

      // Direct call — should return immediately and never consult discovery.
      await daemon.rediscoverRoots();
      expect(mockDiscoverWorkspaceRoots).not.toHaveBeenCalled();

      daemon.stop();
    });

    it("stop() closes the top-level watcher too", async () => {
      const heartbeatWatcher = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      mockWatch.mockReturnValueOnce(heartbeatWatcher).mockReturnValueOnce(worktreesWatcher);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();
      daemon.stop();

      expect(heartbeatWatcher.close).toHaveBeenCalledOnce();
      expect(worktreesWatcher.close).toHaveBeenCalledOnce();
    });

    it("debounces rapid top-level events into a single rediscovery", async () => {
      const heartbeatWatcher = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      mockWatch.mockReturnValueOnce(heartbeatWatcher).mockReturnValueOnce(worktreesWatcher);

      mockDiscoverWorkspaceRoots.mockReturnValue([ROOT_A]);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();

      const worktreesCallback = mockWatch.mock.calls[1][2] as (
        event: string,
        filename: string,
      ) => void;

      // Burst — git emits multiple events during `worktree add`.
      worktreesCallback("rename", "a");
      worktreesCallback("rename", "b");
      worktreesCallback("rename", "c");

      await vi.advanceTimersByTimeAsync(600);
      await vi.runAllTimersAsync();

      // Discovery consulted exactly once despite three events.
      expect(mockDiscoverWorkspaceRoots).toHaveBeenCalledTimes(1);

      daemon.stop();
    });

    it("top-level watcher errors do not throw", async () => {
      const heartbeatWatcher = createFakeWatcher();
      const worktreesWatcher = createFakeWatcher();
      mockWatch.mockReturnValueOnce(heartbeatWatcher).mockReturnValueOnce(worktreesWatcher);

      const daemon = new HeartbeatDaemon({
        workspaceRoots: [ROOT_A],
        rediscover: { home: "/fake/home" },
      });
      await daemon.start();

      expect(() => worktreesWatcher.emit("error", new Error("ENOSPC"))).not.toThrow();

      daemon.stop();
    });
  });
});
