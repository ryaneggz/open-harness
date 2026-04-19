import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

/**
 * A single workspace root that the heartbeat daemon can watch. Each root
 * corresponds to one worktree's workspace — e.g. the parent checkout's
 * `workspace/` or a sibling worktree's `.worktrees/<branch>/workspace/`.
 *
 * PR-1 wires this through the type system so later PRs can thread
 * discovery, multi-root watching, per-root CWD spawn, and per-root loggers
 * without another cross-cutting refactor.
 */
export interface WorkspaceRoot {
  /** Absolute path to the workspace directory. */
  workspacePath: string;
  /** Absolute path to the heartbeats directory (`<workspacePath>/heartbeats`). */
  heartbeatDir: string;
  /** Absolute path to SOUL.md (default: `<workspacePath>/SOUL.md`). */
  soulFile?: string;
  /** Absolute path to memory directory (default: `<workspacePath>/memory`). */
  memoryDir?: string;
  /**
   * Stable human-readable label for this root — used to namespace schedule
   * keys, log prefixes, and status output across multiple worktrees.
   *
   * In single-root back-compat mode this is `""`, which collapses the
   * composite `${label}::${slug}` key back to the bare slug so single-root
   * deployments stay byte-identical to the legacy behaviour.
   */
  label: string;
}

export interface HeartbeatEntry {
  cronExpr: string;
  filePath: string; // relative to root.workspacePath (e.g. "heartbeats/build-health.md")
  agent: string; // default: "claude"
  activeStart?: number; // hour 0-23
  activeEnd?: number; // hour 0-23
  /**
   * Workspace root this entry belongs to. Travels with the entry so the
   * scheduler and runner can key on (root, entry) composite and resolve
   * per-root paths without a shared global.
   */
  root: WorkspaceRoot;
}

/**
 * Normalize either a bare workspacePath (back-compat) or a WorkspaceRoot
 * into a concrete WorkspaceRoot. Callers that still pass a string get an
 * auto-wrapped root with `label = ""` so downstream composite keys remain
 * byte-identical to the legacy single-root slugs.
 */
export function toWorkspaceRoot(input: string | WorkspaceRoot): WorkspaceRoot {
  if (typeof input !== "string") return input;
  return {
    workspacePath: input,
    heartbeatDir: path.join(input, "heartbeats"),
    soulFile: path.join(input, "SOUL.md"),
    memoryDir: path.join(input, "memory"),
    label: "",
  };
}

/**
 * Convert a seconds interval to a 5-field cron expression.
 */
export function secondsToCron(seconds: number): string {
  const minutes = Math.floor(seconds / 60);

  if (minutes <= 0) {
    return "* * * * *";
  } else if (minutes < 60) {
    return `*/${minutes} * * * *`;
  } else if (minutes === 60) {
    return "0 * * * *";
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    return `0 */${hours} * * *`;
  } else {
    return "0 0 * * *";
  }
}

/**
 * Extract YAML frontmatter from a markdown string.
 * Returns key-value pairs (all string values), or null if no frontmatter found.
 */
