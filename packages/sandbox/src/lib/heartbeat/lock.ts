import * as fs from "node:fs";
import { join } from "node:path";

/**
 * PID-based lock manager for heartbeat jobs.
 *
 * Uses O_EXCL atomic file creation to prevent race conditions when multiple
 * processes attempt to acquire the same lock simultaneously. Stale locks
 * (where the owning PID is no longer running) are automatically cleaned up.
 */
export class LockManager {
  constructor(private lockDir: string) {
    fs.mkdirSync(lockDir, { recursive: true });
  }

  /**
   * Attempt to acquire a named lock.
   *
   * @returns true if the lock was acquired, false if it is already held by a
   *          running process.
   */
  acquire(name: string): boolean {
    const lockPath = this.lockPath(name);

    // Ensure lock directory exists (in case it was removed after construction)
    fs.mkdirSync(this.lockDir, { recursive: true });

    try {
      // Atomic creation — fails with EEXIST if file already exists
      const fd = fs.openSync(
        lockPath,
        fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL,
      );
      fs.writeSync(fd, String(process.pid));
      fs.closeSync(fd);
      return true;
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== "EEXIST") {
        throw err;
      }

      // Lock file exists — check if the owning process is still alive
      if (this.isStale(lockPath)) {
        // Remove stale lock and retry acquisition
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Another process may have cleaned it up between our check and unlink
        }
        return this.acquire(name);
      }

      return false;
    }
  }

  /**
   * Release a named lock.
   * No-op if the lock file does not exist.
   */
  release(name: string): void {
    const lockPath = this.lockPath(name);
    try {
      fs.unlinkSync(lockPath);
    } catch (err: unknown) {
      if (!isNodeError(err) || err.code !== "ENOENT") {
        throw err;
      }
      // File already gone — that's fine
    }
  }

  /**
   * Check whether a named lock is currently held by a running process.
   * Stale locks (dead PIDs) are treated as unlocked and cleaned up.
   */
  isLocked(name: string): boolean {
    const lockPath = this.lockPath(name);

    if (!fs.existsSync(lockPath)) {
      return false;
    }

    if (this.isStale(lockPath)) {
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // Ignore — may already be removed
      }
      return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private lockPath(name: string): string {
    return join(this.lockDir, `${name}.lock`);
  }

  /**
   * Returns true if the lockfile exists but its PID is not a running process.
   */
  private isStale(lockPath: string): boolean {
    try {
      const content = fs.readFileSync(lockPath, "utf-8").trim();
      const pid = parseInt(content, 10);

      if (isNaN(pid) || pid <= 0) {
        return true;
      }

      try {
        // Signal 0 checks process existence without sending a real signal
        process.kill(pid, 0);
        return false; // Process is alive
      } catch (err: unknown) {
        if (isNodeError(err) && err.code === "ESRCH") {
          return true; // No such process — stale
        }
        if (isNodeError(err) && err.code === "EPERM") {
          // Process exists but we don't have permission to signal it
          return false;
        }
        return true;
      }
    } catch {
      // Can't read lock file — treat as stale
      return true;
    }
  }
}

function isNodeError(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error && "code" in err;
}
