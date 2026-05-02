/**
 * Interactive onboarding wizard — shared types.
 *
 * Each step is a pure function that takes an injected {@link Deps} bag and
 * returns a {@link StepResult}. Tests substitute fakes via the dependency
 * bag; production wires up real fs / exec / readline.
 */

export type StepId = "llm" | "slack" | "ssh" | "github" | "cloudflare" | "claude";

export type StepStatus = "done" | "skipped" | "failed" | "unverified" | "unknown";

export const STEP_IDS: readonly StepId[] = [
  "llm",
  "slack",
  "ssh",
  "github",
  "cloudflare",
  "claude",
] as const;

export interface StepResult {
  id: StepId;
  status: StepStatus;
  message?: string;
}

export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface ExecResult {
  status: number;
  stdout: string;
  stderr: string;
}

export interface FsDeps {
  exists(path: string): boolean;
  readFile(path: string): string;
  writeFile(path: string, contents: string): void;
  appendFile(path: string, contents: string): void;
  mkdirp(path: string): void;
  symlink(target: string, link: string): void;
  chmod(path: string, mode: number): void;
  stat(path: string): { size: number } | null;
}

export interface ExecDeps {
  /** Run a command with inherited stdio. Throws on non-zero exit. */
  run(cmd: string[], opts?: ExecOptions): void;
  /** Run a command, ignore the exit code. Returns true iff status === 0. */
  runSafe(cmd: string[], opts?: ExecOptions): boolean;
  /** Run a command, capture stdout + stderr + status. Never throws. */
  capture(cmd: string[], opts?: ExecOptions): ExecResult;
  /** `which`-style lookup. Returns the absolute path or null. */
  which(bin: string): string | null;
}

export interface IoDeps {
  banner(message: string): void;
  ok(message: string): void;
  skip(message: string): void;
  warn(message: string): void;
  fail(message: string): void;
  info(message: string): void;
  ask(question: string): Promise<string>;
  /** Wait for the user to press Enter (used after "Add key to GitHub"). */
  waitForEnter(): Promise<void>;
  /** Emit a raw line without any prefix or color. */
  raw(message: string): void;
}

export interface ClockDeps {
  nowUtcIso(): string;
  /** Sleep N milliseconds. Mockable in tests. */
  sleep(ms: number): Promise<void>;
}

export interface Deps {
  env: Record<string, string | undefined>;
  home: string;
  fs: FsDeps;
  exec: ExecDeps;
  io: IoDeps;
  clock: ClockDeps;
}

export interface StepRunOptions {
  force: boolean;
}

export interface Step {
  id: StepId;
  /** Human-readable step header, e.g. "Step 1/6 — LLM Provider (OpenAI)". */
  label: string;
  run(deps: Deps, opts: StepRunOptions): Promise<StepResult>;
}

export class UnknownStepError extends Error {
  constructor(public readonly name: string) {
    super(`Unknown step: ${name} (valid: ${STEP_IDS.join(" ")})`);
    this.name = "UnknownStepError";
  }
}

export interface ParsedArgs {
  only?: StepId;
  force: boolean;
}

/**
 * A single onboard step contributed by a harness pack.
 *
 * `id` is the runtime step identifier (e.g. `"slack"`). `after` declares an
 * ordering prerequisite — the loader resolves a topological order across all
 * core + pack steps. `file` is a path *within the pack directory* that points
 * at the compiled step module; the loader dynamic-imports it and expects a
 * default or named export of shape {@link Step}.
 */
export interface PackStep {
  id: string;
  after?: string;
  file: string;
}

/**
 * The shape of a pack's `harness.json` manifest. A "harness pack" bundles
 * agents, compose overlays, install + entrypoint hooks, workspace seed
 * content, and (optionally) a prebuilt OCI image into a single installable
 * unit. Onboard steps are one extension point among several; this contract
 * only consumes `onboard_steps` but the full manifest is typed here so the
 * pack registry can store and round-trip it without loss.
 *
 * See `.claude/plans/we-need-to-seperate-serialized-clover.md`
 * (harness-pack contract) for the full pack architecture.
 */
export interface HarnessPack {
  name: string;
  version: string;
  description: string;
  /** Minimum compatible openharness CLI version. */
  openharness: string;
  agents: string[];
  compose_overlays: string[];
  onboard_steps: PackStep[];
  install_hook: string;
  entrypoint_hook: string;
  workspace_seed: string;
  prebuilt_image?: string;
}
