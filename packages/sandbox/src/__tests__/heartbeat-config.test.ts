import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";

// Mock fs before importing the module under test
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

const { secondsToCron, parseHeartbeatConfig } = await import("../lib/heartbeat/config.js");

describe("secondsToCron", () => {
  it("returns * * * * * for 0 seconds", () => {
    expect(secondsToCron(0)).toBe("* * * * *");
  });

  it("returns * * * * * for negative seconds", () => {
    expect(secondsToCron(-60)).toBe("* * * * *");
  });

  it("returns */30 * * * * for 1800 seconds", () => {
    expect(secondsToCron(1800)).toBe("*/30 * * * *");
  });

  it("returns 0 * * * * for 3600 seconds (exactly 60 min)", () => {
    expect(secondsToCron(3600)).toBe("0 * * * *");
  });

  it("returns 0 */2 * * * for 7200 seconds", () => {
    expect(secondsToCron(7200)).toBe("0 */2 * * *");
  });

  it("returns 0 0 * * * for 86400 seconds (24h)", () => {
    expect(secondsToCron(86400)).toBe("0 0 * * *");
  });

  it("returns 0 0 * * * for values larger than 86400", () => {
    expect(secondsToCron(172800)).toBe("0 0 * * *");
  });

  it("returns */15 * * * * for 900 seconds", () => {
    expect(secondsToCron(900)).toBe("*/15 * * * *");
  });

  it("returns 0 */4 * * * for 14400 seconds", () => {
    expect(secondsToCron(14400)).toBe("0 */4 * * *");
  });
});

describe("parseHeartbeatConfig", () => {
  const workspacePath = "/home/sandbox/workspace";
  const configPath = `${workspacePath}/heartbeats.conf`;
  const legacyPath = `${workspacePath}/HEARTBEAT.md`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it("returns empty array when neither file exists", () => {
    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toEqual([]);
  });

  it("parses a valid heartbeats.conf with multiple entries", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      if (s === configPath) return true;
      // All file paths exist for validation
      return (
        s.includes("build-health.md") ||
        s.includes("nightly-release.md") ||
        s.includes("daily-summary.md")
      );
    });

    mockReadFileSync.mockReturnValue(
      [
        "*/30 * * * * | heartbeats/build-health.md | claude | 9-21",
        "50 23 * * *  | heartbeats/nightly-release.md | claude",
        "0 0 * * *    | heartbeats/daily-summary.md",
      ].join("\n"),
    );

    const result = parseHeartbeatConfig(workspacePath);

    expect(result).toHaveLength(3);

    expect(result[0]).toEqual({
      cronExpr: "*/30 * * * *",
      filePath: "heartbeats/build-health.md",
      agent: "claude",
      activeStart: 9,
      activeEnd: 21,
    });

    expect(result[1]).toEqual({
      cronExpr: "50 23 * * *",
      filePath: "heartbeats/nightly-release.md",
      agent: "claude",
    });

    expect(result[2]).toEqual({
      cronExpr: "0 0 * * *",
      filePath: "heartbeats/daily-summary.md",
      agent: "claude",
    });
  });

  it("skips comment lines (starting with #)", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s.includes("active.md");
    });

    mockReadFileSync.mockReturnValue(
      [
        "# This is a comment",
        "*/30 * * * * | heartbeats/active.md | claude",
        "# 0 * * * * | heartbeats/commented-out.md | claude",
      ].join("\n"),
    );

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("heartbeats/active.md");
  });

  it("skips blank lines", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s.includes("task.md");
    });

    mockReadFileSync.mockReturnValue(
      ["", "   ", "*/15 * * * * | heartbeats/task.md | claude", "", ""].join("\n"),
    );

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
  });

  it("handles entries with only cron + file (no agent, no active_range)", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s.includes("minimal.md");
    });

    mockReadFileSync.mockReturnValue("0 * * * * | heartbeats/minimal.md");

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      cronExpr: "0 * * * *",
      filePath: "heartbeats/minimal.md",
      agent: "claude",
    });
    expect(result[0].activeStart).toBeUndefined();
    expect(result[0].activeEnd).toBeUndefined();
  });

  it("handles entries with agent but no active_range", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s.includes("norange.md");
    });

    mockReadFileSync.mockReturnValue("0 */2 * * * | heartbeats/norange.md | codex");

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(result[0].agent).toBe("codex");
    expect(result[0].activeStart).toBeUndefined();
    expect(result[0].activeEnd).toBeUndefined();
  });

  it("uses defaultAgent parameter when agent field is empty", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s.includes("noagent.md");
    });

    mockReadFileSync.mockReturnValue("*/30 * * * * | heartbeats/noagent.md");

    const result = parseHeartbeatConfig(workspacePath, "codex");
    expect(result[0].agent).toBe("codex");
  });

  it("skips entries with fewer than 2 pipe-separated parts", () => {
    mockExistsSync.mockImplementation((p) => String(p) === configPath);

    mockReadFileSync.mockReturnValue(
      ["*/30 * * * *", "0 * * * * | heartbeats/missing-file.md"].join("\n"),
    );

    // missing-file.md doesn't exist on disk → also skipped
    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(0);
  });

  it("skips entries whose file does not exist on disk", () => {
    mockExistsSync.mockImplementation((p) => {
      return String(p) === configPath;
      // heartbeats/ghost.md does NOT exist
    });

    mockReadFileSync.mockReturnValue("*/30 * * * * | heartbeats/ghost.md | claude");

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(0);
  });

  it("resolves relative file paths against workspacePath for existence check", () => {
    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s === `${workspacePath}/heartbeats/relative.md`;
    });

    mockReadFileSync.mockReturnValue("*/30 * * * * | heartbeats/relative.md | claude");

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe("heartbeats/relative.md");
  });

  it("does not resolve absolute file paths against workspacePath", () => {
    const absPath = "/tmp/absolute.md";

    mockExistsSync.mockImplementation((p) => {
      const s = String(p);
      return s === configPath || s === absPath;
    });

    mockReadFileSync.mockReturnValue(`*/30 * * * * | ${absPath} | claude`);

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(result[0].filePath).toBe(absPath);
  });

  describe("legacy HEARTBEAT.md fallback", () => {
    it("produces a single entry when only HEARTBEAT.md exists", () => {
      mockExistsSync.mockImplementation((p) => {
        return String(p) === legacyPath;
      });

      const result = parseHeartbeatConfig(workspacePath);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe("HEARTBEAT.md");
      expect(result[0].agent).toBe("claude");
      // default interval is 1800s → */30 * * * *
      expect(result[0].cronExpr).toBe("*/30 * * * *");
    });

    it("uses defaultInterval for the cron expression in legacy mode", () => {
      mockExistsSync.mockImplementation((p) => {
        return String(p) === legacyPath;
      });

      const result = parseHeartbeatConfig(workspacePath, "claude", 3600);

      expect(result[0].cronExpr).toBe("0 * * * *");
    });

    it("uses defaultAgent in legacy mode", () => {
      mockExistsSync.mockImplementation((p) => {
        return String(p) === legacyPath;
      });

      const result = parseHeartbeatConfig(workspacePath, "codex");

      expect(result[0].agent).toBe("codex");
    });
  });
});
