/**
 * Harness pack installer + uninstaller.
 *
 * A "harness pack" is a directory (or installable package) that contributes
 * onboarding steps, compose overlays, workspace seeds, and runtime hooks
 * to an openharness sandbox. Packs are consumable from three source modes:
 *
 *   - `npm`   — published npm package (`@scope/name` or plain `name`).
 *               Installed via `npm install -g`. Pack lives at
 *               `$(npm root -g)/<package>/`.
 *
 *   - `git`   — git repo. `<owner>/<repo>` resolves against GitHub;
 *               `https://`, `git@`, or `ssh://` URLs go as-is. Cloned to
 *               `~/openharness/harnesses/<name>/`.
 *
 *   - `local` — already-on-disk directory (`./path` or absolute path).
 *               Recorded by absolute path; not copied.
 *
 * After source resolution, every pack follows the same install pipeline:
 *   1. Validate `harness.json` against the schema.
 *   2. Append compose overlays to `.openharness/config.json`.
 *   3. Run `install_hook` (e.g., `npm install -g <agent-cli>`).
 *   4. Symlink `entrypoint_hook` into `/usr/local/bin/<name>-entrypoint-hook.sh`.
 *   5. Register the pack in `.openharness/harnesses.json`.
 *
 * Side effects (npm/git/exec, fs writes outside the registry) are routed
 * through the {@link PackEnv} injection bag so unit tests can swap fakes.
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve as resolvePath } from "node:path";
import type { HarnessPack } from "../onboard/types.js";
import {
  addInstalled,
  HARNESS_REGISTRY_PATH,
  readHarnessRegistry,
  removeInstalled,
  type InstalledHarness,
  type SourceMode,
} from "./registry.js";

// ─── Source resolution ──────────────────────────────────────────────────────

export interface ResolvedSource {
  mode: SourceMode;
  spec: string;
  /** Source-specific identifier:
   *  - npm: package name (e.g. `@ryaneggz/mifune`)
   *  - git: clone URL (e.g. `https://github.com/ryaneggz/mifune.git`)
   *  - local: absolute path
   */
  identifier: string;
}

/**
 * Classify a `oh harness add <spec>` argument into one of the three source
 * modes. Pure function — no side effects.
 *
 * Heuristics:
 *   - Starts with `@`            → npm scoped package.
 *   - Starts with `./` or `/`    → local path.
 *   - Contains `://` or `git@`   → git URL.
 *   - Plain `<owner>/<repo>` shape (one slash, no spaces) → GitHub git.
 *   - Otherwise (single token, no slash) → npm unscoped package.
 */
export function resolveSpec(spec: string): ResolvedSource {
  const s = spec.trim();
  if (s.length === 0) throw new Error("Empty harness pack spec");

  if (s.startsWith("@")) {
    return { mode: "npm", spec: s, identifier: s };
  }
  if (s.startsWith("./") || s.startsWith("../") || s.startsWith("/") || isAbsolute(s)) {
    return { mode: "local", spec: s, identifier: resolvePath(s) };
  }
  if (s.includes("://") || s.startsWith("git@")) {
    return { mode: "git", spec: s, identifier: s };
  }
  // owner/repo shape: exactly one slash, no whitespace, no protocol
  const parts = s.split("/");
  if (parts.length === 2 && parts.every((p) => p.length > 0 && !/\s/.test(p))) {
    return {
      mode: "git",
      spec: s,
      identifier: `https://github.com/${parts[0]}/${parts[1]}.git`,
    };
  }
  // Bare package name, no scope, no slash
  return { mode: "npm", spec: s, identifier: s };
}

// ─── Manifest validation ────────────────────────────────────────────────────

const REQUIRED_KEYS: ReadonlyArray<keyof HarnessPack> = [
  "name",
  "version",
  "description",
  "openharness",
  "agents",
  "compose_overlays",
  "onboard_steps",
  "install_hook",
  "entrypoint_hook",
  "workspace_seed",
];

/**
 * Parse + validate a `harness.json` (or its package.json `harness` key).
 * Returns the parsed manifest on success, `null` on any structural failure.
 * Callers that want a thrown error can wrap with {@link assertManifest}.
 */
export function validateManifest(input: unknown): HarnessPack | null {
  if (!input || typeof input !== "object") return null;
  const obj = input as Record<string, unknown>;
  for (const key of REQUIRED_KEYS) {
    if (!(key in obj)) return null;
  }
  if (typeof obj.name !== "string") return null;
  if (typeof obj.version !== "string") return null;
  if (typeof obj.description !== "string") return null;
  if (typeof obj.openharness !== "string") return null;
  if (!Array.isArray(obj.agents)) return null;
  if (!Array.isArray(obj.compose_overlays)) return null;
  if (!Array.isArray(obj.onboard_steps)) return null;
  if (typeof obj.install_hook !== "string") return null;
  if (typeof obj.entrypoint_hook !== "string") return null;
  if (typeof obj.workspace_seed !== "string") return null;
  return obj as unknown as HarnessPack;
}

