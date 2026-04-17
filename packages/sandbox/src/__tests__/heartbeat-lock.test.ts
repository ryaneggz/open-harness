import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Use real filesystem — lock behavior is best tested against real fs
const { LockManager } = await import("../lib/heartbeat/lock.js");

describe("LockManager", () => {
  let tmpDir: string;
  let lockDir: string;
  let manager: InstanceType<typeof LockManager>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "heartbeat-lock-test-"));
    lockDir = join(tmpDir, "locks");
    manager = new LockManager(lockDir);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("acquire()", () => {
    it("creates lockfile with PID content and returns true", () => {
      const result = manager.acquire("my-job");
      expect(result).toBe(true);

      const lockFile = join(lockDir, "my-job.lock");
      expect(existsSync(lockFile)).toBe(true);

      const content = readFileSync(lockFile, "utf-8").trim();
      expect(content).toBe(String(process.pid));
    });

    it("returns false when lock is already held by a running process", () => {
      // First acquire should succeed
      const first = manager.acquire("my-job");
      expect(first).toBe(true);

      // Second acquire should fail — same process holds it
      const second = manager.acquire("my-job");
      expect(second).toBe(false);
    });

    it("removes stale lock (PID not running) and acquires successfully", () => {
      const lockFile = join(lockDir, "stale-job.lock");
      mkdirSync(lockDir, { recursive: true });

      // Write a lockfile with a PID that definitely doesn't exist
      // PID 99999999 is practically guaranteed to not be running
      writeFileSync(lockFile, "99999999", "utf-8");

      const result = manager.acquire("stale-job");
      expect(result).toBe(true);

      // Should now contain current PID
      const content = readFileSync(lockFile, "utf-8").trim();
      expect(content).toBe(String(process.pid));
    });
  });

  describe("release()", () => {
    it("removes the lockfile", () => {
      manager.acquire("my-job");
      const lockFile = join(lockDir, "my-job.lock");
      expect(existsSync(lockFile)).toBe(true);

      manager.release("my-job");
      expect(existsSync(lockFile)).toBe(false);
    });

    it("is a no-op when no lock exists", () => {
      // Should not throw when lockfile doesn't exist
      expect(() => manager.release("nonexistent-job")).not.toThrow();
    });
  });

  describe("isLocked()", () => {
    it("returns true when lock is held by a running process", () => {
      manager.acquire("my-job");
      expect(manager.isLocked("my-job")).toBe(true);
    });

    it("returns false when no lock exists", () => {
      expect(manager.isLocked("my-job")).toBe(false);
    });

    it("returns false and cleans up stale lock", async () => {
      const lockFile = join(lockDir, "stale-job.lock");
      mkdirSync(lockDir, { recursive: true });

      writeFileSync(lockFile, "99999999", "utf-8");

      const result = manager.isLocked("stale-job");
      expect(result).toBe(false);
    });
  });

  describe("lock directory creation", () => {
    it("creates lock directory if it does not exist", () => {
      // lockDir doesn't exist yet (it's a new path under tmpDir)
      const nestedLockDir = join(tmpDir, "deep", "nested", "locks");
      const nestedManager = new LockManager(nestedLockDir);

      const result = nestedManager.acquire("some-job");
      expect(result).toBe(true);
      expect(existsSync(nestedLockDir)).toBe(true);
    });
  });
});
