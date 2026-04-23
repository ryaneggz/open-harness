import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { discoverWorkspaceRoots, sanitizeBranch } from "../lib/heartbeat/discovery.js";

// ---------------------------------------------------------------------------
// Helpers: build a real, throwaway multi-worktree git repo on disk so we can
// exercise `git worktree list --porcelain` end-to-end (no parsing mocks).
// ---------------------------------------------------------------------------

// Husky pre-commit hooks export GIT_DIR/GIT_INDEX_FILE, which leak into every
// child `git` process — both the test helper below and the production
// `discoverWorkspaceRoots` call — and silently retarget them at the real repo.
// Strip them once for the whole file so the tests are hermetic.
beforeAll(() => {
  for (const key of Object.keys(process.env)) {
    if (key.startsWith("GIT_")) delete process.env[key];
  }
});

function run(cwd: string, ...args: string[]): string {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([k]) => !k.startsWith("GIT_")),
  ) as NodeJS.ProcessEnv;
  return execFileSync("git", ["-C", cwd, ...args], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "ignore"],
    env,
  });
}

function mkHeartbeatsDir(workspacePath: string): void {
  const heartbeatsDir = path.join(workspacePath, "heartbeats");
  mkdirSync(heartbeatsDir, { recursive: true });
  writeFileSync(path.join(heartbeatsDir, "ping.md"), `---\nschedule: "*/5 * * * *"\n---\n\nping\n`);
}

describe("sanitizeBranch", () => {
  it("strips refs/heads/ and lowercases", () => {
    expect(sanitizeBranch("refs/heads/Main", null)).toBe("main");
  });

  it("replaces / with -", () => {
    expect(sanitizeBranch("refs/heads/agent/sdr-pallet", null)).toBe("agent-sdr-pallet");
  });

  it("handles plain branch names without refs/heads prefix", () => {
    expect(sanitizeBranch("feat/foo", null)).toBe("feat-foo");
  });

  it("returns detached-<shortsha> for null branch + sha", () => {
    expect(sanitizeBranch(null, "abcdef0123456789")).toBe("detached-abcdef0");
  });

  it("returns 'detached' for null branch + null sha", () => {
    expect(sanitizeBranch(null, null)).toBe("detached");
  });
});

describe("discoverWorkspaceRoots", () => {
  let fakeHome: string;
  let harnessDir: string;

  beforeEach(() => {
    // Create a scratch HOME with a `harness/` git repo inside, plus two
    // sibling worktrees. The repo layout mirrors the real one so the
    // porcelain output matches production shape.
    fakeHome = mkdtempSync(path.join(tmpdir(), "heartbeat-discovery-test-"));
    harnessDir = path.join(fakeHome, "harness");
    mkdirSync(harnessDir, { recursive: true });

    // Initialize bare-bones git repo on `main` with one commit so worktrees can branch off it.
    run(harnessDir, "init", "-q", "-b", "main");
    run(harnessDir, "config", "user.email", "test@example.com");
    run(harnessDir, "config", "user.name", "Test");
    run(harnessDir, "config", "commit.gpgsign", "false");
    writeFileSync(path.join(harnessDir, "README.md"), "hello\n");
    run(harnessDir, "add", "README.md");
    run(harnessDir, "commit", "-q", "-m", "init");

    // Parent checkout has its own workspace/heartbeats/.
    mkHeartbeatsDir(path.join(harnessDir, "workspace"));

    // Worktree #1: agent/sdr-pallet — with heartbeats dir.
    const wt1 = path.join(harnessDir, ".worktrees", "agent", "sdr-pallet");
    run(harnessDir, "worktree", "add", "-q", "-b", "agent/sdr-pallet", wt1);
    mkHeartbeatsDir(path.join(wt1, "workspace"));

    // Worktree #2: feat/foo — with heartbeats dir.
    const wt2 = path.join(harnessDir, ".worktrees", "feat", "foo");
    run(harnessDir, "worktree", "add", "-q", "-b", "feat/foo", wt2);
    mkHeartbeatsDir(path.join(wt2, "workspace"));

    // Worktree #3: no heartbeats dir — should be skipped.
    const wt3 = path.join(harnessDir, ".worktrees", "no-heartbeats");
    run(harnessDir, "worktree", "add", "-q", "-b", "no-heartbeats", wt3);
    // (intentionally no mkHeartbeatsDir)
  });

  afterEach(() => {
    rmSync(fakeHome, { recursive: true, force: true });
  });

  it("discovers every worktree that has a workspace/heartbeats/ directory", () => {
    const roots = discoverWorkspaceRoots(fakeHome);

    const labels = roots.map((r) => r.label).sort();
    expect(labels).toEqual(["agent-sdr-pallet", "feat-foo", "main"]);
  });

  it("sets each root's workspacePath to <worktree>/workspace", () => {
    const roots = discoverWorkspaceRoots(fakeHome);

    for (const root of roots) {
      expect(root.workspacePath.endsWith("/workspace")).toBe(true);
      expect(root.heartbeatDir).toBe(path.join(root.workspacePath, "heartbeats"));
    }
  });

  it("skips worktrees whose workspace/heartbeats/ does not exist", () => {
    const roots = discoverWorkspaceRoots(fakeHome);
    expect(roots.find((r) => r.label === "no-heartbeats")).toBeUndefined();
  });

  it("returns empty array when $HOME/harness is not a git repo", () => {
    const nonRepoHome = mkdtempSync(path.join(tmpdir(), "heartbeat-discovery-empty-"));
    try {
      mkdirSync(path.join(nonRepoHome, "harness"), { recursive: true });
      const roots = discoverWorkspaceRoots(nonRepoHome);
      expect(roots).toEqual([]);
    } finally {
      rmSync(nonRepoHome, { recursive: true, force: true });
    }
  });

  it("applies HEARTBEAT_ROOTS overrides and merges them into discovery", () => {
    // Create a custom path outside the git worktree tree.
    const customWorkspace = path.join(fakeHome, "custom", "workspace");
    mkdirSync(path.join(customWorkspace, "heartbeats"), { recursive: true });

    const overrides = `${customWorkspace}:custom-root`;
    const roots = discoverWorkspaceRoots(fakeHome, overrides);

    const labels = roots.map((r) => r.label).sort();
    expect(labels).toContain("custom-root");
    expect(labels).toContain("agent-sdr-pallet");
    expect(labels).toContain("main");
  });

  it("override wins on path collision with auto-discovery", () => {
    const parentWorkspace = path.join(harnessDir, "workspace");
    const overrides = `${parentWorkspace}:forced-label`;
    const roots = discoverWorkspaceRoots(fakeHome, overrides);

    // Only one entry for parentWorkspace should exist, and its label must be
    // the override's.
    const parents = roots.filter((r) => r.workspacePath === parentWorkspace);
    expect(parents).toHaveLength(1);
    expect(parents[0].label).toBe("forced-label");
  });

  it("ignores malformed HEARTBEAT_ROOTS entries without crashing", () => {
    const overrides = `,:,bad-no-label:,/tmp:, `;
    expect(() => discoverWorkspaceRoots(fakeHome, overrides)).not.toThrow();
    const roots = discoverWorkspaceRoots(fakeHome, overrides);
    // Should still include auto-discovered roots.
    expect(roots.length).toBeGreaterThanOrEqual(3);
  });
});
