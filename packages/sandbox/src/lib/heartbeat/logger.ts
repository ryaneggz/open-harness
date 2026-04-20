import { existsSync, mkdirSync, appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const TRIM_LINES = 500;

export class HeartbeatLogger {
  private dirEnsured = false;

  constructor(
    private logPath: string,
    private maxLines: number = 1000,
  ) {}

  /**
   * Append a timestamped line to the log file, creating directory/file if needed.
   * Also writes to console.log.
   */
  log(message: string): void {
    if (!this.dirEnsured) {
      const dir = dirname(this.logPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      this.dirEnsured = true;
    }

    const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
    const line = `[${ts}] ${message}\n`;

    console.log(line.trimEnd());
    appendFileSync(this.logPath, line);
  }

  /**
   * Trim the log file to TRIM_LINES (500) lines when it exceeds maxLines.
   * Does nothing if the file doesn't exist or is within the limit.
   */
  rotate(): void {
    if (!existsSync(this.logPath)) return;

    const content = readFileSync(this.logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);

    if (lines.length <= this.maxLines) return;

    const trimmed = lines.slice(-TRIM_LINES).join("\n") + "\n";
    writeFileSync(this.logPath, trimmed);
  }

  /**
   * Return the last n lines from the log file as a newline-joined string.
   * Returns empty string if the file doesn't exist.
   */
  tail(n: number = 10): string {
    if (!existsSync(this.logPath)) return "";

    const content = readFileSync(this.logPath, "utf-8");
    const lines = content.split("\n").filter((l) => l.length > 0);

    return lines.slice(-n).join("\n");
  }
}
