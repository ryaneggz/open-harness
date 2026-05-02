/**
 * `oh run [name]` — start an existing sandbox container.
 */

import { SandboxConfig } from "../../lib/config.js";
import { composeUp, composeEnv } from "../../lib/docker.js";
import { run } from "../../lib/exec.js";

export async function runAction(name?: string): Promise<void> {
  const config = new SandboxConfig({ name });
  run(composeUp(config), { env: composeEnv(config) });
  console.log(`Sandbox '${config.name}' started.`);
}
