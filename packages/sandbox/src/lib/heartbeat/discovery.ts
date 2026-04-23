import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import type { WorkspaceRoot } from "./config.js";

/**
 * Discover all workspace roots under a given HOME.
 *
 * Uses `git worktree list --porcelain` against `<home>/harness` as the source
 * of truth — git already tracks every worktree and its branch, which is more
 * reliable than walking `.worktrees/` (worktree paths can be anywhere on disk).
 *
 * For each discovered worktree, we include `<worktree-path>/workspace` as a
 * root IFF `<workspacePath>/heartbeats/` exists. The label is derived from
 * the branch name (`refs/heads/agent/foo` → `agent-foo`). Detached HEADs
 * become `detached-<shortsha>`.
 *
 * `HEARTBEAT_ROOTS=path1:label1,path2:label2` env-style overrides augment (or
 * override, on path collision) auto-discovery. Overrides always win.
 */
export function discoverWorkspaceRoots(home: string, overrides?: string): WorkspaceRoot[] {
  const byPath = new Map<string, WorkspaceRoot>();

  // 1. Auto-discover via `git worktree list --porcelain`.
  const harnessRoot = path.join(home, "harness");
  for (const entry of listGitWorktrees(harnessRoot)) {
    const workspacePath = path.join(entry.path, "workspace");
    const heartbeatDir = path.join(workspacePath, "heartbeats");
    if (!safeExistsDir(heartbeatDir)) continue;

    const label = sanitizeBranch(entry.branch, entry.head);
    byPath.set(workspacePath, {
      workspacePath,
      heartbeatDir,
      soulFile: path.join(workspacePath, "SOUL.md"),
      memoryDir: path.join(workspacePath, "memory"),
      label,
    });
  }

  // 2. Apply env overrides — they win on collision.
  if (overrides && overrides.trim().length > 0) {
    for (const spec of overrides.split(",")) {
      const trimmed = spec.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.lastIndexOf(":");
      if (colonIdx <= 0) continue; // need both path and label
      const rawPath = trimmed.slice(0, colonIdx).trim();
      const label = trimmed.slice(colonIdx + 1).trim();
      if (!rawPath || !label) continue;
      const workspacePath = path.isAbsolute(rawPath) ? rawPath : path.resolve(rawPath);
      const heartbeatDir = path.join(workspacePath, "heartbeats");
      byPath.set(workspacePath, {
        workspacePath,
        heartbeatDir,
        soulFile: path.join(workspacePath, "SOUL.md"),
        memoryDir: path.join(workspacePath, "memory"),
        label,
      });
    }
  }

  // Return in a deterministic order (by path) so logs, status output, and
  // tests aren't sensitive to Map insertion ordering.
  return Array.from(byPath.values()).sort((a, b) =>
    a.workspacePath < b.workspacePath ? -1 : a.workspacePath > b.workspacePath ? 1 : 0,
  );
}

// ---------------------------------------------------------------------------
// Internal
// ---------------------------------------------------------------------------

interface GitWorktreeEntry {
  path: string;
  branch: string | null; // refs/heads/... or null when detached
  head: string | null; // commit sha
}

/**
 * Run `git worktree list --porcelain` and parse the result. Returns an empty
 * array on any failure (no git, not a repo, permission denied, etc.) — the
 * caller falls back to single-root behaviour in that case.
 */
function listGitWorktrees(repoDir: string): GitWorktreeEntry[] {
  let raw: string;
  try {
    raw = execFileSync("git", ["-C", repoDir, "worktree", "list", "--porcelain"], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return [];
  }

  const entries: GitWorktreeEntry[] = [];
  let current: Partial<GitWorktreeEntry> = {};
  for (const line of raw.split("\n")) {
    if (line.startsWith("worktree ")) {
      if (current.path) {
        entries.push({
          path: current.path,
          branch: current.branch ?? null,
          head: current.head ?? null,
        });
      }
      current = { path: line.slice("worktree ".length).trim() };
    } else if (line.startsWith("HEAD ")) {
      current.head = line.slice("HEAD ".length).trim();
    } else if (line.startsWith("branch ")) {
      current.branch = line.slice("branch ".length).trim();
    } else if (line.trim() === "" && current.path) {
      entries.push({
        path: current.path,
        branch: current.branch ?? null,
        head: current.head ?? null,
      });
      current = {};
    }
    // Ignore other keys (bare, detached, locked, prunable...) — we only
    // derive label from branch/head.
  }
  if (current.path) {
    entries.push({
      path: current.path,
      branch: current.branch ?? null,
      head: current.head ?? null,
    });
  }

  return entries;
}

/**
 * Convert a git branch ref (or detached HEAD) to a filesystem-safe label.
 *
 * - `refs/heads/main` → `main`
 * - `refs/heads/agent/sdr-pallet` → `agent-sdr-pallet`
 * - null branch (detached) → `detached-<shortsha>` (first 7 chars of HEAD)
 * - null branch + null head → `detached`
 */
export function sanitizeBranch(branch: string | null, head: string | null): string {
  if (!branch) {
    if (head && head.length >= 7) return `detached-${head.slice(0, 7)}`;
    return "detached";
  }
  const stripped = branch.replace(/^refs\/heads\//, "");
  return stripped.replace(/\//g, "-").toLowerCase();
}

function safeExistsDir(p: string): boolean {
  try {
    if (!existsSync(p)) return false;
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}
