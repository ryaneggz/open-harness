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

const {
  readExposures,
  writeExposures,
  upsertExposure,
  removeRoute,
  findRouteByName,
  findRouteByPort,
  listRoutes,
} = await import("../lib/exposures.js");

function mkRoute(routeName: string, port: number, sandbox = "oh-local") {
  return {
    routeName,
    port,
    sandbox,
    url: `https://${routeName}.${sandbox}.localhost:8443`,
    createdAt: "2026-04-22T00:00:00.000Z",
  };
}

describe("readExposures", () => {
  it("returns empty file when path does not exist", () => {
    expect(readExposures()).toEqual({ version: 1, exposures: [] });
  });

  it("returns empty and warns on malformed JSON", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolve } = await import("node:path");
    fs.set(resolve(".openharness/exposures.json"), "not valid json {{");

    expect(readExposures()).toEqual({ version: 1, exposures: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("failed to parse"));
    warnSpy.mockRestore();
  });

  it("returns empty and warns on unknown version", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { resolve } = await import("node:path");
    fs.set(resolve(".openharness/exposures.json"), JSON.stringify({ version: 99, exposures: [] }));

    expect(readExposures()).toEqual({ version: 1, exposures: [] });
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("unknown version"));
    warnSpy.mockRestore();
  });

  it("silently drops entries that do not match the current schema", async () => {
    const { resolve } = await import("node:path");
    // Legacy scope-union entries (no routeName) must be filtered out.
    const legacy = { port: 3000, scope: "local", hostPort: 3000, createdAt: "x" };
    const ok = mkRoute("docs", 8080);
    fs.set(
      resolve(".openharness/exposures.json"),
      JSON.stringify({ version: 1, exposures: [legacy, ok] }),
    );
    expect(readExposures().exposures).toEqual([ok]);
  });
});

describe("writeExposures / readExposures round-trip", () => {
  it("persists and reads back a route correctly", () => {
    const r = mkRoute("docs", 8080);
    writeExposures({ version: 1, exposures: [r] });
    expect(readExposures()).toEqual({ version: 1, exposures: [r] });
  });

  it("writes via tmp file then renames atomically", async () => {
    const { resolve } = await import("node:path");
    const finalPath = resolve(".openharness/exposures.json");
    writeExposures({ version: 1, exposures: [] });
    expect(fs.has(finalPath)).toBe(true);
    expect(fs.has(`${finalPath}.tmp`)).toBe(false);
  });
});

describe("upsertExposure", () => {
  it("adds a new route when none exists", () => {
    const r = mkRoute("docs", 8080);
    upsertExposure(r);
    expect(readExposures().exposures).toEqual([r]);
  });

  it("replaces an existing entry with the same routeName", () => {
    upsertExposure(mkRoute("docs", 8080));
    const updated = { ...mkRoute("docs", 9000), createdAt: "2026-06-01T00:00:00.000Z" };
    upsertExposure(updated);
    expect(readExposures().exposures).toEqual([updated]);
  });

  it("does not replace entries with different routeNames", () => {
    upsertExposure(mkRoute("docs", 8080));
    upsertExposure(mkRoute("api", 3000));
    expect(readExposures().exposures).toHaveLength(2);
  });
});

describe("removeRoute", () => {
  it("removes an existing route and returns true", () => {
    upsertExposure(mkRoute("docs", 8080));
    expect(removeRoute("docs")).toBe(true);
    expect(readExposures().exposures).toHaveLength(0);
  });

  it("returns false when route does not exist", () => {
    upsertExposure(mkRoute("docs", 8080));
    expect(removeRoute("api")).toBe(false);
    expect(readExposures().exposures).toHaveLength(1);
  });

  it("leaves unrelated routes intact", () => {
    upsertExposure(mkRoute("docs", 8080));
    upsertExposure(mkRoute("api", 3000));
    removeRoute("docs");
    expect(readExposures().exposures.map((e) => e.routeName)).toEqual(["api"]);
  });
});

describe("findRouteByName / findRouteByPort / listRoutes", () => {
  beforeEach(() => {
    upsertExposure(mkRoute("docs", 8080));
    upsertExposure(mkRoute("api", 3000));
  });

  it("finds by name", () => {
    expect(findRouteByName("docs")?.port).toBe(8080);
  });

  it("finds by port", () => {
    expect(findRouteByPort(3000)?.routeName).toBe("api");
  });

  it("returns undefined for unknown name", () => {
    expect(findRouteByName("nope")).toBeUndefined();
  });

  it("returns undefined for unknown port", () => {
    expect(findRouteByPort(9999)).toBeUndefined();
  });

  it("lists all routes", () => {
    expect(listRoutes()).toHaveLength(2);
  });
});
