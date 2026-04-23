import { execCmd } from "./docker.js";
import { run, runSafe, captureSafe } from "./exec.js";

const URL_RE = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/;
const POLL_MS = 500;
const TIMEOUT_MS = 15_000;

function sessionName(port: number): string {
  return `expose-public-${port}`;
}

function logPath(port: number): string {
  return `/tmp/${sessionName(port)}.log`;
}

/**
 * Start a Cloudflare quick tunnel for the given port inside the named sandbox
 * container. The tunnel runs as a detached tmux session so it survives across
 * `docker exec` invocations.
 *
 * Resolves with the session name and the trycloudflare.com URL once the URL
 * appears in the tunnel log. Throws if no URL is seen within 15 seconds.
 */
export async function startQuickTunnel(
  name: string,
  port: number,
): Promise<{ session: string; url: string }> {
  const session = sessionName(port);
  const logFile = logPath(port);

  // Idempotency: kill any prior session with this name so we start fresh.
  runSafe(
    execCmd(name, ["tmux", "kill-session", "-t", session], { user: "sandbox" }),
    { stdio: "pipe" },
  );

  // Launch the tunnel in a detached tmux session. Pipe stderr into stdout and
  // tee everything to a log file so we can poll for the URL from outside.
  const launch = `cloudflared tunnel --url http://127.0.0.1:${port} --no-autoupdate 2>&1 | tee ${logFile}`;
  run(
    execCmd(
      name,
      ["tmux", "new-session", "-d", "-s", session, "bash", "-lc", launch],
      { user: "sandbox" },
    ),
    { stdio: "pipe" },
  );

  // Poll the log file until the trycloudflare.com URL appears.
  const deadline = Date.now() + TIMEOUT_MS;
  while (Date.now() < deadline) {
    const log =
      captureSafe(execCmd(name, ["cat", logFile], { user: "sandbox" })) ?? "";
    const match = URL_RE.exec(log);
    if (match) return { session, url: match[0] };
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_MS));
  }

  // Timeout — capture the tail of the log for diagnostics, kill the session,
  // then throw a descriptive error.
  const tail =
    captureSafe(
      execCmd(name, ["tail", "-n", "20", logFile], { user: "sandbox" }),
    ) ?? "(log unavailable)";
  runSafe(
    execCmd(name, ["tmux", "kill-session", "-t", session], { user: "sandbox" }),
    { stdio: "pipe" },
  );
  throw new Error(
    `cloudflared did not produce a trycloudflare URL within 15s.\nLast log lines:\n${tail}`,
  );
}

/**
 * Kill the tmux session for the given sandbox name + port.
 * Returns true if the session existed and was killed, false if it was already
 * gone.
 */
export function stopQuickTunnel(name: string, port: number): boolean {
  if (!isQuickTunnelAlive(name, port)) return false;
  runSafe(
    execCmd(name, ["tmux", "kill-session", "-t", sessionName(port)], {
      user: "sandbox",
    }),
    { stdio: "pipe" },
  );
  return true;
}

/**
 * Return true if the tmux session for the given sandbox name + port is
 * currently running.
 */
export function isQuickTunnelAlive(name: string, port: number): boolean {
  return runSafe(
    execCmd(name, ["tmux", "has-session", "-t", sessionName(port)], {
      user: "sandbox",
    }),
    { stdio: "pipe" },
  );
}
