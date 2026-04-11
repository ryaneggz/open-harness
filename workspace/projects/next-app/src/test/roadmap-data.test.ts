import { describe, it, expect } from "vitest";
import { roadmap } from "@/data/roadmap";
import type { RoadmapItem, RoadmapCategory, RoadmapPhase, Complexity } from "@/data/roadmap";

const validCategories: RoadmapCategory[] = ["product", "docs", "security", "registry", "agent"];
const validPhases: RoadmapPhase[] = ["now", "next", "later"];
const validComplexities: Complexity[] = ["S", "M", "L"];

describe("roadmap data integrity", () => {
  it("exports a valid array", () => {
    expect(Array.isArray(roadmap)).toBe(true);
  });

  it("accepts empty roadmap (initial state)", () => {
    // Empty array is valid — the skill populates it
    expect(roadmap.length).toBeGreaterThanOrEqual(0);
  });

  it("every item has all required fields", () => {
    for (const item of roadmap) {
      expect(item.rank).toBeDefined();
      expect(typeof item.rank).toBe("number");
      expect(item.title).toBeDefined();
      expect(typeof item.title).toBe("string");
      expect(item.description).toBeDefined();
      expect(typeof item.description).toBe("string");
      expect(item.category).toBeDefined();
      expect(item.phase).toBeDefined();
      expect(item.complexity).toBeDefined();
      expect(item.signal).toBeDefined();
      expect(typeof item.signal).toBe("string");
    }
  });

  it("ranks are unique", () => {
    const ranks = roadmap.map((item) => item.rank);
    const uniqueRanks = new Set(ranks);
    expect(uniqueRanks.size).toBe(ranks.length);
  });

  it("categories are valid enum values", () => {
    for (const item of roadmap) {
      expect(validCategories).toContain(item.category);
    }
  });

  it("phases are valid enum values", () => {
    for (const item of roadmap) {
      expect(validPhases).toContain(item.phase);
    }
  });

  it("complexities are valid enum values", () => {
    for (const item of roadmap) {
      expect(validComplexities).toContain(item.complexity);
    }
  });

  it("'now' phase items must have validated signal (not 'none')", () => {
    const nowItems = roadmap.filter((item) => item.phase === "now");
    for (const item of nowItems) {
      expect(item.signal).not.toBe("none");
    }
  });

  it("dependencies reference existing item titles if present", () => {
    const titles = roadmap.map((item) => item.title);
    for (const item of roadmap) {
      if (item.dependencies) {
        for (const dep of item.dependencies) {
          expect(titles).toContain(dep);
        }
      }
    }
  });
});

// Helper for other tests that need to construct valid roadmap items
export function makeRoadmapItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    rank: 1,
    title: "Test Item",
    description: "A test roadmap item",
    category: "product",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
    ...overrides,
  };
}