export function assertManifest(input: unknown): HarnessPack {
  const m = validateManifest(input);
  if (!m) throw new Error("Invalid harness.json — missing required fields");
  return m;
}

/**
 * Read `harness.json` from a pack directory, falling back to the
 * `harness` key inside `package.json` (the npm packaging shape).
 */
export function readManifest(packDir: string): HarnessPack {
  const harnessJson = join(packDir, "harness.json");
  if (existsSync(harnessJson)) {
    return assertManifest(JSON.parse(readFileSync(harnessJson, "utf-8")));
  }
  const pkgJson = join(packDir, "package.json");
  if (existsSync(pkgJson)) {
    const pkg = JSON.parse(readFileSync(pkgJson, "utf-8")) as Record<string, unknown>;
    if (pkg.harness) return assertManifest(pkg.harness);
  }
  throw new Error(`No harness.json found in ${packDir}`);
}

// ─── Install / uninstall pipeline ───────────────────────────────────────────

export interface PackEnv {
  /** Run a shell command. Throws on non-zero exit. */
  exec(cmd: string[], opts?: { cwd?: string }): void;
  /** Capture stdout of a command (utf-8). Throws on non-zero exit. */
  capture(cmd: string[], opts?: { cwd?: string }): string;
  /** Optional override for the registry path (tests). */
  registryPath?: string;
  /** Override for the harness install root. Defaults to ~/openharness/harnesses. */
  harnessRoot?: string;
  /** Override for npm's global root. Defaults to `npm root -g`. */
  npmGlobalRoot?: string;
  /** Override for the entrypoint hook bin dir. Defaults to /usr/local/bin. */
  entrypointBinDir?: string;
}

export const realPackEnv: PackEnv = {
  exec(cmd, opts) {
    execSync(cmd.join(" "), { stdio: "inherit", cwd: opts?.cwd });
  },
  capture(cmd, opts) {
    return execSync(cmd.join(" "), { encoding: "utf-8", cwd: opts?.cwd }).toString();
  },
};

export interface InstallResult {
  entry: InstalledHarness;
  warnings: string[];
}

/**
 * Install a harness pack from a source spec. Idempotent — re-installing
 * the same pack updates the registry entry rather than duplicating it.
 */
export async function installPack(
  spec: string,
  env: PackEnv = realPackEnv,
): Promise<InstallResult> {
  const source = resolveSpec(spec);
  const warnings: string[] = [];

  const packDir = await fetchPackDir(source, env);
  const manifest = readManifest(packDir);

  registerComposeOverlays(packDir, manifest, warnings);
  runInstallHook(packDir, manifest, env, warnings);
  installEntrypointHook(packDir, manifest, env, warnings);

  const entry: InstalledHarness = {
    name: manifest.name,
    path: packDir,
    version: manifest.version,
    source: source.mode,
    spec: source.spec,
    manifest,
  };
  addInstalled(entry, env.registryPath ?? HARNESS_REGISTRY_PATH);

  return { entry, warnings };
}

/**
 * Uninstall a harness pack by name. Reverses install side effects in
 * the inverse order. Idempotent: removing an already-absent pack is a
 * no-op (returns null).
 */
export async function uninstallPack(
  name: string,
  env: PackEnv = realPackEnv,
): Promise<{ removed: InstalledHarness | null; warnings: string[] }> {
  const warnings: string[] = [];
  const registry = readHarnessRegistry(env.registryPath ?? HARNESS_REGISTRY_PATH);
  const entry = registry.installed.find((p) => p.name === name) ?? null;
  if (!entry) return { removed: null, warnings };

  uninstallEntrypointHook(entry, env, warnings);
  unregisterComposeOverlays(entry, warnings);

  if (entry.source === "npm") {
    try {
      env.exec(["npm", "uninstall", "-g", entry.spec]);
    } catch (err) {
      warnings.push(`npm uninstall failed: ${(err as Error).message}`);
    }
  }
  // git/local: leave the on-disk dir alone (user may have other work in it).

  const removed = removeInstalled(name, env.registryPath ?? HARNESS_REGISTRY_PATH);
  return { removed, warnings };
}

// ─── Source-mode-specific fetchers ──────────────────────────────────────────

async function fetchPackDir(source: ResolvedSource, env: PackEnv): Promise<string> {
  switch (source.mode) {
    case "npm":
      return fetchNpmPack(source.identifier, env);
    case "git":
      return fetchGitPack(source.spec, source.identifier, env);
    case "local":
      return fetchLocalPack(source.identifier);
  }
}

