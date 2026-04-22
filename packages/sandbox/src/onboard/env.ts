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
 * Upsert a set of KEY=VALUE pairs into `.env`.
 *
 * For each key, any existing uncommented `KEY=…` line is **commented out in
 * place** (prefixed with `# `) and the new value is inserted on the line
 * directly after the last such occurrence. Keys with no existing match are
 * appended at the end.
 *
 * Rationale: onboarding often runs against a `.devcontainer/.env` that the
 * user has pre-populated with defaults. Stripping the old line hides the
 * fact that the value changed; leaving it commented preserves diff context
 * and makes reverts obvious. Already-commented lines are left untouched.
 *
 * Creates the file if it doesn't exist. Returns the new file contents.
 */
export function upsertEnvFile(
  fs: FsDeps,
  envPath: string,
  updates: Record<string, string>,
): string {
  const existing = fs.exists(envPath) ? fs.readFile(envPath) : "";
  const lines = existing.split("\n");
  while (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();

  const lastMatchIdx: Record<string, number> = {};
  const rewritten = lines.map((line, idx) => {
    const trimmed = line.trimStart();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const eq = line.indexOf("=");
    if (eq === -1) return line;
    const key = line.slice(0, eq).trim();
    if (Object.prototype.hasOwnProperty.call(updates, key)) {
      lastMatchIdx[key] = idx;
      return `# ${line}`;
    }
    return line;
  });

  const insertionsAt: Record<number, string[]> = {};
  const unmatched = new Set(Object.keys(updates));
  for (const [key, idx] of Object.entries(lastMatchIdx)) {
    (insertionsAt[idx] ||= []).push(`${key}=${updates[key]}`);
    unmatched.delete(key);
  }

  const out: string[] = [];
  for (let i = 0; i < rewritten.length; i++) {
    out.push(rewritten[i]);
    if (insertionsAt[i]) out.push(...insertionsAt[i]);
  }
  for (const key of unmatched) {
    out.push(`${key}=${updates[key]}`);
  }

  const next = out.join("\n") + "\n";
  fs.writeFile(envPath, next);
  return next;
}
