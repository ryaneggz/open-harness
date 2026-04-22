/**
 * Step 3/6 — Slack (Mom Bot). Port of `install/onboard.sh:121-290`.
 *
 * Responsibilities, top to bottom:
 *   1. Load Slack tokens from host `~/harness/.devcontainer/.env` into
 *      deps.env if missing. This is the file docker-compose reads on
 *      rebuild; tokens persisted anywhere else are lost.
 *   2. Resolve the `mom` command: global CLI, then `node <dist>/main.js`,
 *      then build the dist on demand.
 *   3. If tokens missing, prompt + collect, persist to
 *      `~/harness/.devcontainer/.env`.
 *   4. Bootstrap `~/.openharness/agent/{settings,auth}.json` symlinks from
 *      `~/.pi/agent/…`.
 *   5. Ensure Mom has LLM auth (`~/.pi/slack/auth.json` symlink).
 *   6. Detect an already-running tmux session connected to Slack → done.
 *   7. Otherwise (re)start tmux session, poll up to 15 seconds for
 *      "connected and listening" (done) or an error (failed).
 */

import { loadEnvInto, upsertEnvFile } from "../env.js";
import type { Deps, Step, StepResult, StepStatus } from "../types.js";

const MAX_POLLS = 15;
const POLL_INTERVAL_MS = 1000;
const CONNECTED_MARKER = "connected and listening";
const ERROR_MARKERS = [/Run error/, /Error/, /Missing env/];

export const slackStep: Step = {
  id: "slack",
  label: "Step 3/6 — Slack (Mom Bot)",
  async run(deps): Promise<StepResult> {
    const { io, fs, home, env } = deps;
    const hostEnvPath = `${home}/harness/.devcontainer/.env`;

    if (!env.SLACK_APP_TOKEN) {
      loadEnvInto(fs, hostEnvPath, env);
    }

    const momCmd = resolveMomCmd(deps);
    if (!momCmd.cmd) {
      io.fail(momCmd.reason ?? "packages/slack not found — cannot run mom");
    }

    let appToken = env.SLACK_APP_TOKEN ?? "";
    let botToken = env.SLACK_BOT_TOKEN ?? "";
    let promptedSkip = false;

    if (appToken && botToken) {
      io.ok("Slack tokens detected from environment");
    } else {
      const setup = await io.ask("Set up Slack bot (Mom)? [y/N]:");
      if (!/^[Yy]$/.test(setup)) {
        io.skip("Skipped — run 'openharness onboard --force' later to set up");
        promptedSkip = true;
      } else {
        printSlackAppInstructions(deps);
        appToken = (await io.ask("App Token (xapp-...):")).trim();
        botToken = (await io.ask("Bot Token (xoxb-...):")).trim();

        if (appToken && botToken) {
          env.SLACK_APP_TOKEN = appToken;
          env.SLACK_BOT_TOKEN = botToken;
          io.ok("Tokens set for this session");
          persistTokens(deps, hostEnvPath, appToken, botToken);
        } else {
          io.warn("Tokens not provided");
          appToken = "";
          botToken = "";
        }
      }
    }

    bootstrapOpenharnessAgent(deps);

    if (promptedSkip) {
      return { id: "slack", status: "skipped" };
    }
    if (!appToken || !botToken) {
      return { id: "slack", status: "skipped" };
    }
    if (!momCmd.cmd) {
      return { id: "slack", status: "failed" };
    }

    ensureMomLlmAuth(deps);

    const alreadyRunning = isMomConnected(deps);
    if (alreadyRunning) {
      io.ok("Mom already running and connected (started by entrypoint)");
      return { id: "slack", status: "done" };
    }

    return await startAndValidateMom(deps, momCmd.cmd);
  },
};

interface ResolvedMom {
  cmd: string[] | null;
  reason?: string;
}

function resolveMomCmd(deps: Deps): ResolvedMom {
  const { fs, exec, io } = deps;
  const slackPkg = "/home/sandbox/harness/packages/slack";

  if (exec.which("mom")) {
    return { cmd: ["mom"] };
  }

  const dist = `${slackPkg}/dist/main.js`;
  if (fs.exists(dist)) {
    io.warn("mom CLI not on PATH — using direct node invocation");
    return { cmd: ["node", dist] };
  }

  if (!fs.exists(`${slackPkg}/package.json`)) {
    return { cmd: null, reason: `packages/slack not found at ${slackPkg} — cannot run mom` };
  }

  io.warn("Building Slack bot dist...");
  const installOk = exec.runSafe(["pnpm", "install"], { cwd: slackPkg });
  const buildOk = installOk && exec.runSafe(["pnpm", "run", "build"], { cwd: slackPkg });
  if (!buildOk) {
    io.fail("Slack bot build failed — see /tmp/mom-install.log");
    return { cmd: null };
  }
  io.ok("Built (rebuild the container to restore the global 'mom' command)");
  return { cmd: ["node", dist] };
}

