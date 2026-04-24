/**
 * Claude rules extension for Pi Agent.
 *
 * Scans .claude/rules/ at session start and appends a pointer-style list of
 * rule file paths into the system prompt so the agent can read them on demand.
 * Auto-loaded when @openharness/sandbox is installed as a Pi package.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";

/** Recursively collect *.md paths relative to a root directory. */
function collectMarkdownFiles(dir: string, root: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(full, root));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(path.relative(root, full));
    }
  }
  return results;
}

export default function (pi: ExtensionAPI) {
  let cachedRules: string[] = [];

  pi.on("session_start", (_event, ctx) => {
    const rulesDir = path.join(ctx.cwd, ".claude", "rules");
    const ruleFiles = collectMarkdownFiles(rulesDir, ctx.cwd);
    cachedRules = ruleFiles;
    if (ruleFiles.length > 0) {
      ctx.ui.notify(`Found ${ruleFiles.length} rule(s) in .claude/rules/`, "info");
    }
  });

  pi.on("before_agent_start", (event, _ctx) => {
    if (cachedRules.length === 0) {
      return;
    }
    const fileList = cachedRules.map((f) => `- ${f}`).join("\n");
    const rulesBlock = `

## Project Rules

This repository uses Claude-style project rules stored in .claude/rules/.

Available rule files:
${fileList}

Rule loading protocol:
- Before planning or editing code, inspect this list.
- Read any rule file whose name is relevant to the current task using the read tool.
- Treat these files as repo-specific operating instructions that override generic conventions.
- Do not assume rule content from filenames alone — read the file when relevant.`;
    return { systemPrompt: event.systemPrompt + rulesBlock };
  });
}
