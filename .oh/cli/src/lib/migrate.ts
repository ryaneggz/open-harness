import {
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  type Stats,
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { compareTrees } from "./compat.js";

export const MIGRATION_PLAN_VERSION = 1;
export const RETIRED_SUFFIX = ".migrated";
export const LOCK_FILE = ".agro-migrate.lock";

export type MigrationKind = "dir" | "file";

export interface MigrationPair {
  legacy: string;
  agro: string;
  kind: MigrationKind;
}

export interface Replacement {
  from: string;
  to: string;
}

export interface RewriteSpec {
  path: string;
  replacements: Replacement[];
}

export interface MigrationSpec {
  root: string;
  pairs: MigrationPair[];
  rewrites?: RewriteSpec[];
}

export interface EntrySnapshot {
  type: "file" | "directory" | "symlink";
  mode: number;
  ino: number;
  mtimeMs: number;
  size: number;
}

export type PlanStep =
  | { kind: "rename"; from: string; to: string; snapshot: EntrySnapshot; createsParent: boolean }
  | { kind: "retire"; from: string; to: string; snapshot: EntrySnapshot }
  | { kind: "rewrite"; path: string; replacements: Replacement[]; snapshot: EntrySnapshot }
  | { kind: "noop"; path: string; reason: string };

export interface MigrationConflict {
  path: string;
  reason: string;
  differences?: string[];
}

export type PlanStatus = "ready" | "noop" | "conflict";

export interface MigrationPlan {
  version: typeof MIGRATION_PLAN_VERSION;
  root: string;
  status: PlanStatus;
  steps: PlanStep[];
  conflicts: MigrationConflict[];
}

export type StepOutcome = "done" | "skipped" | "failed" | "pending";

export type StepResult = PlanStep & { outcome: StepOutcome; error?: string };

export type ResultStatus = "applied" | "noop" | "refused" | "failed";

export interface MigrationResult {
  status: ResultStatus;
  root: string;
  reason?: string;
  steps: StepResult[];
}

function snapshot(path: string): EntrySnapshot | undefined {
  const stats = lstatSync(path, { throwIfNoEntry: false });
  if (stats === undefined) return undefined;
  return {
    type: stats.isSymbolicLink() ? "symlink" : stats.isDirectory() ? "directory" : "file",
    mode: stats.mode & 0o777,
    ino: stats.ino,
    mtimeMs: stats.mtimeMs,
    size: stats.size,
  };
}

function presentAs(path: string, kind: MigrationKind): boolean {
  let stats: Stats | undefined;
  try {
    stats = lstatSync(path, { throwIfNoEntry: false });
  } catch {
    return false;
  }
  if (stats === undefined) return false;
  if (stats.isSymbolicLink()) return true;
  return kind === "dir" ? stats.isDirectory() : stats.isFile();
}

function nearestExistingAncestor(path: string): string {
  let cursor = path;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return cursor;
    cursor = parent;
  }
  return cursor;
}

