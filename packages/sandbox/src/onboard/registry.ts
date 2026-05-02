/**
 * Harness-pack registry — read/write helpers for `.openharness/harnesses.json`.
 *
 * The registry is the on-disk source of truth for which harness packs are
 * installed in this sandbox. Each entry records the pack name, the absolute
 * path to its directory, the version, and a snapshot of its parsed manifest.
 *
 * The PR that adds `oh harness add|remove` (T5) writes this file; this module
 * only provides reader/parser helpers used by the onboard step loader. Keep
 * the surface area minimal — anything more elaborate belongs alongside the
 * installer in `src/harness/`.
 */

import { existsSync, readFileSync } from "node:fs";
import type { HarnessPack } from "./types.js";

/** Default location, relative to the project root. */
export const HARNESS_REGISTRY_PATH = ".openharness/harnesses.json";

export interface InstalledHarness {
  name: string;
  /** Absolute path to the pack directory on disk. */
  path: string;
  version: string;
  /** Parsed `harness.json` for the pack. */
  manifest: HarnessPack;
}

export interface HarnessRegistry {
  installed: InstalledHarness[];
}

/**
 * Read and parse `.openharness/harnesses.json`. Returns an empty registry
 * (`{ installed: [] }`) when the file is missing or unparseable, so callers
 * never have to handle null. Callers that need to distinguish "missing" from
 * "empty" can stat the path themselves first.
 */
export function readHarnessRegistry(path: string = HARNESS_REGISTRY_PATH): HarnessRegistry {
  if (!existsSync(path)) {
    return { installed: [] };
  }
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
        manifest: e.manifest as HarnessPack,
      });
    }
  }
  return { installed };
}
