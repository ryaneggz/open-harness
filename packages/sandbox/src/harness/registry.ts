/**
 * Harness-pack registry — read/write helpers for `.openharness/harnesses.json`.
 *
 * The registry is the on-disk source of truth for which harness packs are
 * installed in a sandbox. Each entry records the pack name, the absolute
 * path to its installed location, the version, the source mode ("npm" /
 * "git" / "local"), and a snapshot of its parsed manifest.
 *
 * The reader half is consumed by the onboard step loader to discover
 * pack-contributed onboarding steps. The writer half is consumed by
 * `oh harness add|remove` to install and uninstall packs.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { HarnessPack } from "../onboard/types.js";

/** Default location, relative to the project root. */
export const HARNESS_REGISTRY_PATH = ".openharness/harnesses.json";

export type SourceMode = "npm" | "git" | "local";

export interface InstalledHarness {
  name: string;
  /** Absolute path to the pack directory on disk. */
  path: string;
  version: string;
  /** How the pack was installed — drives the uninstall path. */
  source: SourceMode;
  /** Original spec the user passed (`@scope/pkg`, `owner/repo`, `./path`). */
  spec: string;
  /** Parsed `harness.json` for the pack. */
  manifest: HarnessPack;
}

export interface HarnessRegistry {
  installed: InstalledHarness[];
}

const EMPTY: HarnessRegistry = { installed: [] };

/**
 * Read and parse `.openharness/harnesses.json`. Returns an empty registry
 * (`{ installed: [] }`) when the file is missing or unparseable, so callers
 * never have to handle null. Callers that need to distinguish "missing" from
 * "empty" can stat the path themselves first.
 */
export function readHarnessRegistry(path: string = HARNESS_REGISTRY_PATH): HarnessRegistry {
  if (!existsSync(path)) return { installed: [] };
  let raw: string;
  try {
    raw = readFileSync(path, "utf-8");
  } catch {
    return { installed: [] };
  }
  return parseHarnessRegistry(raw);
}

/**
 * Parse a registry JSON string. Defensive: non-array `installed` is coerced
 * to `[]`, and individual entries missing required fields are dropped.
 *
 * Older registry formats (without `source` or `spec` fields) are upgraded
 * in-place: missing `source` defaults to `"local"`, missing `spec` defaults
 * to the path. This is forward-compatible with the T4-era registry shape.
 */
export function parseHarnessRegistry(raw: string): HarnessRegistry {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { installed: [] };
  }
  if (!parsed || typeof parsed !== "object") return { installed: [] };
  const obj = parsed as { installed?: unknown };
  if (!Array.isArray(obj.installed)) return { installed: [] };

  const installed: InstalledHarness[] = [];
  for (const entry of obj.installed) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Partial<InstalledHarness>;
    if (
      typeof e.name === "string" &&
      typeof e.path === "string" &&
      typeof e.version === "string" &&
      e.manifest &&
      typeof e.manifest === "object"
    ) {
      installed.push({
        name: e.name,
        path: e.path,
        version: e.version,
        source: isSourceMode(e.source) ? e.source : "local",
        spec: typeof e.spec === "string" ? e.spec : e.path,
        manifest: e.manifest as HarnessPack,
      });
    }
  }
  return { installed };
}

function isSourceMode(v: unknown): v is SourceMode {
  return v === "npm" || v === "git" || v === "local";
}

/**
 * Write the registry to disk atomically (write-then-rename via Node's
 * synchronous writeFile). Creates the parent directory if missing.
 */
export function writeHarnessRegistry(
  registry: HarnessRegistry,
  path: string = HARNESS_REGISTRY_PATH,
): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(registry, null, 2) + "\n", "utf-8");
}

/**
 * Append (or replace) an entry in the registry. Re-installing a pack with
 * the same `name` updates the existing entry rather than duplicating it.
 */
export function addInstalled(
  entry: InstalledHarness,
  path: string = HARNESS_REGISTRY_PATH,
): HarnessRegistry {
  const registry = readHarnessRegistry(path);
  const others = registry.installed.filter((p) => p.name !== entry.name);
  const next: HarnessRegistry = { installed: [...others, entry] };
  writeHarnessRegistry(next, path);
  return next;
}

/**
 * Remove an entry by name. No-op when the pack is not registered. Returns
 * the entry that was removed (or null) so callers can drive the uninstall
 * path off the recorded source mode.
 */
export function removeInstalled(
  name: string,
  path: string = HARNESS_REGISTRY_PATH,
): InstalledHarness | null {
  const registry = readHarnessRegistry(path);
  const entry = registry.installed.find((p) => p.name === name) ?? null;
  if (!entry) return null;
  const next: HarnessRegistry = { installed: registry.installed.filter((p) => p.name !== name) };
  writeHarnessRegistry(next, path);
  return entry;
}

export { EMPTY as EMPTY_HARNESS_REGISTRY };