function fetchNpmPack(pkgName: string, env: PackEnv): string {
  env.exec(["npm", "install", "-g", pkgName]);
  const root = env.npmGlobalRoot ?? env.capture(["npm", "root", "-g"]).trim();
  const dir = join(root, pkgName);
  if (!existsSync(dir)) {
    throw new Error(`npm install reported success but ${dir} does not exist`);
  }
  return dir;
}

function fetchGitPack(spec: string, cloneUrl: string, env: PackEnv): string {
  // Pack name from the URL: take the last segment, drop a trailing `.git`.
  const last = cloneUrl.split("/").pop() ?? spec;
  const name = last.replace(/\.git$/, "");
  const root = env.harnessRoot ?? join(homedir(), "openharness", "harnesses");
  mkdirSync(root, { recursive: true });
  const dir = join(root, name);
  if (existsSync(dir)) {
    env.exec(["git", "-C", dir, "fetch", "--all", "--tags"]);
    env.exec(["git", "-C", dir, "reset", "--hard", "origin/HEAD"]);
  } else {
    env.exec(["git", "clone", cloneUrl, dir]);
  }
  return dir;
}

function fetchLocalPack(absPath: string): string {
  if (!existsSync(absPath)) {
    throw new Error(`Local pack path does not exist: ${absPath}`);
  }
  return absPath;
}

// ─── Side-effect steps (compose overlays, hooks) ────────────────────────────

const COMPOSE_CONFIG_PATH = ".openharness/config.json";

interface ComposeConfig {
  composeOverrides?: string[];
  [key: string]: unknown;
}

function readComposeConfig(): ComposeConfig {
  if (!existsSync(COMPOSE_CONFIG_PATH)) return {};
  try {
    return JSON.parse(readFileSync(COMPOSE_CONFIG_PATH, "utf-8")) as ComposeConfig;
  } catch {
    return {};
  }
}

function writeComposeConfig(cfg: ComposeConfig): void {
  mkdirSync(".openharness", { recursive: true });
  writeFileSync(COMPOSE_CONFIG_PATH, JSON.stringify(cfg, null, 2) + "\n", "utf-8");
}

function registerComposeOverlays(packDir: string, manifest: HarnessPack, warnings: string[]): void {
  if (manifest.compose_overlays.length === 0) return;
  const cfg = readComposeConfig();
  const overrides = new Set(cfg.composeOverrides ?? []);
  for (const rel of manifest.compose_overlays) {
    const abs = resolvePath(packDir, rel);
    if (!existsSync(abs)) {
      warnings.push(`compose overlay missing: ${abs}`);
      continue;
    }
    overrides.add(abs);
  }
  cfg.composeOverrides = [...overrides];
  writeComposeConfig(cfg);
}

function unregisterComposeOverlays(entry: InstalledHarness, warnings: string[]): void {
  const cfg = readComposeConfig();
  if (!cfg.composeOverrides) return;
  const before = cfg.composeOverrides.length;
  cfg.composeOverrides = cfg.composeOverrides.filter((p) => !p.startsWith(entry.path));
  if (cfg.composeOverrides.length !== before) writeComposeConfig(cfg);
  if (entry.manifest.compose_overlays.length > 0 && cfg.composeOverrides.length === before) {
    warnings.push(`no compose overlays were removed for pack '${entry.name}'`);
  }
}

function runInstallHook(
  packDir: string,
  manifest: HarnessPack,
  env: PackEnv,
  warnings: string[],
): void {
  const hook = join(packDir, manifest.install_hook);
  if (!existsSync(hook)) {
    warnings.push(`install_hook not found: ${manifest.install_hook}`);
    return;
  }
  try {
    env.exec(["bash", hook], { cwd: packDir });
  } catch (err) {
    warnings.push(`install_hook failed: ${(err as Error).message}`);
  }
}

function installEntrypointHook(
  packDir: string,
  manifest: HarnessPack,
  env: PackEnv,
  warnings: string[],
): void {
  const src = join(packDir, manifest.entrypoint_hook);
  if (!existsSync(src)) {
    warnings.push(`entrypoint_hook not found: ${manifest.entrypoint_hook}`);
    return;
  }
  const binDir = env.entrypointBinDir ?? "/usr/local/bin";
  const dst = join(binDir, `${manifest.name}-entrypoint-hook.sh`);
  try {
    if (existsSync(dst)) unlinkSync(dst);
    symlinkSync(src, dst);
  } catch (err) {
    warnings.push(`entrypoint_hook symlink failed: ${(err as Error).message}`);
  }
}

function uninstallEntrypointHook(entry: InstalledHarness, env: PackEnv, warnings: string[]): void {
  const binDir = env.entrypointBinDir ?? "/usr/local/bin";
  const dst = join(binDir, `${entry.name}-entrypoint-hook.sh`);
  if (!existsSync(dst)) return;
  try {
    unlinkSync(dst);
  } catch (err) {
    warnings.push(`entrypoint_hook removal failed: ${(err as Error).message}`);
  }
}
