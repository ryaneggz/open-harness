import { describe, it, expect } from "vitest";
import { normalizeOnboardOpts } from "../cli/onboard.js";

describe("normalizeOnboardOpts", () => {
  it("rewrites a step-id name into only", () => {
    expect(normalizeOnboardOpts({ name: "slack" })).toEqual({
      name: undefined,
      only: "slack",
    });
  });

  it("leaves a non-step name alone (host mode against a real container)", () => {
    expect(normalizeOnboardOpts({ name: "my-sandbox" })).toEqual({ name: "my-sandbox" });
  });

  it("preserves only when both name and only are set (host mode + step)", () => {
    expect(normalizeOnboardOpts({ name: "my-sandbox", only: "slack" })).toEqual({
      name: "my-sandbox",
      only: "slack",
    });
  });

  it("does not overwrite explicit only with a step-id name", () => {
    expect(normalizeOnboardOpts({ name: "slack", only: "llm" })).toEqual({
      name: "slack",
      only: "llm",
    });
  });

  it("passes through force", () => {
    expect(normalizeOnboardOpts({ name: "slack", force: true })).toEqual({
      name: undefined,
      only: "slack",
      force: true,
    });
  });

  it("no-ops on empty opts", () => {
    expect(normalizeOnboardOpts({})).toEqual({});
  });
});