export function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fields: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    // Skip comments and blank lines
    if (/^\s*#/.test(line) || line.trim() === "") continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    // Strip surrounding quotes from value
    const raw = line.slice(colonIdx + 1).trim();
    fields[key] = raw.replace(/^["']|["']$/g, "");
  }

  return Object.keys(fields).length > 0 ? fields : null;
}

/**
 * Scan heartbeat markdown files for frontmatter-based schedule config.
 *
 * Reads all .md files in `<workspacePath>/heartbeats/`, extracts frontmatter,
 * and returns entries for files that have a `schedule` field.
 *
 * Falls back to legacy HEARTBEAT.md (no frontmatter needed — uses defaultInterval).
 *
 * Accepts either a bare workspacePath (legacy callers) or a WorkspaceRoot.
 */
export function parseHeartbeatConfig(
  input: string | WorkspaceRoot,
  defaultAgent = "claude",
  defaultInterval = 1800,
): HeartbeatEntry[] {
  const root = toWorkspaceRoot(input);
  const heartbeatsDir = root.heartbeatDir;

  if (existsSync(heartbeatsDir)) {
    return parseHeartbeatDir(heartbeatsDir, defaultAgent, root);
  }

  // Legacy fallback: bare HEARTBEAT.md with no frontmatter
  const legacyFile = path.join(root.workspacePath, "HEARTBEAT.md");
  if (existsSync(legacyFile)) {
    return [
      {
        cronExpr: secondsToCron(defaultInterval),
        filePath: "HEARTBEAT.md",
        agent: defaultAgent,
        root,
      },
    ];
  }

  return [];
}

/**
 * Async variant of parseHeartbeatConfig — uses non-blocking I/O with
 * parallel file reads. Preferred by the long-lived daemon to avoid blocking
 * the event loop (and cron callbacks) during sync.
 */
export async function parseHeartbeatConfigAsync(
  input: string | WorkspaceRoot,
  defaultAgent = "claude",
  defaultInterval = 1800,
): Promise<HeartbeatEntry[]> {
  const root = toWorkspaceRoot(input);
  const heartbeatsDir = root.heartbeatDir;

  if (existsSync(heartbeatsDir)) {
    return parseHeartbeatDirAsync(heartbeatsDir, defaultAgent, root);
  }

  // Legacy fallback: bare HEARTBEAT.md with no frontmatter
  const legacyFile = path.join(root.workspacePath, "HEARTBEAT.md");
  if (existsSync(legacyFile)) {
    return [
      {
        cronExpr: secondsToCron(defaultInterval),
        filePath: "HEARTBEAT.md",
        agent: defaultAgent,
        root,
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

/** Build a HeartbeatEntry from a parsed frontmatter record, or null if invalid. */
function buildEntry(
  file: string,
  fm: Record<string, string>,
  defaultAgent: string,
  root: WorkspaceRoot,
): HeartbeatEntry | null {
  if (!fm.schedule) return null;

  const entry: HeartbeatEntry = {
    cronExpr: fm.schedule,
    filePath: `heartbeats/${file}`,
    agent: fm.agent || defaultAgent,
    root,
  };

  // Parse active hours "start-end"
  if (fm.active && fm.active.includes("-")) {
    const dashIdx = fm.active.indexOf("-");
    const start = parseInt(fm.active.slice(0, dashIdx), 10);
    const end = parseInt(fm.active.slice(dashIdx + 1), 10);
    if (!isNaN(start) && !isNaN(end)) {
      entry.activeStart = start;
      entry.activeEnd = end;
    }
  }

  return entry;
}

function parseHeartbeatDir(
  heartbeatsDir: string,
  defaultAgent: string,
  root: WorkspaceRoot,
): HeartbeatEntry[] {
  let files: string[];
  try {
    files = readdirSync(heartbeatsDir)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }

  const entries: HeartbeatEntry[] = [];
  for (const file of files) {
    const fullPath = path.join(heartbeatsDir, file);
    let content: string;
    try {
      content = readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }

    const fm = parseFrontmatter(content);
    if (!fm) continue;
    const entry = buildEntry(file, fm, defaultAgent, root);
    if (entry) entries.push(entry);
  }

  return entries;
}

async function parseHeartbeatDirAsync(
  heartbeatsDir: string,
  defaultAgent: string,
  root: WorkspaceRoot,
): Promise<HeartbeatEntry[]> {
  let files: string[];
  try {
    files = (await readdir(heartbeatsDir)).filter((f) => f.endsWith(".md")).sort();
  } catch {
    return [];
  }

  const results = await Promise.all(
    files.map(async (file) => {
      try {
        const content = await readFile(path.join(heartbeatsDir, file), "utf-8");
        const fm = parseFrontmatter(content);
        if (!fm) return null;
        return buildEntry(file, fm, defaultAgent, root);
      } catch {
        return null;
      }
    }),
  );

  return results.filter((e): e is HeartbeatEntry => e !== null);
}
