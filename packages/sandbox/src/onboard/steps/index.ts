import { resolve as resolvePath } from "node:path";
import { pathToFileURL } from "node:url";
import { claudeStep } from "./claude.js";
import { cloudflareStep } from "./cloudflare.js";
import { githubStep } from "./github.js";
import { llmStep } from "./llm.js";
import { sshStep } from "./ssh.js";
import {
  HARNESS_REGISTRY_PATH,
  readHarnessRegistry,
  type InstalledHarness,
} from "../../harness/registry.js";
import type { PackStep, Step, StepId } from "../types.js";

/**
 * Execution order: llm → github → ssh → cloudflare → claude.
 *
 * GitHub runs second (right after LLM) so that its credentials are in place
 * before anything else, and — crucially — before SSH. `gh auth login` can
 * generate and upload an SSH key itself, which lets the ssh step fast-path
 * in the common case. See .claude/specs/onboard-github-before-ssh.md.
 *
 * Pack-contributed steps (e.g. the `slack` step from `@ryaneggz/mifune`)
 * are loaded via `loadPackSteps()` and merged into the execution order at
 * runtime based on each pack's `onboard_steps[].after` declaration.
 */
export const ALL_STEPS: readonly Step[] = [
  llmStep,
  githubStep,
  sshStep,
  cloudflareStep,
  claudeStep,
] as const;

export { llmStep, sshStep, githubStep, cloudflareStep, claudeStep };

/**
 * Optional injection point for `loadPackSteps` — tests can replace the module
 * loader to avoid touching the disk. Production passes `import(specifier)`.
 */
export type PackStepImporter = (specifier: string) => Promise<unknown>;

export interface LoadPackStepsOptions {
  /** Path to `.openharness/harnesses.json`. Defaults to {@link HARNESS_REGISTRY_PATH}. */
  registryPath?: string;
  /** Override the dynamic-import used to load step modules. Mostly for tests. */
  importer?: PackStepImporter;
}

/**
 * Load all onboard steps contributed by installed harness packs. Returns
 * `[]` when the registry is missing or empty. Each pack's
 * `onboard_steps[]` entry is resolved against the pack directory and
 * dynamic-imported; the imported module must expose either a `Step`-shaped
 * default export or a single named export matching `<id>Step` (e.g.
 * `slackStep` for id `"slack"`).
 */
export async function loadPackSteps(opts: LoadPackStepsOptions = {}): Promise<Step[]> {
  const registry = readHarnessRegistry(opts.registryPath ?? HARNESS_REGISTRY_PATH);
  if (registry.installed.length === 0) return [];

  const importer: PackStepImporter = opts.importer ?? ((s) => import(s));
  const steps: Step[] = [];
  for (const pack of registry.installed) {
    const packSteps = pack.manifest.onboard_steps;
    if (!Array.isArray(packSteps)) continue;
    for (const ps of packSteps) {
      const step = await loadOneStep(pack, ps, importer);
      if (step) steps.push(step);
    }
  }
  return steps;
}

async function loadOneStep(
  pack: InstalledHarness,
  ps: PackStep,
  importer: PackStepImporter,
): Promise<Step | null> {
  if (!ps || typeof ps.id !== "string" || typeof ps.file !== "string") return null;
  const abs = resolvePath(pack.path, ps.file);
  const specifier = pathToFileURL(abs).href;
  let mod: unknown;
  try {
    mod = await importer(specifier);
  } catch {
    return null;
  }
  const exported = pickStepExport(mod, ps.id);
  if (!exported) return null;
  // Stamp the registered id onto the resolved step. The pack-supplied id is
  // authoritative — the inner module's id field is treated as a hint only.
  return { ...exported, id: exported.id ?? (ps.id as StepId) };
}

function pickStepExport(mod: unknown, id: string): Step | null {
  if (!mod || typeof mod !== "object") return null;
  const m = mod as Record<string, unknown>;
  // Common patterns, in priority order:
  //   1. default export (ESM `export default`)
  //   2. named export `<id>Step` (matches the convention used in core)
  //   3. named export `step`
  const candidates = [m.default, m[`${id}Step`], m.step];
  for (const c of candidates) {
    if (isStepShape(c)) return c;
  }
  return null;
}

function isStepShape(v: unknown): v is Step {
  if (!v || typeof v !== "object") return false;
  const s = v as Partial<Step>;
  return typeof s.label === "string" && typeof s.run === "function";
}

/**
 * Topologically order steps using {@link PackStep.after}. Steps without an
 * `after` constraint preserve the input order (so core ordering — llm,
 * github, slack, … — is stable). Cycles or unresolved `after` references
 * fall back to insertion order for the offending step. Note: only pack
 * steps carry `after` metadata at the moment, but this helper accepts a
 * parallel `after` map so the same logic can be reused once core steps
 * grow explicit dependencies.
 */
export function orderSteps(
  steps: readonly Step[],
  afterById: Readonly<Record<string, string | undefined>> = {},
): Step[] {
  const remaining = new Map<string, Step>();
  for (const s of steps) remaining.set(s.id, s);

  const out: Step[] = [];
  const placed = new Set<string>();
  // Keep iterating while we make progress; bail out if a pass adds nothing.
  while (remaining.size > 0) {
    let progressed = false;
    for (const s of steps) {
      if (placed.has(s.id) || !remaining.has(s.id)) continue;
      const dep = afterById[s.id];
      if (!dep || placed.has(dep) || !remaining.has(dep)) {
        out.push(s);
        placed.add(s.id);
        remaining.delete(s.id);
        progressed = true;
      }
    }
    if (!progressed) {
      // Cycle or unsatisfiable dependency — flush the rest in insertion order.
      for (const s of steps) {
        if (!placed.has(s.id) && remaining.has(s.id)) {
          out.push(s);
          placed.add(s.id);
          remaining.delete(s.id);
        }
      }
      break;
    }
  }
  return out;
}

/**
 * Return the merged ordered list of core steps plus any steps contributed by
 * installed harness packs. Used by the onboard CLI entrypoint so that pack
 * authors can extend onboarding without forking the core package.
 */
export async function getAllSteps(opts: LoadPackStepsOptions = {}): Promise<Step[]> {
  const packSteps = await loadPackSteps(opts);
  if (packSteps.length === 0) return [...ALL_STEPS];

  // Build the after-map keyed by step id. We only know `after` for pack
  // steps right now; core steps default to undefined (no constraint).
  const afterById: Record<string, string | undefined> = {};
  const registry = readHarnessRegistry(opts.registryPath ?? HARNESS_REGISTRY_PATH);
  for (const pack of registry.installed) {
    for (const ps of pack.manifest.onboard_steps ?? []) {
      if (ps && typeof ps.id === "string") afterById[ps.id] = ps.after;
    }
  }
  return orderSteps([...ALL_STEPS, ...packSteps], afterById);
}
