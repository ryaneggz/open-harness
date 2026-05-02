import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  installPack,
  resolveSpec,
  uninstallPack,
  validateManifest,
  type PackEnv,
} from "../harness/pack.js";
import {
  addInstalled,
  parseHarnessRegistry,
  readHarnessRegistry,
  removeInstalled,
  writeHarnessRegistry,
  type InstalledHarness,
} from "../harness/registry.js";
import type { HarnessPack } from "../onboard/types.js";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "oh-harness-pack-"));
}

function writeManifest(dir: string, manifest: HarnessPack): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "harness.json"), JSON.stringify(manifest, null, 2));
}

function fakeManifest(over: Partial<HarnessPack> = {}): HarnessPack {
  return {
    name: "fake-pack",
    version: "1.0.0",
    description: "fixture",
    openharness: ">=2026.5.2",
    agents: [],
    compose_overlays: [],
    onboard_steps: [],
    install_hook: "install-hook.sh",
    entrypoint_hook: "entrypoint-hook.sh",
    workspace_seed: "workspace-seed/",
    ...over,
  };
}

// ─── resolveSpec ────────────────────────────────────────────────────────────

describe("resolveSpec", () => {
  it("classifies @scope/name as npm", () => {
    expect(resolveSpec("@ryaneggz/mifune")).toEqual({
      mode: "npm",
      spec: "@ryaneggz/mifune",
      identifier: "@ryaneggz/mifune",
    });
  });

  it("classifies bare package-name as npm", () => {
    expect(resolveSpec("mifune")).toEqual({
      mode: "npm",
      spec: "mifune",
      identifier: "mifune",
    });
  });

  it("classifies owner/repo as git (GitHub HTTPS)", () => {
    expect(resolveSpec("ryaneggz/mifune")).toEqual({
      mode: "git",
      spec: "ryaneggz/mifune",
      identifier: "https://github.com/ryaneggz/mifune.git",
    });
  });

  it("classifies https URL as git", () => {
    const r = resolveSpec("https://github.com/ryaneggz/mifune.git");
    expect(r.mode).toBe("git");
    expect(r.identifier).toBe("https://github.com/ryaneggz/mifune.git");
  });

  it("classifies git@ URL as git", () => {
    const r = resolveSpec("git@github.com:ryaneggz/mifune.git");
    expect(r.mode).toBe("git");
  });

  it("classifies ./relative as local", () => {
    const r = resolveSpec("./local/path");
    expect(r.mode).toBe("local");
    expect(r.identifier).toMatch(/local\/path$/);
  });

  it("classifies absolute path as local", () => {
    const r = resolveSpec("/abs/path");
    expect(r.mode).toBe("local");
    expect(r.identifier).toBe("/abs/path");
  });

  it("trims whitespace before classifying", () => {
    expect(resolveSpec("  @ryaneggz/mifune  ").mode).toBe("npm");
  });

  it("throws on empty spec", () => {
    expect(() => resolveSpec("   ")).toThrow();
  });
});

// ─── validateManifest ───────────────────────────────────────────────────────

describe("validateManifest", () => {
  it("accepts a complete manifest", () => {
    expect(validateManifest(fakeManifest())).not.toBeNull();
  });

  it("rejects null/undefined/non-object input", () => {
    expect(validateManifest(null)).toBeNull();
    expect(validateManifest(undefined)).toBeNull();
    expect(validateManifest("string")).toBeNull();
    expect(validateManifest(42)).toBeNull();
  });

  it("rejects manifests missing required keys", () => {
    const m = fakeManifest() as unknown as Record<string, unknown>;
    delete m.compose_overlays;
    expect(validateManifest(m)).toBeNull();
  });

  it("rejects wrong-typed fields", () => {
    expect(validateManifest({ ...fakeManifest(), agents: "should be array" })).toBeNull();
    expect(validateManifest({ ...fakeManifest(), version: 42 })).toBeNull();
  });
});

