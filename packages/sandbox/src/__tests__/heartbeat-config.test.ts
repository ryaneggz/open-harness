import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";

vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);
const mockReaddirSync = vi.mocked(readdirSync);

const { secondsToCron, parseFrontmatter, parseHeartbeatConfig } =
  await import("../lib/heartbeat/config.js");

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

describe("parseFrontmatter", () => {
  it("returns null when no frontmatter present", () => {
    expect(parseFrontmatter("# Just a heading\nSome text")).toBeNull();
  });

  it("parses schedule and agent fields", () => {
    const content = `---
schedule: "*/30 * * * *"
agent: claude
---

# My Heartbeat`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ schedule: "*/30 * * * *", agent: "claude" });
  });

  it("strips surrounding quotes from values", () => {
    const content = `---
schedule: '0 * * * *'
agent: "codex"
---`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ schedule: "0 * * * *", agent: "codex" });
  });

  it("skips commented-out fields", () => {
    const content = `---
# schedule: "0 * * * *"
agent: claude
---`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ agent: "claude" });
  });

  it("returns null when all fields are commented out", () => {
    const content = `---
# schedule: "0 * * * *"
# agent: claude
---`;
    expect(parseFrontmatter(content)).toBeNull();
  });

  it("skips blank lines in frontmatter", () => {
    const content = `---
schedule: "0 * * * *"

agent: claude
---`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ schedule: "0 * * * *", agent: "claude" });
  });

  it("parses active hours field", () => {
    const content = `---
schedule: "*/30 * * * *"
active: 9-21
---`;
    const fm = parseFrontmatter(content);
    expect(fm).toEqual({ schedule: "*/30 * * * *", active: "9-21" });
  });
});

describe("parseHeartbeatConfig", () => {
  const workspacePath = "/home/sandbox/workspace";
  const heartbeatsDir = `${workspacePath}/heartbeats`;
  const legacyPath = `${workspacePath}/HEARTBEAT.md`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
  });

  it("returns empty array when neither heartbeats/ dir nor HEARTBEAT.md exists", () => {
    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toEqual([]);
  });

  it("scans heartbeats/ dir and parses frontmatter from .md files", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["build-health.md", "nightly.md"] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockImplementation((p) => {
      if (String(p).includes("build-health.md")) {
        return `---\nschedule: "*/30 * * * *"\nagent: claude\nactive: 9-21\n---\n\n# Build`;
      }
      return `---\nschedule: "50 23 * * *"\n---\n\n# Nightly`;
    });

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      cronExpr: "*/30 * * * *",
      filePath: "heartbeats/build-health.md",
      agent: "claude",
      activeStart: 9,
      activeEnd: 21,
    });

    expect(result[1]).toEqual({
      cronExpr: "50 23 * * *",
      filePath: "heartbeats/nightly.md",
      agent: "claude",
    });
  });

  it("skips files without frontmatter", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["no-fm.md"] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue("# No frontmatter\nJust content");

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(0);
  });

  it("skips files without a schedule field (disabled heartbeats)", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["disabled.md"] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(
      `---\n# schedule: "0 * * * *"\nagent: claude\n---\n\n# Disabled`,
    );

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(0);
  });

  it("uses defaultAgent when agent not specified in frontmatter", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["task.md"] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(`---\nschedule: "0 * * * *"\n---\n\n# Task`);

    const result = parseHeartbeatConfig(workspacePath, "codex");
    expect(result[0].agent).toBe("codex");
  });

  it("overrides defaultAgent with frontmatter agent field", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["task.md"] as unknown as ReturnType<typeof readdirSync>);
    mockReadFileSync.mockReturnValue(`---\nschedule: "0 * * * *"\nagent: claude\n---\n`);

    const result = parseHeartbeatConfig(workspacePath, "codex");
    expect(result[0].agent).toBe("claude");
  });

  it("only reads .md files, ignoring other extensions", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["task.md", "readme.txt", ".DS_Store"] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockReturnValue(`---\nschedule: "0 * * * *"\n---\n`);

    const result = parseHeartbeatConfig(workspacePath);
    expect(result).toHaveLength(1);
    expect(mockReadFileSync).toHaveBeenCalledTimes(1);
  });

  it("returns entries sorted by filename", () => {
    mockExistsSync.mockImplementation((p) => String(p) === heartbeatsDir);
    mockReaddirSync.mockReturnValue(["z-last.md", "a-first.md"] as unknown as ReturnType<
      typeof readdirSync
    >);
    mockReadFileSync.mockReturnValue(`---\nschedule: "0 * * * *"\n---\n`);

    const result = parseHeartbeatConfig(workspacePath);
    expect(result[0].filePath).toBe("heartbeats/a-first.md");
    expect(result[1].filePath).toBe("heartbeats/z-last.md");
  });

  describe("legacy HEARTBEAT.md fallback", () => {
    it("produces a single entry when only HEARTBEAT.md exists", () => {
      mockExistsSync.mockImplementation((p) => String(p) === legacyPath);

      const result = parseHeartbeatConfig(workspacePath);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        cronExpr: "*/30 * * * *",
        filePath: "HEARTBEAT.md",
        agent: "claude",
      });
    });

    it("uses defaultInterval for the cron expression in legacy mode", () => {
      mockExistsSync.mockImplementation((p) => String(p) === legacyPath);

      const result = parseHeartbeatConfig(workspacePath, "claude", 3600);
      expect(result[0].cronExpr).toBe("0 * * * *");
    });

    it("uses defaultAgent in legacy mode", () => {
      mockExistsSync.mockImplementation((p) => String(p) === legacyPath);

      const result = parseHeartbeatConfig(workspacePath, "codex");
      expect(result[0].agent).toBe("codex");
    });
  });
});
