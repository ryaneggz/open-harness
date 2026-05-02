/**
 * `oh clean [name]` — full cleanup (containers + volumes).
 */

import { SandboxConfig } from "../../lib/config.js";
import { composeDown, composeEnv } from "../../lib/docker.js";
import { runSafe } from "../../lib/exec.js";

export async function cleanAction(name?: string): Promise<void> {
  const config = new SandboxConfig({ name });
  const stopped = runSafe(composeDown(config, true), { env: composeEnv(config) });
  console.log(
    stopped
      ? `Sandbox '${config.name}' cleaned (containers stopped, volumes removed).`
      : `No running sandbox '${config.name}' found.`,
  );
}
