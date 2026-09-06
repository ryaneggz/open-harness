import { afterEach, describe, expect, it } from "vitest";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  CompatConflictError,
  GENERATIONS,
  aliasConflictWarning,
  compareTrees,
  discoverUserState,
  resolveAliasedEnv,
  resolveConfigFile,
  resolveControlDir,
  resolveSeedSource,
  resolveUserStateHome,
  type PairResolution,
} from "../compat.js";
import { loadVectors, materializeFixture } from "./fixtures/compat-fixture.js";

const cleanups: string[] = [];
afterEach(() => {
  while (cleanups.length > 0) rmSync(cleanups.pop()!, { recursive: true, force: true });
});

function fixture(spec: Parameters<typeof materializeFixture>[0]): string {
  const root = materializeFixture(spec);
  cleanups.push(root);
  return root;
}

const vectors = loadVectors();

describe("compat vectors (TypeScript)", () => {
  for (const vector of vectors) {
    it(vector.id, () => {
      if (vector.kind === "control-dir" || vector.kind === "config-file") {
        const root = fixture(vector.fixture);
        const run = (): PairResolution =>
          vector.kind === "control-dir" ? resolveControlDir(root) : resolveConfigFile(root);
        if (vector.expect.conflict) {
          let caught: unknown;
          try {
            run();
          } catch (error) {
            caught = error;
          }
          expect(caught).toBeInstanceOf(CompatConflictError);
          const conflict = caught as CompatConflictError;
          for (const fragment of vector.expect.differences ?? []) {
            expect(conflict.differences.join("\n")).toContain(fragment);
          }
          expect(conflict.message).toContain("both exist and differ");
          return;
        }
        const resolved = run();
        expect(resolved.kind).toBe(vector.expect.kind);
        expect(resolved.generation ?? null).toBe(vector.expect.generation ?? null);
        expect(resolved.path ?? null).toBe(
          vector.expect.path === null || vector.expect.path === undefined
            ? null
            : join(root, vector.expect.path),
        );
        return;
      }
      if (vector.kind === "env") {
        const resolved = resolveAliasedEnv(vector.env, vector.suffix);
        expect(resolved.value ?? null).toBe(vector.expect.value);
        expect(resolved.source).toBe(vector.expect.source);
        expect(resolved.conflict).toBe(vector.expect.conflict);
        const warning = aliasConflictWarning(resolved);
        if (vector.expect.conflict) {
          expect(warning).toContain(`AGRO_${vector.suffix}`);
          expect(warning).toContain(`OH_${vector.suffix}`);
          for (const value of Object.values(vector.env)) expect(warning).not.toContain(value);
        } else {
          expect(warning).toBeUndefined();
        }
        return;
      }
      if (vector.kind !== "seed") throw new Error(`unknown vector kind for ${vector.id}`);
      const prefix = fixture(vector.fixture);
      const warnings: string[] = [];
      const path = resolveSeedSource(vector.env, prefix, (m) => warnings.push(m));
      const expected = vector.expect.path.startsWith("/opt/")
        ? `${prefix}${vector.expect.path}`
        : vector.expect.path;
      expect(path).toBe(expected);
      expect(warnings.length > 0).toBe(vector.expect.conflict === true);
    });
  }
});

describe("compareTrees", () => {
  it("returns no differences for two identical nested trees and lists every divergence otherwise", () => {
    const root = fixture({
      "a/x.txt": "x\n",
      "a/sub/y.sh": { content: "y\n", mode: "755" },
      "a/ln": { symlink: "x.txt" },
      "b/x.txt": "x\n",
      "b/sub/y.sh": { content: "y\n", mode: "755" },
      "b/ln": { symlink: "x.txt" },
    });
    expect(compareTrees(join(root, "a"), join(root, "b"))).toEqual([]);

    writeFileSync(join(root, "b/sub/y.sh"), "changed\n");
    writeFileSync(join(root, "b/extra"), "e\n");
    const diffs = compareTrees(join(root, "a"), join(root, "b"));
    expect(diffs).toContain("sub/y.sh: content differs");
    expect(diffs.some((d) => d.startsWith("extra: only in "))).toBe(true);
  });
});

describe("resolveUserStateHome", () => {
  it("keeps the legacy default when no AGRO-era state exists", () => {
    const home = fixture({});
    expect(resolveUserStateHome({}, home)).toBe(join(home, GENERATIONS.legacy.userStateDir));
  });

  it("keeps ~/.oh when only the legacy registry exists", () => {
    const home = fixture({ ".oh/sandboxes/one/oh.json": "{}\n" });
    expect(resolveUserStateHome({}, home)).toBe(join(home, ".oh"));
  });

  it("selects ~/.agro only when it is the sole registry", () => {
    const home = fixture({ ".agro/sandboxes/one/agro.json": "{}\n" });
    expect(resolveUserStateHome({}, home)).toBe(join(home, ".agro"));
  });

  it("selects ~/.agro when both registries exist and are byte-identical", () => {
    const home = fixture({
      ".oh/sandboxes/one/oh.json": "{}\n",
      ".agro/sandboxes/one/oh.json": "{}\n",
    });
    expect(resolveUserStateHome({}, home)).toBe(join(home, ".agro"));
  });

  it("fails closed when both registries exist and differ", () => {
    const home = fixture({
      ".oh/sandboxes/one/oh.json": "{\"name\":\"one\"}\n",
      ".agro/sandboxes/one/oh.json": "{\"name\":\"other\"}\n",
    });
    expect(() => resolveUserStateHome({}, home)).toThrow(CompatConflictError);
  });

  it("honors AGRO_HOME over OH_HOME and warns without printing values", () => {
    const home = fixture({});
    const warnings: string[] = [];
    const resolved = resolveUserStateHome(
      { AGRO_HOME: "/tmp/agro-home", OH_HOME: "/tmp/legacy-home" },
      home,
      (m) => warnings.push(m),
    );
    expect(resolved).toBe("/tmp/agro-home");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("AGRO_HOME");
    expect(warnings[0]).not.toContain("/tmp/agro-home");
  });

  it("treats an empty OH_HOME as unset, matching the pre-existing registry semantics", () => {
    const home = fixture({});
    expect(resolveUserStateHome({ OH_HOME: "" }, home)).toBe(join(home, ".oh"));
  });

  it("ignores ~/.openharness entirely — a legacy checkout is never registry state", () => {
    const home = fixture({ ".openharness/.oh/README.md": "checkout\n", ".openharness/oh.json": "{}\n" });
    expect(resolveUserStateHome({}, home)).toBe(join(home, ".oh"));
    const discovered = discoverUserState(home);
    expect(discovered.legacyCheckout.exists).toBe(true);
    expect(discovered.legacyHome.exists).toBe(false);
    expect(discovered.agroHome.exists).toBe(false);
  });
});

describe("nested control directories", () => {
  it("resolves each root independently — an inner .agro/ under an outer .oh/ is agro-only at the inner root", () => {
    const outer = fixture({ ".oh/README.md": "outer\n" });
    const inner = join(outer, "vendored", "child");
    mkdirSync(join(inner, ".agro"), { recursive: true });
    expect(resolveControlDir(outer).kind).toBe("legacy-only");
    expect(resolveControlDir(inner).kind).toBe("agro-only");
  });
});