function insideRoot(root: string, candidate: string): boolean {
  const realRoot = realpathSync(root);
  const anchor = nearestExistingAncestor(dirname(candidate));
  const realAnchor = realpathSync(anchor);
  const rel = relative(realRoot, realAnchor);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function assertInsideRoot(root: string, path: string, label: string): string {
  if (!isAbsolute(path)) throw new Error(`migration ${label} must be absolute: ${path}`);
  const absolute = resolve(path);
  if (!insideRoot(root, absolute)) {
    throw new Error(`refusing migration ${label} outside ${root}: ${absolute}`);
  }
  return absolute;
}

function sameSnapshot(a: EntrySnapshot, b: EntrySnapshot | undefined): boolean {
  return (
    b !== undefined &&
    a.type === b.type &&
    a.mode === b.mode &&
    a.ino === b.ino &&
    a.mtimeMs === b.mtimeMs &&
    a.size === b.size
  );
}

export function planMigration(spec: MigrationSpec): MigrationPlan {
  const root = resolve(spec.root);
  if (!existsSync(root)) throw new Error(`migration root does not exist: ${root}`);
  const steps: PlanStep[] = [];
  const conflicts: MigrationConflict[] = [];

  for (const pair of spec.pairs) {
    const legacy = assertInsideRoot(root, pair.legacy, "source");
    const agro = assertInsideRoot(root, pair.agro, "destination");
    const legacyPresent = presentAs(legacy, pair.kind);
    const agroPresent = presentAs(agro, pair.kind);

    if (!legacyPresent && !agroPresent) {
      steps.push({ kind: "noop", path: agro, reason: "absent in both generations" });
      continue;
    }
    if (!legacyPresent && agroPresent) {
      steps.push({ kind: "noop", path: agro, reason: "already migrated" });
      continue;
    }
    if (legacyPresent && !agroPresent) {
      if (existsSync(agro) || lstatSync(agro, { throwIfNoEntry: false }) !== undefined) {
        conflicts.push({ path: agro, reason: `destination exists but is not a ${pair.kind}` });
        continue;
      }
      steps.push({
        kind: "rename",
        from: legacy,
        to: agro,
        snapshot: snapshot(legacy)!,
        createsParent: !existsSync(dirname(agro)),
      });
      continue;
    }
    const differences = compareTrees(legacy, agro);
    if (differences.length > 0) {
      conflicts.push({ path: agro, reason: "both generations exist and differ", differences });
      continue;
    }
    const retired = `${legacy}${RETIRED_SUFFIX}`;
    if (lstatSync(retired, { throwIfNoEntry: false }) !== undefined) {
      conflicts.push({ path: retired, reason: "retired copy already exists" });
      continue;
    }
    steps.push({ kind: "retire", from: legacy, to: retired, snapshot: snapshot(legacy)! });
  }

  for (const rewrite of spec.rewrites ?? []) {
    const path = assertInsideRoot(root, rewrite.path, "rewrite target");
    const current = snapshot(path);
    if (current === undefined || current.type !== "file") {
      steps.push({ kind: "noop", path, reason: "rewrite target is not a regular file" });
      continue;
    }
    const content = readFileSync(path, "utf8");
    const changed = rewrite.replacements.some((r) => r.from !== "" && content.includes(r.from));
    if (!changed) {
      steps.push({ kind: "noop", path, reason: "rewrite already applied" });
      continue;
    }
    steps.push({ kind: "rewrite", path, replacements: rewrite.replacements, snapshot: current });
  }

  const mutating = steps.some((step) => step.kind !== "noop");
  const status: PlanStatus = conflicts.length > 0 ? "conflict" : mutating ? "ready" : "noop";
  return { version: MIGRATION_PLAN_VERSION, root, status, steps, conflicts };
}

function acquireLock(root: string): (() => void) | undefined {
  const lock = resolve(root, LOCK_FILE);
  let fd: number;
  try {
    fd = openSync(lock, "wx", 0o600);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST") return undefined;
    throw error;
  }
  writeFileSync(fd, `${process.pid}\n`);
  closeSync(fd);
  return () => {
    try {
      unlinkSync(lock);
    } catch {
      /* the lock was already released */
    }
  };
}

function revalidate(step: PlanStep): string | undefined {
  if (step.kind === "noop") return undefined;
  if (step.kind === "rewrite") {
    return sameSnapshot(step.snapshot, snapshot(step.path))
      ? undefined
      : `${step.path} changed since the plan was made`;
  }
  if (!sameSnapshot(step.snapshot, snapshot(step.from))) {
    return `${step.from} changed since the plan was made`;
  }
  if (lstatSync(step.to, { throwIfNoEntry: false }) !== undefined) {
    return `${step.to} appeared since the plan was made`;
  }
  return undefined;
}

function applyRewrite(step: Extract<PlanStep, { kind: "rewrite" }>): void {
  let content = readFileSync(step.path, "utf8");
  for (const { from, to } of step.replacements) {
    if (from === "") continue;
    content = content.split(from).join(to);
  }
  const tmp = `${step.path}.tmp.${process.pid}`;
  const fd = openSync(tmp, "w", step.snapshot.mode);
  try {
    writeFileSync(fd, content, "utf8");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(tmp, step.path);
}

export function applyMigration(plan: MigrationPlan): MigrationResult {
  const root = resolve(plan.root);
  const pending = (): StepResult[] =>
    plan.steps.map((step) => ({ ...step, outcome: step.kind === "noop" ? "skipped" : "pending" }));

  if (plan.version !== MIGRATION_PLAN_VERSION) {
    return { status: "refused", root, reason: `unsupported plan version ${plan.version}`, steps: pending() };
  }
  if (plan.status === "conflict") {
    return {
      status: "refused",
      root,
      reason: plan.conflicts.map((c) => `${c.path}: ${c.reason}`).join("; "),
      steps: pending(),
    };
  }
  if (plan.status === "noop") {
    return { status: "noop", root, steps: pending() };
  }

  const release = acquireLock(root);
  if (release === undefined) {
    return {
      status: "refused",
      root,
      reason: `another migration holds ${resolve(root, LOCK_FILE)}`,
      steps: pending(),
    };
  }

  try {
    for (const step of plan.steps) {
      const stale = revalidate(step);
      if (stale !== undefined) {
        return { status: "refused", root, reason: stale, steps: pending() };
      }
      if (step.kind !== "noop" && step.kind !== "rewrite") {
        assertInsideRoot(root, step.from, "source");
        assertInsideRoot(root, step.to, "destination");
      }
    }

    const results = pending();
    for (let i = 0; i < plan.steps.length; i += 1) {
      const step = plan.steps[i];
      if (step.kind === "noop") continue;
      try {
        if (step.kind === "rewrite") {
          applyRewrite(step);
        } else {
          if (step.kind === "rename" && step.createsParent) {
            mkdirSync(dirname(step.to), { recursive: true });
          }
          renameSync(step.from, step.to);
        }
        results[i] = { ...step, outcome: "done" };
      } catch (error) {
        results[i] = {
          ...step,
          outcome: "failed",
          error: error instanceof Error ? error.message : String(error),
        };
        return {
          status: "failed",
          root,
          reason: `step ${i + 1} failed; completed steps are recoverable by reversing them in order`,
          steps: results,
        };
      }
    }
    return { status: "applied", root, steps: results };
  } finally {
    release();
  }
}

export function projectMigrationSpec(root: string): MigrationSpec {
  const dir = resolve(root);
  return {
    root: dir,
    pairs: [
      { legacy: `${dir}${sep}.oh`, agro: `${dir}${sep}.agro`, kind: "dir" },
      { legacy: `${dir}${sep}oh.json`, agro: `${dir}${sep}agro.json`, kind: "file" },
    ],
  };
}

export function userStateMigrationSpec(home: string): MigrationSpec {
  const dir = resolve(home);
  return {
    root: dir,
    pairs: [
      {
        legacy: `${dir}${sep}.oh${sep}sandboxes`,
        agro: `${dir}${sep}.agro${sep}sandboxes`,
        kind: "dir",
      },
    ],
  };
}
