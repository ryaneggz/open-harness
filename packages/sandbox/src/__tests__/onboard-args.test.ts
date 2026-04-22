import { describe, it, expect } from "vitest";
import { parseArgs } from "../onboard/args.js";
import { UnknownStepError } from "../onboard/types.js";

describe("onboard parseArgs", () => {
  it("empty argv -> force false, no only", () => {
    expect(parseArgs([])).toEqual({ force: false, only: undefined });
  });

  it("--force flips force", () => {
    expect(parseArgs(["--force"])).toEqual({ force: true, only: undefined });
  });

  it("--only <step> sets only", () => {
    expect(parseArgs(["--only", "slack"])).toEqual({ force: false, only: "slack" });
  });

  it("--only=<step> sets only", () => {
    expect(parseArgs(["--only=cloudflare"])).toEqual({ force: false, only: "cloudflare" });
  });

  it("positional step alias sets only", () => {
    expect(parseArgs(["claude"])).toEqual({ force: false, only: "claude" });
  });

  it("--force and --only can combine", () => {
    expect(parseArgs(["--force", "--only", "slack"])).toEqual({ force: true, only: "slack" });
  });

  it("unknown --only throws UnknownStepError", () => {
    expect(() => parseArgs(["--only", "whatever"])).toThrow(UnknownStepError);
  });

  it("unknown --only=value throws UnknownStepError", () => {
    expect(() => parseArgs(["--only=bogus"])).toThrow(UnknownStepError);
  });

  it("ignores unrecognized flags (bash script did too)", () => {
    expect(parseArgs(["--weird-flag", "--force"])).toEqual({ force: true, only: undefined });
  });

  it("positional non-step args are ignored (no crash)", () => {
    expect(parseArgs(["not-a-step"])).toEqual({ force: false, only: undefined });
  });
});
