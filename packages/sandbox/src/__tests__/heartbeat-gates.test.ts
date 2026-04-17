import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";

// Mock node:fs before importing the module under test
vi.mock("node:fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockExistsSync = vi.mocked(existsSync);
const mockReadFileSync = vi.mocked(readFileSync);

const { isActiveHours, isHeartbeatEmpty, isHeartbeatOk } =
  await import("../lib/heartbeat/gates.js");

// ---------------------------------------------------------------------------
// isActiveHours
// ---------------------------------------------------------------------------

describe("isActiveHours", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns true when no start/end configured (unconfigured = always active)", () => {
    vi.setSystemTime(new Date("2024-01-15T14:00:00"));
    expect(isActiveHours()).toBe(true);
    expect(isActiveHours(undefined, undefined)).toBe(true);
  });

  it("returns true when only start is configured (end missing)", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));
    expect(isActiveHours(9, undefined)).toBe(true);
  });

  it("returns true when only end is configured (start missing)", () => {
    vi.setSystemTime(new Date("2024-01-15T10:00:00"));
    expect(isActiveHours(undefined, 18)).toBe(true);
  });

  it("returns true when current hour is within range (start=9, end=18, hour=12)", () => {
    vi.setSystemTime(new Date("2024-01-15T12:30:00"));
    expect(isActiveHours(9, 18)).toBe(true);
  });

  it("returns true when current hour equals start boundary (start=9, end=18, hour=9)", () => {
    vi.setSystemTime(new Date("2024-01-15T09:00:00"));
    expect(isActiveHours(9, 18)).toBe(true);
  });

  it("returns false when current hour equals end boundary (start=9, end=18, hour=18)", () => {
    vi.setSystemTime(new Date("2024-01-15T18:00:00"));
    expect(isActiveHours(9, 18)).toBe(false);
  });

  it("returns false when current hour is outside range (start=9, end=18, hour=7)", () => {
    vi.setSystemTime(new Date("2024-01-15T07:00:00"));
    expect(isActiveHours(9, 18)).toBe(false);
  });

  it("returns false when current hour is outside range (start=9, end=18, hour=20)", () => {
    vi.setSystemTime(new Date("2024-01-15T20:00:00"));
    expect(isActiveHours(9, 18)).toBe(false);
  });

  // Wraparound (night shift): start=22, end=6
  it("returns true for night-shift wraparound: hour=23 is within start=22, end=6", () => {
    vi.setSystemTime(new Date("2024-01-15T23:00:00"));
    expect(isActiveHours(22, 6)).toBe(true);
  });

  it("returns true for night-shift wraparound: hour=3 is within start=22, end=6", () => {
    vi.setSystemTime(new Date("2024-01-15T03:00:00"));
    expect(isActiveHours(22, 6)).toBe(true);
  });

  it("returns false for night-shift wraparound: hour=12 is outside start=22, end=6", () => {
    vi.setSystemTime(new Date("2024-01-15T12:00:00"));
    expect(isActiveHours(22, 6)).toBe(false);
  });

  it("returns true for night-shift wraparound: hour=22 equals start boundary", () => {
    vi.setSystemTime(new Date("2024-01-15T22:00:00"));
    expect(isActiveHours(22, 6)).toBe(true);
  });

  it("returns false for night-shift wraparound: hour=6 equals end boundary", () => {
    vi.setSystemTime(new Date("2024-01-15T06:00:00"));
    expect(isActiveHours(22, 6)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isHeartbeatEmpty
// ---------------------------------------------------------------------------

describe("isHeartbeatEmpty", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when file does not exist", () => {
    mockExistsSync.mockReturnValue(false);
    expect(isHeartbeatEmpty("/some/path/MEMORY.md")).toBe(false);
  });

  it("returns false for file with meaningful content", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      "# Memory\n\nI learned something important today.\n- Action item\n",
    );
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(false);
  });

  it("returns true for file with only headers, blank lines, and HTML comments", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("# My File\n\n## Section\n\n<!-- This is a comment -->\n\n");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });

  it("returns true for file with only empty checkbox items (- [ ])", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("# Tasks\n\n- [ ]\n- [ ]\n- [x]\n- [X]\n");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });

  it("returns true for file with only empty bullet list items", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("# List\n\n- \n* \n+ \n");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });

  it("returns false for file with checkbox items that have content", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("# Tasks\n\n- [ ] Do the thing\n- [x] Done task\n");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(false);
  });

  it("returns true for completely empty file", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });

  it("returns true for file with only whitespace", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue("   \n  \n\t\n");
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });

  it("returns true for file with multi-line HTML comment blocks", () => {
    mockExistsSync.mockReturnValue(true);
    mockReadFileSync.mockReturnValue(
      "# Header\n\n<!--\nMulti line\ncomment here\n-->\n\n## Another\n",
    );
    expect(isHeartbeatEmpty("/workspace/MEMORY.md")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isHeartbeatOk
// ---------------------------------------------------------------------------

describe("isHeartbeatOk", () => {
  it("returns true for short response containing HEARTBEAT_OK", () => {
    expect(isHeartbeatOk("HEARTBEAT_OK")).toBe(true);
  });

  it("returns true for response with surrounding text under 300 chars", () => {
    expect(isHeartbeatOk("Agent check complete. HEARTBEAT_OK")).toBe(true);
  });

  it("returns false for response without HEARTBEAT_OK", () => {
    expect(isHeartbeatOk("I processed the request but nothing happened.")).toBe(false);
  });

  it("returns false for response >= 300 chars even if containing HEARTBEAT_OK", () => {
    const longPrefix = "a".repeat(290);
    const response = `${longPrefix} HEARTBEAT_OK`;
    expect(response.length).toBeGreaterThanOrEqual(300);
    expect(isHeartbeatOk(response)).toBe(false);
  });

  it("returns false for response exactly 300 chars containing HEARTBEAT_OK", () => {
    // Build a string exactly 300 chars that contains HEARTBEAT_OK
    const marker = "HEARTBEAT_OK";
    const padding = "x".repeat(300 - marker.length);
    const response = padding + marker;
    expect(response.length).toBe(300);
    expect(isHeartbeatOk(response)).toBe(false);
  });

  it("returns true for response of 299 chars containing HEARTBEAT_OK", () => {
    const marker = "HEARTBEAT_OK";
    const padding = "x".repeat(299 - marker.length);
    const response = padding + marker;
    expect(response.length).toBe(299);
    expect(isHeartbeatOk(response)).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(isHeartbeatOk("")).toBe(false);
  });
});
