import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock node:fs before importing the module under test
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  appendFileSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";

const mockExistsSync = vi.mocked(existsSync);
const mockMkdirSync = vi.mocked(mkdirSync);
const mockAppendFileSync = vi.mocked(appendFileSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockWriteFileSync = vi.mocked(writeFileSync);

// Import after mocks are set up
const { HeartbeatLogger } = await import("../lib/heartbeat/logger.js");

describe("HeartbeatLogger", () => {
  const LOG_PATH = "/home/sandbox/harness/workspace/heartbeats/heartbeat.log";

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: file/dir exists
    mockExistsSync.mockReturnValue(true);
  });

  describe("log()", () => {
    it("appends a timestamped line to the log file", () => {
      const logger = new HeartbeatLogger(LOG_PATH);
      const before = new Date();
      logger.log("hello world");
      const after = new Date();

      expect(mockAppendFileSync).toHaveBeenCalledOnce();
      const [filePath, content] = mockAppendFileSync.mock.calls[0] as [string, string];
      expect(filePath).toBe(LOG_PATH);

      // Verify format: [YYYY-MM-DDTHH:MM:SSZ] message\n
      const lineMatch = content.match(/^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\] hello world\n$/);
      expect(lineMatch).not.toBeNull();

      // Verify timestamp is within test execution window
      const ts = new Date(lineMatch![1]);
      expect(ts.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(ts.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });

    it("creates the log directory and file if they do not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.log("creating dir");

      expect(mockMkdirSync).toHaveBeenCalledWith("/home/sandbox/harness/workspace/heartbeats", {
        recursive: true,
      });
      expect(mockAppendFileSync).toHaveBeenCalledOnce();
    });

    it("does not call mkdirSync when directory already exists", () => {
      mockExistsSync.mockReturnValue(true);

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.log("dir exists");

      expect(mockMkdirSync).not.toHaveBeenCalled();
    });
  });

  describe("rotate()", () => {
    it("trims to 500 lines when file exceeds maxLines (default 1000)", () => {
      // Build a file with 1001 lines
      const lines = Array.from({ length: 1001 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.rotate();

      expect(mockReadFileSync).toHaveBeenCalledWith(LOG_PATH, "utf-8");
      expect(mockWriteFileSync).toHaveBeenCalledOnce();
      const [writePath, writeContent] = mockWriteFileSync.mock.calls[0] as [string, string];
      expect(writePath).toBe(LOG_PATH);

      // Should contain the last 500 lines
      const written = (writeContent as string).trim().split("\n");
      expect(written).toHaveLength(500);
      expect(written[0]).toBe("line 502");
      expect(written[499]).toBe("line 1001");
    });

    it("does nothing when file is under maxLines", () => {
      // Build a file with 999 lines
      const lines = Array.from({ length: 999 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.rotate();

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("does nothing when file is exactly at maxLines", () => {
      const lines = Array.from({ length: 1000 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.rotate();

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it("respects a custom maxLines setting", () => {
      // 201 lines with maxLines=200 triggers rotation; trim target is 500
      // but only 201 lines exist so all 201 are kept
      const lines = Array.from({ length: 201 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH, 200);
      logger.rotate();

      expect(mockWriteFileSync).toHaveBeenCalledOnce();
      const [, writeContent] = mockWriteFileSync.mock.calls[0] as [string, string];
      const written = (writeContent as string).trim().split("\n");
      // slice(-500) of 201-element array returns all 201
      expect(written).toHaveLength(201);
      expect(written[0]).toBe("line 1");
      expect(written[200]).toBe("line 201");
    });

    it("does nothing when log file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const logger = new HeartbeatLogger(LOG_PATH);
      logger.rotate();

      expect(mockReadFileSync).not.toHaveBeenCalled();
      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });
  });

  describe("tail()", () => {
    it("returns last n lines from log file (default 10)", () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      const result = logger.tail();

      const resultLines = result.split("\n");
      expect(resultLines).toHaveLength(10);
      expect(resultLines[0]).toBe("line 11");
      expect(resultLines[9]).toBe("line 20");
    });

    it("returns last n lines when n is specified", () => {
      const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      const result = logger.tail(5);

      const resultLines = result.split("\n");
      expect(resultLines).toHaveLength(5);
      expect(resultLines[0]).toBe("line 16");
      expect(resultLines[4]).toBe("line 20");
    });

    it("returns all lines when file has fewer than n lines", () => {
      const lines = Array.from({ length: 3 }, (_, i) => `line ${i + 1}`);
      mockReadFileSync.mockReturnValue(lines.join("\n") + "\n");

      const logger = new HeartbeatLogger(LOG_PATH);
      const result = logger.tail(10);

      const resultLines = result.split("\n");
      expect(resultLines).toHaveLength(3);
    });

    it("returns empty string when log file does not exist", () => {
      mockExistsSync.mockReturnValue(false);

      const logger = new HeartbeatLogger(LOG_PATH);
      const result = logger.tail();

      expect(result).toBe("");
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });
  });
});