// ─── registry round-trip ───────────────────────────────────────────────────

describe("registry round-trip", () => {
  it("readHarnessRegistry returns empty for missing file", () => {
    expect(readHarnessRegistry(join(makeTempDir(), "missing.json"))).toEqual({ installed: [] });
  });

  it("write + read round-trips", () => {
    const tmp = makeTempDir();
    const path = join(tmp, "harnesses.json");
    const entry: InstalledHarness = {
      name: "fake-pack",
      path: "/some/where",
      version: "1.0.0",
      source: "npm",
      spec: "@ryaneggz/mifune",
      manifest: fakeManifest(),
    };
    writeHarnessRegistry({ installed: [entry] }, path);
    const parsed = readHarnessRegistry(path);
    expect(parsed.installed).toHaveLength(1);
    expect(parsed.installed[0]).toMatchObject({
      name: "fake-pack",
      source: "npm",
      spec: "@ryaneggz/mifune",
    });
    rmSync(tmp, { recursive: true, force: true });
  });

  it("addInstalled replaces an existing entry by name", () => {
    const tmp = makeTempDir();
    const path = join(tmp, "harnesses.json");
    const entry: InstalledHarness = {
      name: "fake-pack",
      path: "/v1",
      version: "1.0.0",
      source: "git",
      spec: "ryaneggz/mifune",
      manifest: fakeManifest(),
    };
    addInstalled(entry, path);
    addInstalled({ ...entry, version: "2.0.0", path: "/v2" }, path);
    const parsed = readHarnessRegistry(path);
    expect(parsed.installed).toHaveLength(1);
    expect(parsed.installed[0].version).toBe("2.0.0");
    rmSync(tmp, { recursive: true, force: true });
  });

  it("removeInstalled deletes by name and returns the removed entry", () => {
    const tmp = makeTempDir();
    const path = join(tmp, "harnesses.json");
    const entry: InstalledHarness = {
      name: "fake-pack",
      path: "/x",
      version: "1.0.0",
      source: "local",
      spec: "/x",
      manifest: fakeManifest(),
    };
    addInstalled(entry, path);
    const removed = removeInstalled("fake-pack", path);
    expect(removed?.name).toBe("fake-pack");
    expect(readHarnessRegistry(path).installed).toEqual([]);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("removeInstalled returns null when the pack is absent", () => {
    const tmp = makeTempDir();
    const path = join(tmp, "harnesses.json");
    writeHarnessRegistry({ installed: [] }, path);
    expect(removeInstalled("never", path)).toBeNull();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("parseHarnessRegistry upgrades pre-T5 entries (no source/spec)", () => {
    const json = JSON.stringify({
      installed: [
        {
          name: "old",
          path: "/p",
          version: "0.1.0",
          manifest: fakeManifest(),
        },
      ],
    });
    const r = parseHarnessRegistry(json);
    expect(r.installed[0].source).toBe("local");
    expect(r.installed[0].spec).toBe("/p");
  });
});

// ─── installPack / uninstallPack ────────────────────────────────────────────

describe("installPack (local mode)", () => {
  it("registers a local pack with valid harness.json", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "fake-pack");
    writeManifest(packDir, fakeManifest({ name: "test-pack", agents: ["pi"] }));
    // Stub install_hook + entrypoint_hook so they exist
    writeFileSync(join(packDir, "install-hook.sh"), "#!/bin/sh\nexit 0\n");
    writeFileSync(join(packDir, "entrypoint-hook.sh"), "#!/bin/sh\nexit 0\n");

    const registryPath = join(tmp, "harnesses.json");
    const binDir = join(tmp, "bin");
    mkdirSync(binDir);

    const env: PackEnv = {
      exec: () => undefined, // pretend install_hook runs cleanly
      capture: () => "",
      registryPath,
      entrypointBinDir: binDir,
    };

    const result = await installPack(packDir, env);
    expect(result.entry.name).toBe("test-pack");
    expect(result.entry.source).toBe("local");

    const registry = readHarnessRegistry(registryPath);
    expect(registry.installed).toHaveLength(1);

    // Verify entrypoint hook was symlinked
    expect(existsSync(join(binDir, "test-pack-entrypoint-hook.sh"))).toBe(true);

    rmSync(tmp, { recursive: true, force: true });
  });

  it("warns when install_hook is missing but still registers the pack", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "fake-pack");
    writeManifest(packDir, fakeManifest({ name: "no-hook" }));
    // Deliberately omit install-hook.sh

    const registryPath = join(tmp, "harnesses.json");
    const env: PackEnv = {
      exec: () => undefined,
      capture: () => "",
      registryPath,
      entrypointBinDir: join(tmp, "bin"),
    };

    const result = await installPack(packDir, env);
    expect(result.entry.name).toBe("no-hook");
    expect(result.warnings.some((w) => w.includes("install_hook"))).toBe(true);

    rmSync(tmp, { recursive: true, force: true });
  });

  it("uninstallPack removes the registry entry and the entrypoint symlink", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "fake-pack");
    writeManifest(packDir, fakeManifest({ name: "uninstall-me" }));
    writeFileSync(join(packDir, "install-hook.sh"), "#!/bin/sh\nexit 0\n");
    writeFileSync(join(packDir, "entrypoint-hook.sh"), "#!/bin/sh\nexit 0\n");

    const registryPath = join(tmp, "harnesses.json");
    const binDir = join(tmp, "bin");
    mkdirSync(binDir);

    const env: PackEnv = {
      exec: () => undefined,
      capture: () => "",
      registryPath,
      entrypointBinDir: binDir,
    };

    await installPack(packDir, env);
    expect(existsSync(join(binDir, "uninstall-me-entrypoint-hook.sh"))).toBe(true);

    const result = await uninstallPack("uninstall-me", env);
    expect(result.removed?.name).toBe("uninstall-me");
    expect(readHarnessRegistry(registryPath).installed).toEqual([]);
    expect(existsSync(join(binDir, "uninstall-me-entrypoint-hook.sh"))).toBe(false);

    rmSync(tmp, { recursive: true, force: true });
  });

  it("uninstallPack on absent name returns removed=null", async () => {
    const tmp = makeTempDir();
    const env: PackEnv = {
      exec: () => undefined,
      capture: () => "",
      registryPath: join(tmp, "harnesses.json"),
      entrypointBinDir: join(tmp, "bin"),
    };
    const result = await uninstallPack("never", env);
    expect(result.removed).toBeNull();
    rmSync(tmp, { recursive: true, force: true });
  });

  it("throws on a pack directory with no harness.json or package.json#harness", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "empty");
    mkdirSync(packDir);
    const env: PackEnv = {
      exec: () => undefined,
      capture: () => "",
      registryPath: join(tmp, "harnesses.json"),
    };
    await expect(installPack(packDir, env)).rejects.toThrow(/harness\.json/);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("reads manifest from package.json#harness when harness.json is absent", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "npm-style");
    mkdirSync(packDir);
    const manifest = fakeManifest({ name: "npm-style-pack" });
    writeFileSync(
      join(packDir, "package.json"),
      JSON.stringify({ name: "@scope/npm-style-pack", harness: manifest }),
    );
    writeFileSync(join(packDir, "install-hook.sh"), "#!/bin/sh\nexit 0\n");
    writeFileSync(join(packDir, "entrypoint-hook.sh"), "#!/bin/sh\nexit 0\n");

    const registryPath = join(tmp, "harnesses.json");
    const env: PackEnv = {
      exec: () => undefined,
      capture: () => "",
      registryPath,
      entrypointBinDir: join(tmp, "bin"),
    };
    mkdirSync(join(tmp, "bin"));

    const result = await installPack(packDir, env);
    expect(result.entry.name).toBe("npm-style-pack");

    rmSync(tmp, { recursive: true, force: true });
  });
});
