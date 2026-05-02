/**
 * `oh harness <add|list|remove>` — manage harness packs.
 *
 * Thin CLI shell over `src/harness/pack.ts`. Every action prints
 * human-readable status and exits non-zero on failure so CI scripts
 * can wire `oh harness` calls into provisioning steps.
 */

import { installPack, uninstallPack } from "../../harness/pack.js";
import { readHarnessRegistry } from "../../harness/registry.js";

export async function harnessAddAction(spec: string): Promise<void> {
  console.log(`Installing harness pack '${spec}' ...`);
  try {
    const { entry, warnings } = await installPack(spec);
    console.log(`✓ Installed ${entry.manifest.name}@${entry.version} (${entry.source})`);
    console.log(`  Path: ${entry.path}`);
    if (entry.manifest.compose_overlays.length > 0) {
      console.log(`  Compose overlays: ${entry.manifest.compose_overlays.length} registered`);
    }
    if (entry.manifest.onboard_steps.length > 0) {
      console.log(`  Onboard steps: ${entry.manifest.onboard_steps.map((s) => s.id).join(", ")}`);
    }
    for (const w of warnings) console.warn(`  warn: ${w}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ Install failed: ${msg}`);
    process.exit(1);
  }
}

export async function harnessListAction(): Promise<void> {
  const registry = readHarnessRegistry();
  if (registry.installed.length === 0) {
    console.log("No harness packs installed.");
    console.log("  Try: oh harness add @ryaneggz/mifune");
    return;
  }
  console.log(`${registry.installed.length} harness pack(s) installed:\n`);
  for (const entry of registry.installed) {
    console.log(`  ${entry.manifest.name}@${entry.version}`);
    console.log(`    source: ${entry.source}  (${entry.spec})`);
    console.log(`    path:   ${entry.path}`);
    if (entry.manifest.agents.length > 0) {
      console.log(`    agents: ${entry.manifest.agents.join(", ")}`);
    }
  }
}

export async function harnessRemoveAction(name: string): Promise<void> {
  console.log(`Removing harness pack '${name}' ...`);
  try {
    const { removed, warnings } = await uninstallPack(name);
    if (!removed) {
      console.log(`No harness pack named '${name}' is installed.`);
      return;
    }
    console.log(`✓ Removed ${removed.manifest.name}@${removed.version} (${removed.source})`);
    for (const w of warnings) console.warn(`  warn: ${w}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`✗ Remove failed: ${msg}`);
    process.exit(1);
  }
}
