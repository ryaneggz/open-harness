import { existsSync, readFileSync } from "node:fs";

/**
 * Returns true if the current hour falls within the configured active window,
 * or if no window is configured (always active).
 *
 * Mirrors bash `is_active_hours()` in install/heartbeat.sh.
 *
 * @param start - Hour (0-23) when active window begins (inclusive).
 * @param end   - Hour (0-23) when active window ends (exclusive).
 */
export function isActiveHours(start?: number, end?: number): boolean {
  // No range configured → always active
  if (start === undefined || end === undefined) {
    return true;
  }

  const hour = new Date().getHours();

  if (start <= end) {
    // Normal range: e.g. 9–18
    return hour >= start && hour < end;
  } else {
    // Wraparound (night-shift): e.g. 22–6
    return hour >= start || hour < end;
  }
}

/**
 * Returns true if the file at `filePath` contains no meaningful content —
 * i.e. it consists only of markdown headers, blank lines, HTML comments,
 * and empty list/checkbox items.
 *
 * Returns false when the file does not exist (bash equivalent: `return 1`).
 *
 * Mirrors bash `is_heartbeat_empty()` in install/heartbeat.sh.
 */
export function isHeartbeatEmpty(filePath: string): boolean {
  if (!existsSync(filePath)) {
    return false;
  }

  let content = readFileSync(filePath, "utf-8") as string;

  // Strip HTML comments (single-line and multi-line)
  content = content.replace(/<!--[\s\S]*?-->/g, "");

  const meaningful = content.split("\n").filter((line) => {
    // Keep lines that have actual content after applying all filters
    const trimmed = line.trim();

    // Blank lines
    if (trimmed === "") return false;

    // Markdown headers (# through ######)
    if (/^#{1,6}\s/.test(trimmed)) return false;

    // Empty list items: `- `, `* `, `+ ` with nothing after
    if (/^[-*+]\s*$/.test(trimmed)) return false;

    // Empty checkbox items: `- [ ]`, `- [x]`, `- [X]` with nothing after
    if (/^[-*+]\s*\[[ xX]?\]\s*$/.test(trimmed)) return false;

    return true;
  });

  return meaningful.length === 0;
}

/**
 * Returns true if `response` is a HEARTBEAT_OK acknowledgment:
 * it must contain the literal string "HEARTBEAT_OK" AND be fewer than
 * 300 characters long.
 *
 * Mirrors bash `is_heartbeat_ok()` in install/heartbeat.sh.
 */
export function isHeartbeatOk(response: string): boolean {
  return response.length < 300 && response.includes("HEARTBEAT_OK");
}
