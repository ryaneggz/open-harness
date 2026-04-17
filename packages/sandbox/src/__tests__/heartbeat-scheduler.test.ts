import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { HeartbeatEntry } from "../lib/heartbeat/config.js";

// ---------------------------------------------------------------------------
// Mocks — must be declared before any dynamic imports
// ---------------------------------------------------------------------------

// Mock croner so no real timers are started
const mockCronStop = vi.fn();
const mockCronNextRun = vi.fn().mockReturnValue(new Date("2026-04-16T12:00:00Z"));
const mockCronIsRunning = vi.fn().mockReturnValue(true);
const mockCronGetPattern = vi.fn();

// Factory that creates a mock Cron instance, capturing the callback
let lastCronCallback: (() => Promise<void>) | null = null;

const MockCron = vi.fn();

vi.mock("croner", () => ({
  Cron: MockCron,
}));

// Mock the runner module
const mockRunnerRun = vi.fn().mockResolvedValue(undefined);
const mockLoggerLog = vi.fn();
const mockGetLogger = vi.fn();

vi.mock("../lib/heartbeat/runner.js", () => ({
  HeartbeatRunner: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Dynamic import of the module under test (after mocks)
// ---------------------------------------------------------------------------

const { HeartbeatScheduler } = await import("../lib/heartbeat/scheduler.js");
const { HeartbeatRunner } = await import("../lib/heartbeat/runner.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<HeartbeatEntry> = {}): HeartbeatEntry {
  return {
    cronExpr: "*/5 * * * *",
    filePath: "HEARTBEAT.md",
    agent: "claude",
    ...overrides,
  };
}

const RUNNER_OPTIONS = {
  workspacePath: "/tmp/workspace",
  heartbeatDir: "/tmp/heartbeat",
};

// ---------------------------------------------------------------------------
// Test setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  lastCronCallback = null;

  // Re-establish mock implementations cleared by clearAllMocks()
  mockCronNextRun.mockReturnValue(new Date("2026-04-16T12:00:00Z"));
  mockCronIsRunning.mockReturnValue(true);
  mockGetLogger.mockReturnValue({ log: mockLoggerLog });
  mockRunnerRun.mockResolvedValue(undefined);

  // Restore HeartbeatRunner constructor mock
  vi.mocked(HeartbeatRunner).mockImplementation(
    () =>
      ({
        run: mockRunnerRun,
        getLogger: mockGetLogger,
      }) as unknown as InstanceType<typeof HeartbeatRunner>,
  );

  // Restore MockCron constructor mock
  MockCron.mockImplementation((pattern: string, callback: () => Promise<void>) => {
    lastCronCallback = callback;
    mockCronGetPattern.mockReturnValue(pattern);
    return {
      stop: mockCronStop,
      nextRun: mockCronNextRun,
      isRunning: mockCronIsRunning,
      getPattern: mockCronGetPattern,
    };
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeartbeatScheduler", () => {
  describe("start(entries)", () => {
    it("creates a Cron instance for each HeartbeatEntry", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entries = [
        makeEntry({ filePath: "HEARTBEAT.md" }),
        makeEntry({ filePath: "tasks/daily.md", cronExpr: "0 9 * * *" }),
      ];

      scheduler.start(entries);

      expect(MockCron).toHaveBeenCalledTimes(2);
    });

    it("passes the cronExpr from the entry to the Cron constructor", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry({ cronExpr: "0 */2 * * *" });

      scheduler.start([entry]);

      expect(MockCron).toHaveBeenCalledWith("0 */2 * * *", expect.any(Function));
    });

    it("logs a scheduled message for each entry", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry({ filePath: "HEARTBEAT.md", cronExpr: "*/5 * * * *" });

      scheduler.start([entry]);

      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("Scheduled"));
    });

    it("creates no Cron instances when entries array is empty", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);

      scheduler.start([]);

      expect(MockCron).not.toHaveBeenCalled();
    });

    it("derives job name from filePath (strips .md, replaces / with -)", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry({ filePath: "tasks/daily.md" });

      scheduler.start([entry]);

      // The log message should contain the derived name (not the raw filePath)
      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("tasks-daily"));
    });
  });

  describe("Cron callback", () => {
    it("calls runner.run(entry) when the Cron callback fires", async () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry();

      scheduler.start([entry]);

      // Invoke the captured callback
      expect(lastCronCallback).not.toBeNull();
      await lastCronCallback!();

      expect(mockRunnerRun).toHaveBeenCalledWith(entry);
    });

    it("handles runner errors gracefully — logs error, does not rethrow", async () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry({ filePath: "HEARTBEAT.md" });

      mockRunnerRun.mockRejectedValueOnce(new Error("agent exploded"));

      scheduler.start([entry]);

      // Should not throw
      await expect(lastCronCallback!()).resolves.not.toThrow();

      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("agent exploded"));
    });

    it("handles non-Error runner rejections gracefully", async () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry();

      mockRunnerRun.mockRejectedValueOnce("string error");

      scheduler.start([entry]);

      await expect(lastCronCallback!()).resolves.not.toThrow();

      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("string error"));
    });
  });

  describe("stop()", () => {
    it("calls cron.stop() on all active jobs", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([
        makeEntry({ filePath: "HEARTBEAT.md" }),
        makeEntry({ filePath: "tasks/daily.md" }),
      ]);

      scheduler.stop();

      expect(mockCronStop).toHaveBeenCalledTimes(2);
    });

    it("clears the internal jobs list after stopping", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry()]);

      scheduler.stop();

      // After stop, status should return empty array (jobs cleared)
      expect(scheduler.status()).toEqual([]);
    });

    it("logs a stopped message for each stopped job", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry({ filePath: "HEARTBEAT.md" })]);

      vi.clearAllMocks();
      mockGetLogger.mockReturnValue({ log: mockLoggerLog });

      scheduler.stop();

      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("Stopped"));
    });

    it("is safe to call when no jobs are scheduled", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);

      expect(() => scheduler.stop()).not.toThrow();
      expect(mockCronStop).not.toHaveBeenCalled();
    });
  });

  describe("sync(entries)", () => {
    it("stops removed jobs and starts new ones", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry({ filePath: "old.md" })]);

      vi.clearAllMocks();
      mockGetLogger.mockReturnValue({ log: mockLoggerLog });

      // Restore MockCron constructor mock after clearAllMocks
      MockCron.mockImplementation((pattern: string, callback: () => Promise<void>) => {
        lastCronCallback = callback;
        mockCronGetPattern.mockReturnValue(pattern);
        return {
          stop: mockCronStop,
          nextRun: mockCronNextRun,
          isRunning: mockCronIsRunning,
          getPattern: mockCronGetPattern,
        };
      });

      const newEntries = [makeEntry({ filePath: "new.md" }), makeEntry({ filePath: "another.md" })];
      scheduler.sync(newEntries);

      // Old job should have been stopped (removed)
      expect(mockCronStop).toHaveBeenCalledTimes(1);
      // Two new Cron instances should have been created
      expect(MockCron).toHaveBeenCalledTimes(2);
    });

    it("results in exactly the new entries being active after sync", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry({ filePath: "old.md" })]);

      scheduler.sync([makeEntry({ filePath: "fresh.md" })]);

      // Only one job should remain (the new one)
      expect(scheduler.status()).toHaveLength(1);
    });

    it("does NOT recreate unchanged jobs (differential sync)", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      const entry = makeEntry({ filePath: "stable.md", cronExpr: "*/5 * * * *" });
      scheduler.start([entry]);

      vi.clearAllMocks();
      mockGetLogger.mockReturnValue({ log: mockLoggerLog });

      // Sync with identical entry — should be a no-op
      scheduler.sync([makeEntry({ filePath: "stable.md", cronExpr: "*/5 * * * *" })]);

      // No jobs stopped, no new jobs created
      expect(mockCronStop).not.toHaveBeenCalled();
      expect(MockCron).not.toHaveBeenCalled();
    });

    it("restarts only the changed job when one entry changes", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([
        makeEntry({ filePath: "stable.md", cronExpr: "*/5 * * * *" }),
        makeEntry({ filePath: "changing.md", cronExpr: "*/10 * * * *" }),
      ]);

      vi.clearAllMocks();
      mockGetLogger.mockReturnValue({ log: mockLoggerLog });
      MockCron.mockImplementation((pattern: string, callback: () => Promise<void>) => {
        lastCronCallback = callback;
        mockCronGetPattern.mockReturnValue(pattern);
        return {
          stop: mockCronStop,
          nextRun: mockCronNextRun,
          isRunning: mockCronIsRunning,
          getPattern: mockCronGetPattern,
        };
      });

      // Change only the second entry's schedule
      scheduler.sync([
        makeEntry({ filePath: "stable.md", cronExpr: "*/5 * * * *" }),
        makeEntry({ filePath: "changing.md", cronExpr: "*/15 * * * *" }),
      ]);

      // Only the changed job was stopped and recreated
      expect(mockCronStop).toHaveBeenCalledTimes(1);
      expect(MockCron).toHaveBeenCalledTimes(1);
      expect(MockCron).toHaveBeenCalledWith("*/15 * * * *", expect.any(Function));
    });

    it("logs 'removed' when a job is deleted and 'changed' when modified", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([
        makeEntry({ filePath: "keep.md", cronExpr: "*/5 * * * *" }),
        makeEntry({ filePath: "remove-me.md", cronExpr: "*/10 * * * *" }),
      ]);

      vi.clearAllMocks();
      mockGetLogger.mockReturnValue({ log: mockLoggerLog });
      MockCron.mockImplementation((pattern: string, callback: () => Promise<void>) => {
        lastCronCallback = callback;
        mockCronGetPattern.mockReturnValue(pattern);
        return {
          stop: mockCronStop,
          nextRun: mockCronNextRun,
          isRunning: mockCronIsRunning,
          getPattern: mockCronGetPattern,
        };
      });

      // Remove one entry entirely
      scheduler.sync([makeEntry({ filePath: "keep.md", cronExpr: "*/5 * * * *" })]);

      expect(mockLoggerLog).toHaveBeenCalledWith(expect.stringContaining("removed"));
    });
  });

  describe("status()", () => {
    it("returns an entry for each scheduled job", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([
        makeEntry({ filePath: "HEARTBEAT.md", cronExpr: "*/5 * * * *" }),
        makeEntry({ filePath: "tasks/daily.md", cronExpr: "0 9 * * *" }),
      ]);

      const statuses = scheduler.status();

      expect(statuses).toHaveLength(2);
    });

    it("each status entry has name, cronExpr, nextRun, and isRunning fields", () => {
      const nextRunDate = new Date("2026-04-16T12:00:00Z");
      mockCronNextRun.mockReturnValue(nextRunDate);
      mockCronIsRunning.mockReturnValue(true);

      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry({ filePath: "HEARTBEAT.md", cronExpr: "*/5 * * * *" })]);

      const [status] = scheduler.status();

      expect(status).toMatchObject({
        name: expect.any(String),
        cronExpr: expect.any(String),
        nextRun: nextRunDate,
        isRunning: true,
      });
    });

    it("returns empty array when no jobs are scheduled", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);

      expect(scheduler.status()).toEqual([]);
    });

    it("returns empty array after stop()", () => {
      const scheduler = new HeartbeatScheduler(RUNNER_OPTIONS);
      scheduler.start([makeEntry()]);
      scheduler.stop();

      expect(scheduler.status()).toEqual([]);
    });
  });
});
