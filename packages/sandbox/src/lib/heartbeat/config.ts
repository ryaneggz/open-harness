import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

export interface HeartbeatEntry {
  cronExpr: string;
  filePath: string; // relative to workspace (e.g. "heartbeats/build-health.md")
  agent: string; // default: "claude"
  activeStart?: number; // hour 0-23
  activeEnd?: number; // hour 0-23
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
 */
export function parseHeartbeatConfig(
  workspacePath: string,
  defaultAgent = "claude",
  defaultInterval = 1800,
): HeartbeatEntry[] {
  const heartbeatsDir = path.join(workspacePath, "heartbeats");

  if (existsSync(heartbeatsDir)) {
    return parseHeartbeatDir(heartbeatsDir, defaultAgent);
  }

  // Legacy fallback: bare HEARTBEAT.md with no frontmatter
  const legacyFile = path.join(workspacePath, "HEARTBEAT.md");
  if (existsSync(legacyFile)) {
    return [
      {
        cronExpr: secondsToCron(defaultInterval),
        filePath: "HEARTBEAT.md",
        agent: defaultAgent,
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
  workspacePath: string,
  defaultAgent = "claude",
  defaultInterval = 1800,
): Promise<HeartbeatEntry[]> {
  const heartbeatsDir = path.join(workspacePath, "heartbeats");

  if (existsSync(heartbeatsDir)) {
    return parseHeartbeatDirAsync(heartbeatsDir, defaultAgent);
  }

  // Legacy fallback: bare HEARTBEAT.md with no frontmatter
  const legacyFile = path.join(workspacePath, "HEARTBEAT.md");
  if (existsSync(legacyFile)) {
    return [
      {
        cronExpr: secondsToCron(defaultInterval),
        filePath: "HEARTBEAT.md",
        agent: defaultAgent,
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
): HeartbeatEntry | null {
  if (!fm.schedule) return null;

  const entry: HeartbeatEntry = {
    cronExpr: fm.schedule,
    filePath: `heartbeats/${file}`,
    agent: fm.agent || defaultAgent,
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

function parseHeartbeatDir(heartbeatsDir: string, defaultAgent: string): HeartbeatEntry[] {
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
    const entry = buildEntry(file, fm, defaultAgent);
    if (entry) entries.push(entry);
  }

  return entries;
}

async function parseHeartbeatDirAsync(
  heartbeatsDir: string,
  defaultAgent: string,
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
        return buildEntry(file, fm, defaultAgent);
      } catch {
        return null;
      }
    }),
  );

  return results.filter((e): e is HeartbeatEntry => e !== null);
}
