import { describe, expect, it } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAllSteps, loadPackSteps, orderSteps } from "../onboard/steps/index.js";
import type { Step, HarnessPack } from "../onboard/types.js";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "oh-pack-steps-"));
}

function writeRegistry(tmp: string, packs: Array<{ path: string; manifest: HarnessPack }>): string {
  const file = join(tmp, "harnesses.json");
  writeFileSync(
    file,
    JSON.stringify(
      {
        installed: packs.map((p) => ({
          name: p.manifest.name,
          path: p.path,
          version: p.manifest.version,
          manifest: p.manifest,
        })),
      },
      null,
      2,
    ),
  );
  return file;
}

function fakeManifest(over: Partial<HarnessPack> = {}): HarnessPack {
  return {
    name: "fake-pack",
    version: "0.0.0",
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

function makeFakeStep(id: string, label: string): Step {
  return {
    id: id as Step["id"],
    label,
    run: async () => ({ id: id as Step["id"], status: "skipped" as const }),
  };
}

describe("loadPackSteps", () => {
  it("returns [] when the registry file is missing", async () => {
    const steps = await loadPackSteps({
      registryPath: join(makeTempDir(), "does-not-exist.json"),
    });
    expect(steps).toEqual([]);
  });

  it("returns [] when the registry has no installed packs", async () => {
    const tmp = makeTempDir();
    const path = writeRegistry(tmp, []);
    try {
      const steps = await loadPackSteps({ registryPath: path });
      expect(steps).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("loads steps from a fake pack via the importer override", async () => {
    const tmp = makeTempDir();
    const packDir = join(tmp, "fake-pack");
    mkdirSync(packDir, { recursive: true });

    const manifest = fakeManifest({
      name: "fake-pack",
      onboard_steps: [{ id: "fake", file: "onboard-steps/fake.js" }],
    });
    const path = writeRegistry(tmp, [{ path: packDir, manifest }]);

    try {
      const fakeStep = makeFakeStep("fake", "Fake — test step");
      const steps = await loadPackSteps({
        registryPath: path,
        importer: async (specifier: string) => {
          expect(specifier).toContain("fake-pack");
          expect(specifier).toContain("onboard-steps/fake.js");
          return { fakeStep };
        },
      });
      expect(steps).toHaveLength(1);
      expect(steps[0].id).toBe("fake");
      expect(steps[0].label).toBe("Fake — test step");
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it("skips entries when the import throws", async () => {
    const tmp = makeTempDir();
    const path = writeRegistry(tmp, [
      {
        path: tmp,
        manifest: fakeManifest({
          onboard_steps: [{ id: "broken", file: "missing.js" }],
        }),
      },
    ]);
    try {
      const steps = await loadPackSteps({
        registryPath: path,
        importer: async () => {
          throw new Error("module not found");
        },
      });
      expect(steps).toEqual([]);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("orderSteps", () => {
  const a = makeFakeStep("llm", "a");
  const b = makeFakeStep("github", "b");
  const c = makeFakeStep("slack", "c");

  it("preserves insertion order when no `after` constraints exist", () => {
    const out = orderSteps([a, b, c], {});
    expect(out.map((s) => s.id)).toEqual(["llm", "github", "slack"]);
  });

  it("respects `after` constraints when satisfiable", () => {
    const out = orderSteps([a, b, c], { slack: "github" });
    expect(out.map((s) => s.id)).toEqual(["llm", "github", "slack"]);
  });

  it("flushes the rest in insertion order on a cycle", () => {
    const out = orderSteps([a, b, c], { llm: "github", github: "llm" });
    expect(out).toHaveLength(3);
  });
});

describe("getAllSteps", () => {
  it("returns the core steps unchanged when no packs are installed", async () => {
    const steps = await getAllSteps({
      registryPath: join(makeTempDir(), "missing.json"),
    });
    const ids = steps.map((s) => s.id);
    expect(ids).toContain("llm");
    expect(ids).toContain("github");
    expect(ids).toContain("slack");
    expect(ids).toContain("ssh");
    expect(ids).toContain("cloudflare");
    expect(ids).toContain("claude");
  });
});
