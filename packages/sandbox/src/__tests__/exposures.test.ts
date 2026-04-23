import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory filesystem state — keyed by resolved path string
const fs = new Map<string, string>();

vi.mock("node:fs", () => ({
  existsSync: (p: string) => fs.has(p),
  readFileSync: (p: string) => fs.get(p) ?? "",
  writeFileSync: (p: string, data: string) => {
    fs.set(p, data);
  },
  renameSync: (a: string, b: string) => {
    const v = fs.get(a);
    fs.delete(a);
    if (v !== undefined) fs.set(b, v);
  },
  mkdirSync: () => {},
}));

beforeEach(() => fs.clear());

// Dynamic import after mocks — required for vi.mock hoisting to take effect
const { readExposures, writeExposures, upsertExposure, removeExposure, findExposure } =
  await import("../lib/exposures.js");

describe("readExposures", () => {
  it("returns empty file when path does not exist", () => {
    const result = readExposures();
    expect(result).toEqual({ version: 1, exposures: [] });
  });

  it("returns empty file and warns on malformed JSON", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Seed the resolved path that readExposures will compute
    const { resolve } = await import("node:path");
    const path = resolve(".openharness/exposures.json");
    fs.set(path, "not valid json {{");

    const result = readExposures();
    expect(result).toEqual({ version: 1, exposures: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("failed to parse"));
    warnSpy.mockRestore();
  });

  it("returns empty file and warns on unknown version", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolve } = await import("node:path");
    const path = resolve(".openharness/exposures.json");
    fs.set(path, JSON.stringify({ version: 99, exposures: [] }));

    const result = readExposures();
    expect(result).toEqual({ version: 1, exposures: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknown version"));
    warnSpy.mockRestore();
  });
});

describe("writeExposures / readExposures round-trip", () => {
  it("persists and reads back exposures correctly", () => {
    const exposure = {
      port: 3000,
      scope: "public" as const,
      url: "https://example.com",
      createdAt: new Date().toISOString(),
    };
    writeExposures({ version: 1, exposures: [exposure] });
    const result = readExposures();
    expect(result.version).toBe(1);
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]).toEqual(exposure);
  });

  it("writes via tmp file then renames atomically", async () => {
    const { resolve } = await import("node:path");
    const finalPath = resolve(".openharness/exposures.json");
    const tmpPath = `${finalPath}.tmp`;

    writeExposures({ version: 1, exposures: [] });

    // After write, only the final path should exist — tmp should be gone
    expect(fs.has(finalPath)).toBe(true);
    expect(fs.has(tmpPath)).toBe(false);
  });
});

describe("upsertExposure", () => {
  it("adds a new exposure when none exists", () => {
    const e = { port: 8080, scope: "local" as const, createdAt: new Date().toISOString() };
    upsertExposure(e);
    const result = readExposures();
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]).toEqual(e);
  });

  it("replaces existing entry with same (port, scope) tuple", () => {
    const original = { port: 8080, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(original);

    const updated = {
      port: 8080,
      scope: "local" as const,
      url: "http://localhost:8080",
      createdAt: "2026-06-01T00:00:00.000Z",
    };
    upsertExposure(updated);

    const result = readExposures();
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0]).toEqual(updated);
  });

  it("does not replace entry with different scope", () => {
    const local = { port: 8080, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    const pub = { port: 8080, scope: "public" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(local);
    upsertExposure(pub);

    const result = readExposures();
    expect(result.exposures).toHaveLength(2);
  });

  it("does not replace entry with different port", () => {
    const a = { port: 3000, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    const b = { port: 4000, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(a);
    upsertExposure(b);

    const result = readExposures();
    expect(result.exposures).toHaveLength(2);
  });
});

describe("removeExposure", () => {
  it("removes an existing exposure", () => {
    upsertExposure({ port: 3000, scope: "public", createdAt: new Date().toISOString() });
    removeExposure(3000, "public");
    const result = readExposures();
    expect(result.exposures).toHaveLength(0);
  });

  it("is a no-op when the entry does not exist", () => {
    upsertExposure({ port: 3000, scope: "public", createdAt: new Date().toISOString() });
    // Remove a different port — should be silent no-op
    removeExposure(9999, "public");
    const result = readExposures();
    expect(result.exposures).toHaveLength(1);
  });

  it("is a no-op on empty exposures file", () => {
    expect(() => removeExposure(3000, "local")).not.toThrow();
    const result = readExposures();
    expect(result.exposures).toHaveLength(0);
  });

  it("only removes the matching (port, scope) and leaves others intact", () => {
    upsertExposure({ port: 3000, scope: "local", createdAt: new Date().toISOString() });
    upsertExposure({ port: 3000, scope: "public", createdAt: new Date().toISOString() });
    removeExposure(3000, "local");
    const result = readExposures();
    expect(result.exposures).toHaveLength(1);
    expect(result.exposures[0].scope).toBe("public");
  });
});

describe("findExposure", () => {
  it("returns undefined when no exposures exist", () => {
    expect(findExposure(3000)).toBeUndefined();
  });

  it("returns undefined when port does not match", () => {
    upsertExposure({ port: 4000, scope: "local", createdAt: new Date().toISOString() });
    expect(findExposure(3000)).toBeUndefined();
  });

  it("prefers public over local when no scope specified", () => {
    const local = { port: 3000, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    const pub = { port: 3000, scope: "public" as const, url: "https://pub.example.com", createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(local);
    upsertExposure(pub);

    const result = findExposure(3000);
    expect(result).toEqual(pub);
  });

  it("returns local when only local exists and no scope specified", () => {
    const local = { port: 3000, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(local);

    const result = findExposure(3000);
    expect(result).toEqual(local);
  });

  it("returns specific scope when scope is specified", () => {
    const local = { port: 3000, scope: "local" as const, createdAt: "2026-01-01T00:00:00.000Z" };
    const pub = { port: 3000, scope: "public" as const, url: "https://pub.example.com", createdAt: "2026-01-01T00:00:00.000Z" };
    upsertExposure(local);
    upsertExposure(pub);

    expect(findExposure(3000, "local")).toEqual(local);
    expect(findExposure(3000, "public")).toEqual(pub);
  });

  it("returns undefined when scoped scope does not exist", () => {
    upsertExposure({ port: 3000, scope: "local", createdAt: new Date().toISOString() });
    expect(findExposure(3000, "public")).toBeUndefined();
  });
});
