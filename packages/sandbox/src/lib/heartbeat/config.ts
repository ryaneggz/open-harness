import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface HeartbeatEntry {
  cronExpr: string;
  filePath: string; // relative to workspace (or absolute)
  agent: string; // default: "claude"
  activeStart?: number; // hour 0-23
  activeEnd?: number; // hour 0-23
}

/**
 * Convert a seconds interval to a 5-field cron expression.
 * Mirrors the bash `seconds_to_cron()` function in install/heartbeat.sh exactly.
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
 * Parse heartbeats.conf (pipe-delimited) or fall back to legacy HEARTBEAT.md.
 *
 * Config format per line:
 *   <cron 5 fields> | <file-path> | [agent] | [active_start-active_end]
 *
 * Lines starting with # and blank lines are skipped.
 * File paths that do not exist on disk are skipped with a warning.
 *
 * Legacy mode: when heartbeats.conf is absent but HEARTBEAT.md exists,
 * a single entry is produced using defaultInterval seconds.
 */
export function parseHeartbeatConfig(
  workspacePath: string,
  defaultAgent = "claude",
  defaultInterval = 1800,
): HeartbeatEntry[] {
  const configFile = path.join(workspacePath, "heartbeats.conf");
  const legacyFile = path.join(workspacePath, "HEARTBEAT.md");

  if (existsSync(configFile)) {
    return parseConfigFile(configFile, workspacePath, defaultAgent);
  }

  if (existsSync(legacyFile)) {
    const cronExpr = secondsToCron(defaultInterval);
    return [
      {
        cronExpr,
        filePath: "HEARTBEAT.md",
        agent: defaultAgent,
      },
    ];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function parseConfigFile(
  configFile: string,
  workspacePath: string,
  defaultAgent: string,
): HeartbeatEntry[] {
  const raw = readFileSync(configFile, "utf-8") as string;
  const lines = raw.split("\n");
  const entries: HeartbeatEntry[] = [];

  for (const line of lines) {
    // Skip comment lines
    if (/^\s*#/.test(line)) continue;

    // Skip blank / whitespace-only lines
    if (line.trim() === "") continue;

    const parts = line.split("|");
    if (parts.length < 2) continue;

    const cronExpr = parts[0].trim();
    const filePath = parts[1].trim();
    const agentRaw = (parts[2] ?? "").trim();
    const activeRangeRaw = (parts[3] ?? "").trim();

    if (!cronExpr || !filePath) continue;

    // Validate file exists (resolve relative paths against workspacePath)
    const fullPath = filePath.startsWith("/") ? filePath : path.join(workspacePath, filePath);

    if (!existsSync(fullPath)) {
      // Mirror bash behavior: warn and skip
      console.warn(`heartbeat-config: file not found: ${fullPath} (skipping)`);
      continue;
    }

    const agent = agentRaw || defaultAgent;

    const entry: HeartbeatEntry = { cronExpr, filePath, agent };

    // Parse active_range "start-end" e.g. "9-21"
    if (activeRangeRaw && activeRangeRaw.includes("-")) {
      const dashIdx = activeRangeRaw.indexOf("-");
      const startStr = activeRangeRaw.slice(0, dashIdx);
      const endStr = activeRangeRaw.slice(dashIdx + 1);
      const activeStart = parseInt(startStr, 10);
      const activeEnd = parseInt(endStr, 10);
      if (!isNaN(activeStart) && !isNaN(activeEnd)) {
        entry.activeStart = activeStart;
        entry.activeEnd = activeEnd;
      }
    }

    entries.push(entry);
  }

  return entries;
}
