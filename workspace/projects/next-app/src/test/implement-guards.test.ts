import { describe, it, expect } from "vitest";
import { getTopValidatedItem } from "@/lib/implement-guards";
import type { RoadmapItem } from "@/data/roadmap";

function makeItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    rank: 1,
    title: "Test Item",
    description: "A test item",
    category: "product",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
    ...overrides,
  };
}

describe("getTopValidatedItem", () => {
  it("returns null for empty roadmap", () => {
    expect(getTopValidatedItem([])).toBeNull();
  });

  it("returns null when all items are in 'later' phase", () => {
    const items = [
      makeItem({ rank: 1, phase: "later", signal: "none" }),
      makeItem({ rank: 2, phase: "later", signal: "none" }),
    ];
    expect(getTopValidatedItem(items)).toBeNull();
  });

  it("returns null when all items are in 'next' phase", () => {
    const items = [
      makeItem({ rank: 1, phase: "next", signal: "5 votes" }),
      makeItem({ rank: 2, phase: "next", signal: "3 votes" }),
    ];
    expect(getTopValidatedItem(items)).toBeNull();
  });

  it("returns null when 'now' items have signal 'none'", () => {
    const items = [makeItem({ rank: 1, phase: "now", signal: "none" })];
    expect(getTopValidatedItem(items)).toBeNull();
  });

  it("returns the highest-ranked 'now' item with signal", () => {
    const items = [
      makeItem({ rank: 3, title: "Third", phase: "now", signal: "infrastructure" }),
      makeItem({ rank: 1, title: "First", phase: "now", signal: "5 thumbs-up" }),
      makeItem({ rank: 2, title: "Second", phase: "now", signal: "infrastructure" }),
    ];
    const result = getTopValidatedItem(items);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("First");
    expect(result!.rank).toBe(1);
  });

  it("skips 'now' items with signal 'none' and returns next valid", () => {
    const items = [
      makeItem({ rank: 1, title: "No Signal", phase: "now", signal: "none" }),
      makeItem({ rank: 2, title: "Has Signal", phase: "now", signal: "3 reactions" }),
    ];
    const result = getTopValidatedItem(items);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Has Signal");
  });

  it("returns infrastructure items from 'now' phase", () => {
    const items = [
      makeItem({ rank: 1, title: "Auth Setup", phase: "now", signal: "infrastructure" }),
    ];
    const result = getTopValidatedItem(items);
    expect(result).not.toBeNull();
    expect(result!.signal).toBe("infrastructure");
  });

  it("ignores items from other phases even with signal", () => {
    const items = [
      makeItem({ rank: 1, title: "Later Item", phase: "later", signal: "10 votes" }),
      makeItem({ rank: 2, title: "Next Item", phase: "next", signal: "5 votes" }),
      makeItem({ rank: 3, title: "Now Item", phase: "now", signal: "2 votes" }),
    ];
    const result = getTopValidatedItem(items);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Now Item");
  });
});
