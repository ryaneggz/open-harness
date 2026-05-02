/**
 * `oh stop [name]` — stop and remove a sandbox container.
 */

import { SandboxConfig } from "../../lib/config.js";
import { composeDown, composeEnv } from "../../lib/docker.js";
import { run } from "../../lib/exec.js";

export async function stopAction(name?: string): Promise<void> {
  const config = new SandboxConfig({ name });
  try {
    run(composeDown(config), { env: composeEnv(config) });
    console.log(`Sandbox '${config.name}' stopped.`);
  } catch {
    console.error(`Error: no sandbox '${config.name}' found to stop.`);
    process.exit(1);
  }
}
