/**
 * `oh worktree <name> [--base-branch <branch>]` — create a git worktree
 * for branch isolation. Delegates to the `sandbox_worktree` tool.
 */

export interface WorktreeActionOpts {
  baseBranch?: string;
}

export async function worktreeAction(name: string, opts: WorktreeActionOpts): Promise<void> {
  const { worktreeTool } = await import("../../tools/index.js");
  const params: Record<string, unknown> = { name };
  if (opts.baseBranch) params.baseBranch = opts.baseBranch;

  const result = await worktreeTool.execute(
    "cli",
    params,
    undefined,
    undefined,
    undefined as never,
  );
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}
