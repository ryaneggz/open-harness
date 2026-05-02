/**
 * `oh shell <name>` — open an interactive bash shell inside a sandbox.
 */

import { spawnSync } from "node:child_process";
import { execCmd } from "../../lib/docker.js";

export async function shellAction(name: string): Promise<void> {
  const cmd = execCmd(name, ["bash", "--login"], {
    user: "sandbox",
    interactive: true,
    workdir: "/home/sandbox/harness",
  });
  spawnSync(cmd[0], cmd.slice(1), { stdio: "inherit" });
}
