/**
 * Step 1/6 — LLM Provider (OpenAI). Port of `install/onboard.sh:74-116`.
 *
 *   - `~/.pi/agent/auth.json` populated (non-empty + not `"{}"`) → done.
 *   - Else `OPENAI_API_KEY` env set → done.
 *   - Else prompt user; "n" → skipped.
 *           any other answer → run `openharness` (interactive), re-check
 *           auth.json. If present, symlink it to `~/.pi/slack/auth.json` and
 *           return done. If still missing, warn + skipped.
 */

import type { Step, StepResult } from "../types.js";

export const llmStep: Step = {
  id: "llm",
  label: "Step 1/6 — LLM Provider (OpenAI)",
  async run(deps): Promise<StepResult> {
    const { io, fs, exec, home, env } = deps;
    const piAuth = `${home}/.pi/agent/auth.json`;

    io.raw("  This sandbox uses \x1b[1mopenharness\x1b[0m (Pi agent) for AI tasks.\n");
    io.raw("  You need to authenticate with an LLM provider first.\n\n");

    if (authPopulated(fs, piAuth)) {
      const provider = detectProvider(fs, piAuth);
      io.ok(`Already authenticated (provider: ${provider})`);
      return { id: "llm", status: "done" };
    }

    if (env.OPENAI_API_KEY && env.OPENAI_API_KEY.length > 0) {
      io.ok("OPENAI_API_KEY set via environment");
      return { id: "llm", status: "done" };
    }

    io.raw("  \x1b[1mInside the sandbox, run:\x1b[0m\n\n");
    io.raw("    \x1b[0;36mopenharness\x1b[0m          # launches the agent CLI\n");
    io.raw("    \x1b[0;36m/login\x1b[0m               # authenticate with OpenAI\n");
    io.raw("    \x1b[0;36m/model\x1b[0m               # select \x1b[1mgpt-5.4\x1b[0m\n");
    io.raw("    \x1b[0;36mCtrl+C\x1b[0m               # exit back to onboarding\n\n");

    const answer = await io.ask("Authenticate now? [Y/n]:");
    if (/^[Nn]$/.test(answer)) {
      io.skip("Skipped — run 'openharness' then '/login' later");
      return { id: "llm", status: "skipped" };
    }

    io.raw(
      "\n  Launching openharness — run \x1b[1m/login\x1b[0m then \x1b[1m/model\x1b[0m to set up.\n",
    );
    io.raw("  Press \x1b[1mCtrl+C\x1b[0m when done to continue onboarding.\n\n");
    exec.runSafe(["openharness"]);

    if (authPopulated(fs, piAuth)) {
      io.ok("LLM provider authenticated");
      fs.mkdirp(`${home}/.pi/slack`);
      const slackLink = `${home}/.pi/slack/auth.json`;
      if (!fs.exists(slackLink)) {
        fs.symlink(piAuth, slackLink);
      }
      io.ok("Auth shared with Mom (Slack bot)");
      return { id: "llm", status: "done" };
    }
    io.warn("Auth not detected — run 'openharness' and '/login' later");
    return { id: "llm", status: "skipped" };
  },
};

function authPopulated(
  fs: {
    exists(p: string): boolean;
    readFile(p: string): string;
    stat(p: string): { size: number } | null;
  },
  path: string,
): boolean {
  if (!fs.exists(path)) return false;
  const stat = fs.stat(path);
  if (!stat || stat.size === 0) return false;
  try {
    const contents = fs.readFile(path).trim();
    return contents !== "" && contents !== "{}";
  } catch {
    return false;
  }
}

function detectProvider(fs: { readFile(p: string): string }, path: string): string {
  try {
    const parsed = JSON.parse(fs.readFile(path));
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed);
      if (keys.length > 0) return keys[0];
    }
  } catch {
    /* ignore */
  }
  return "unknown";
}
