/**
 * Host `.env` file helpers — read Slack tokens into process env and persist
 * user-provided tokens back to the host `.env` without leaving duplicates.
 *
 * Mirrors the bash script's `set -a && . .env` loading and the
 * `sed -i '/^KEY=/d' + echo KEY=val >> .env` upsert pattern.
 */

import type { FsDeps } from "./types.js";

/**
 * Parse a `.env` file. Returns a map of KEY → VALUE. Strips surrounding
 * single or double quotes. Ignores blank lines and lines beginning with `#`.
 * Preserves the last occurrence when the same key appears twice.
 */
export function parseEnvFile(contents: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of contents.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

/**
 * Load any keys from the host `.env` into {@link target} that aren't already
 * set there. Matches the bash behavior `set -a && . .env` but without the
 * shell subprocess.
 */
export function loadEnvInto(
  fs: FsDeps,
  envPath: string,
  target: Record<string, string | undefined>,
): void {
  if (!fs.exists(envPath)) return;
  const stat = fs.stat(envPath);
  if (!stat || stat.size === 0) return;
  const parsed = parseEnvFile(fs.readFile(envPath));
  for (const [k, v] of Object.entries(parsed)) {
    if (target[k] === undefined || target[k] === "") {
      target[k] = v;
    }
  }
}

/**
 * Upsert a set of KEY=VALUE pairs into `.env`, removing any prior lines for
 * those keys first. Creates the file if it doesn't exist. Returns the new
 * file contents.
 */
export function upsertEnvFile(
  fs: FsDeps,
  envPath: string,
  updates: Record<string, string>,
): string {
  const existing = fs.exists(envPath) ? fs.readFile(envPath) : "";
  const keys = new Set(Object.keys(updates));
  const kept = existing
    .split("\n")
    .filter((line) => {
      const eq = line.indexOf("=");
      if (eq === -1) return true;
      const key = line.slice(0, eq);
      return !keys.has(key);
    })
    .join("\n")
    .replace(/\n+$/, "");

  const appended = Object.entries(updates)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const next = [kept, appended].filter((s) => s.length > 0).join("\n") + "\n";
  fs.writeFile(envPath, next);
  return next;
}