function printSlackAppInstructions(deps: Deps): void {
  const { io } = deps;
  io.raw("\n  \x1b[1mCreate a Slack app:\x1b[0m\n");
  io.raw("    1. Go to \x1b[0;36mhttps://api.slack.com/apps\x1b[0m\n");
  io.raw("    2. Click \x1b[1mCreate New App\x1b[0m → \x1b[1mFrom a manifest\x1b[0m\n");
  io.raw("    3. Select your workspace, then paste this manifest:\n");
  io.raw("\n       \x1b[0;36m~/install/slack-manifest.json\x1b[0m\n");
  io.raw(
    "\n       (or copy from: \x1b[0;36mhttps://github.com/ryaneggz/open-harness/blob/main/install/slack-manifest.json\x1b[0m)\n",
  );
  io.raw("\n    4. Click \x1b[1mCreate\x1b[0m, then:\n");
  io.raw(
    "       - \x1b[1mBasic Information\x1b[0m → \x1b[1mApp-Level Tokens\x1b[0m → Generate (scope: \x1b[0;36mconnections:write\x1b[0m)\n",
  );
  io.raw("         This is your \x1b[1mApp Token\x1b[0m (starts with \x1b[0;36mxapp-\x1b[0m)\n");
  io.raw("       - \x1b[1mOAuth & Permissions\x1b[0m → \x1b[1mInstall to Workspace\x1b[0m\n");
  io.raw("         This is your \x1b[1mBot Token\x1b[0m (starts with \x1b[0;36mxoxb-\x1b[0m)\n\n");
}

function persistTokens(deps: Deps, hostEnvPath: string, appToken: string, botToken: string): void {
  const { io, fs, home } = deps;
  const devcontainerDir = `${home}/harness/.devcontainer`;
  if (!fs.exists(devcontainerDir)) {
    io.warn(`Cannot write to ${hostEnvPath} — tokens valid for this session only`);
    io.raw("    Add manually to .devcontainer/.env on the host:\n");
    io.raw(`      SLACK_APP_TOKEN=${appToken}\n`);
    io.raw(`      SLACK_BOT_TOKEN=${botToken}\n`);
    return;
  }
  try {
    upsertEnvFile(fs, hostEnvPath, {
      SLACK_APP_TOKEN: appToken,
      SLACK_BOT_TOKEN: botToken,
    });
    io.ok("Tokens saved to .devcontainer/.env (persist across rebuilds)");
  } catch {
    io.warn(`Cannot write to ${hostEnvPath} — tokens valid for this session only`);
    io.raw("    Add manually to .devcontainer/.env on the host:\n");
    io.raw(`      SLACK_APP_TOKEN=${appToken}\n`);
    io.raw(`      SLACK_BOT_TOKEN=${botToken}\n`);
  }
}

/**
 * Create `~/.openharness/agent/{settings,auth}.json` symlinks pointing at
 * the `.pi/agent/...` equivalents, matching the bash bootstrap.
 */
function bootstrapOpenharnessAgent(deps: Deps): void {
  const { fs, home } = deps;
  const ohAgent = `${home}/.openharness/agent`;
  fs.mkdirp(ohAgent);

  for (const name of ["settings.json", "auth.json"]) {
    const link = `${ohAgent}/${name}`;
    const target = `${home}/.pi/agent/${name}`;
    if (!fs.exists(link) && fs.exists(target)) {
      try {
        fs.symlink(target, link);
      } catch {
        /* best-effort */
      }
    }
  }
}

function ensureMomLlmAuth(deps: Deps): void {
  const { fs, io, home, env } = deps;
  const slackDir = `${home}/.pi/slack`;
  const slackAuth = `${slackDir}/auth.json`;
  if (fs.exists(slackAuth) || env.OPENAI_API_KEY) return;
  const piAuth = `${home}/.pi/agent/auth.json`;
  if (fs.exists(piAuth)) {
    fs.mkdirp(slackDir);
    try {
      fs.symlink(piAuth, slackAuth);
      io.ok("Linked Mom auth to Pi agent (shared key store)");
    } catch {
      /* ignore */
    }
  } else {
    io.warn("Mom needs LLM auth to respond. Complete Step 1 first.");
  }
}

function isMomConnected(deps: Deps): boolean {
  if (!deps.exec.runSafe(["tmux", "has-session", "-t", "slack"])) return false;
  const res = deps.exec.capture(["tmux", "capture-pane", "-t", "slack", "-p"]);
  return res.stdout.includes(CONNECTED_MARKER) || res.stderr.includes(CONNECTED_MARKER);
}

async function startAndValidateMom(deps: Deps, momCmd: string[]): Promise<StepResult> {
  const { exec, io, clock, env, home } = deps;

  exec.runSafe(["tmux", "kill-session", "-t", "slack"]);
  const slackDir = `${home}/harness/workspace/.slack`;
  const momInvocation = [...momCmd, "--sandbox=host", slackDir].join(" ");
  exec.run(["tmux", "new-session", "-d", "-s", "slack", momInvocation], {
    env: {
      SLACK_APP_TOKEN: env.SLACK_APP_TOKEN ?? "",
      SLACK_BOT_TOKEN: env.SLACK_BOT_TOKEN ?? "",
    },
  });

  io.raw("\n  Validating Slack connection");
  let status: StepStatus = "failed";
  for (let i = 0; i < MAX_POLLS; i++) {
    io.raw(".");
    const output = deps.exec.capture(["tmux", "capture-pane", "-t", "slack", "-p"]);
    const combined = output.stdout + "\n" + output.stderr;
    if (combined.includes(CONNECTED_MARKER)) {
      status = "done";
      break;
    }
    if (ERROR_MARKERS.some((re) => re.test(combined))) {
      break;
    }
    await clock.sleep(POLL_INTERVAL_MS);
  }
  io.raw("\n");

  if (status === "done") {
    io.ok("Mom connected to Slack");
    return { id: "slack", status: "done" };
  }
  io.fail("Mom failed to connect — check logs: tmux attach -t slack");
  return { id: "slack", status: "failed" };
}
