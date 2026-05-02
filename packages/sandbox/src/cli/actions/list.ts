/**
 * `oh list` — list running sandbox containers.
 */

import { execSync } from "node:child_process";
import { psCmd } from "../../lib/docker.js";

export async function listAction(): Promise<void> {
  console.log("\n  Running containers:");
  try {
    const ps = execSync(psCmd().join(" "), { encoding: "utf-8" }).trim();
    console.log(ps || "  (none)");
  } catch {
    console.log("  (docker not available or no containers running)");
  }
}
