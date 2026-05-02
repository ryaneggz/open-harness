/**
 * `oh heartbeat <start|stop|status> <name>` — manage the heartbeat daemon
 * inside a sandbox. Each subcommand delegates to `sandbox_heartbeat`'s
 * existing actions:
 *
 *   start  → tool action `sync`   (re-read heartbeat .md files)
 *   stop   → tool action `stop`   (remove all schedules)
 *   status → tool action `status` (show schedules and logs)
 */

type HeartbeatAction = "sync" | "stop" | "status";

async function runHeartbeat(name: string, action: HeartbeatAction): Promise<void> {
  const { heartbeatTool } = await import("../../tools/index.js");
  const result = await heartbeatTool.execute(
    "cli",
    { name, action },
    undefined,
    undefined,
    undefined as never,
  );
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}

export async function heartbeatStartAction(name: string): Promise<void> {
  await runHeartbeat(name, "sync");
}

export async function heartbeatStopAction(name: string): Promise<void> {
  await runHeartbeat(name, "stop");
}

export async function heartbeatStatusAction(name: string): Promise<void> {
  await runHeartbeat(name, "status");
}
