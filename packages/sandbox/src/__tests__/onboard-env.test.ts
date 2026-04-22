import { describe, it, expect } from "vitest";
import { loadEnvInto, parseEnvFile, upsertEnvFile } from "../onboard/env.js";
import { makeFakeDeps } from "../onboard/testing/fake-deps.js";

describe("parseEnvFile", () => {
  it("parses KEY=VALUE lines", () => {
    const parsed = parseEnvFile("SLACK_APP_TOKEN=xapp-1\nSLACK_BOT_TOKEN=xoxb-1\n");
    expect(parsed.SLACK_APP_TOKEN).toBe("xapp-1");
    expect(parsed.SLACK_BOT_TOKEN).toBe("xoxb-1");
  });

  it("ignores blank lines and comments", () => {
    const parsed = parseEnvFile("# header\n\nFOO=bar\n");
    expect(parsed).toEqual({ FOO: "bar" });
  });

  it("strips surrounding quotes", () => {
    expect(parseEnvFile('FOO="bar"').FOO).toBe("bar");
    expect(parseEnvFile("FOO='bar'").FOO).toBe("bar");
  });

  it("last occurrence wins for duplicate keys", () => {
    expect(parseEnvFile("FOO=a\nFOO=b\n").FOO).toBe("b");
  });
});

describe("loadEnvInto", () => {
  it("adds missing keys, preserves existing keys", () => {
    const deps = makeFakeDeps({
      files: { "/home/sandbox/harness/.env": "FOO=a\nBAR=b\n" },
    });
    const target: Record<string, string | undefined> = { FOO: "preexisting" };
    loadEnvInto(deps.fs, "/home/sandbox/harness/.env", target);
    expect(target.FOO).toBe("preexisting");
    expect(target.BAR).toBe("b");
  });

  it("empty value counts as missing and gets overwritten", () => {
    const deps = makeFakeDeps({ files: { "/env": "FOO=real\n" } });
    const target: Record<string, string | undefined> = { FOO: "" };
    loadEnvInto(deps.fs, "/env", target);
    expect(target.FOO).toBe("real");
  });

  it("no-op when file does not exist", () => {
    const deps = makeFakeDeps();
    const target: Record<string, string | undefined> = {};
    loadEnvInto(deps.fs, "/missing", target);
    expect(target).toEqual({});
  });
});

describe("upsertEnvFile", () => {
  it("creates the file when absent", () => {
    const deps = makeFakeDeps();
    upsertEnvFile(deps.fs, "/env", { FOO: "bar" });
    expect(deps.files.get("/env")).toBe("FOO=bar\n");
  });

  it("replaces existing keys without duplicating", () => {
    const deps = makeFakeDeps({
      files: { "/env": "KEEP=me\nSLACK_APP_TOKEN=old\n" },
    });
    upsertEnvFile(deps.fs, "/env", { SLACK_APP_TOKEN: "new" });
    const contents = deps.files.get("/env")!;
    expect(contents).toContain("KEEP=me");
    expect(contents).toContain("SLACK_APP_TOKEN=new");
    expect(contents.match(/SLACK_APP_TOKEN=/g)?.length).toBe(1);
  });

  it("handles multi-key upsert", () => {
    const deps = makeFakeDeps();
    upsertEnvFile(deps.fs, "/env", { A: "1", B: "2" });
    expect(deps.files.get("/env")).toBe("A=1\nB=2\n");
  });
});
