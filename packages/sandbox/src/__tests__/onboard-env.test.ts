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
      files: { "/home/orchestrator/harness/.devcontainer/.env": "FOO=a\nBAR=b\n" },
    });
    const target: Record<string, string | undefined> = { FOO: "preexisting" };
    loadEnvInto(deps.fs, "/home/orchestrator/harness/.devcontainer/.env", target);
    expect(target.FOO).toBe("preexisting");
    expect(target.BAR).toBe("b");
  });

  it("ignores commented-out prior values and loads only the live one", () => {
    const deps = makeFakeDeps({
      files: {
        "/env": "# FOO=old1\n# FOO=old2\nFOO=current\n",
      },
    });
    const target: Record<string, string | undefined> = {};
    loadEnvInto(deps.fs, "/env", target);
    expect(target.FOO).toBe("current");
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

  it("comments out existing key in place and inserts new value after it", () => {
    const deps = makeFakeDeps({
      files: { "/env": "KEEP=me\nSLACK_APP_TOKEN=old\nTRAILING=yes\n" },
    });
    upsertEnvFile(deps.fs, "/env", { SLACK_APP_TOKEN: "new" });
    expect(deps.files.get("/env")).toBe(
      "KEEP=me\n# SLACK_APP_TOKEN=old\nSLACK_APP_TOKEN=new\nTRAILING=yes\n",
    );
  });

  it("appends at end when the key has no prior occurrence", () => {
    const deps = makeFakeDeps({ files: { "/env": "A=1\n" } });
    upsertEnvFile(deps.fs, "/env", { B: "2" });
    expect(deps.files.get("/env")).toBe("A=1\nB=2\n");
  });

  it("multiple existing occurrences: comments each, inserts new after the last", () => {
    const deps = makeFakeDeps({
      files: { "/env": "FOO=a\nMID=x\nFOO=b\nEND=y\n" },
    });
    upsertEnvFile(deps.fs, "/env", { FOO: "c" });
    expect(deps.files.get("/env")).toBe("# FOO=a\nMID=x\n# FOO=b\nFOO=c\nEND=y\n");
  });

  it("leaves already-commented matching lines untouched", () => {
    const deps = makeFakeDeps({
      files: { "/env": "# FOO=old-disabled\nFOO=active\n" },
    });
    upsertEnvFile(deps.fs, "/env", { FOO: "new" });
    expect(deps.files.get("/env")).toBe("# FOO=old-disabled\n# FOO=active\nFOO=new\n");
  });

  it("handles multi-key upsert on empty file", () => {
    const deps = makeFakeDeps();
    upsertEnvFile(deps.fs, "/env", { A: "1", B: "2" });
    expect(deps.files.get("/env")).toBe("A=1\nB=2\n");
  });

  it("multi-key upsert where one key matches, one is new", () => {
    const deps = makeFakeDeps({ files: { "/env": "A=1\n" } });
    upsertEnvFile(deps.fs, "/env", { A: "2", B: "3" });
    expect(deps.files.get("/env")).toBe("# A=1\nA=2\nB=3\n");
  });
});
