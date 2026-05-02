/**
 * `oh sandbox [name]` — provision (build + start) a sandbox.
 *
 * Pulled out of the legacy `runSubcommand` switch so each Commander action
 * can be lazy-loaded via dynamic `import()`.
 */

import { execSync } from "node:child_process";
import { SandboxConfig } from "../../lib/config.js";
import { composeUp, composeEnv } from "../../lib/docker.js";
import { run } from "../../lib/exec.js";

export async function sandboxAction(name?: string): Promise<void> {
  const config = new SandboxConfig({ name });
  const env = composeEnv(config);
  console.log(`Starting sandbox '${config.name}'...`);
  console.log(`Compose files: ${config.composeFiles.join(", ")}`);
  run(composeUp(config), { env });

  // Validate container is running
  let running = false;
  try {
    const status = execSync(`docker inspect -f '{{.State.Running}}' ${config.name}`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    running = status === "true";
  } catch {
    // container not found
  }

  if (!running) {
    console.error(`\nError: container '${config.name}' is not running.`);
    console.error("Check logs: docker logs " + config.name);
    process.exit(1);
  }

  // Get port mappings (only show what's actually mapped)
  let sshPort: string | null = null;
  let appPort: string | null = null;
  try {
    const ports = execSync(`docker port ${config.name}`, {
      encoding: "utf-8",
      stdio: "pipe",
    }).trim();
    const sshMatch = ports.match(/22\/tcp -> [\d.]+:(\d+)/);
    const appMatch = ports.match(/3000\/tcp -> [\d.]+:(\d+)/);
    if (sshMatch) sshPort = sshMatch[1];
    if (appMatch) appPort = appMatch[1];
  } catch {
    // no ports mapped
  }

  console.log(`\n  Sandbox '${config.name}' is running!\n`);
  console.log("  Connect:");
  if (sshPort) {
    console.log(`    SSH:    ssh sandbox@localhost -p ${sshPort}`);
  }
  console.log(`    Shell:  openharness shell ${config.name}`);
  if (appPort) {
    console.log(`    App:    http://localhost:${appPort}`);
  }
  console.log("");
  console.log("  Next steps:");
  console.log(`    openharness onboard ${config.name}    # one-time auth setup`);
}
