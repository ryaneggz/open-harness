/**
 * `oh harness <add|list|remove>` — manage harness packs.
 *
 * Placeholder for PR2 of the openharness/mifune split. The real
 * implementation lands in T5 alongside `src/harness/pack.ts` and
 * `src/harness/registry.ts`. For now, every action prints a "not yet
 * implemented" message and exits non-zero so CI / users have a clear
 * signal that the surface exists but is not wired up.
 */

function notImplemented(subcommand: string): never {
  console.error(`oh harness ${subcommand}: not yet implemented (T5)`);
  process.exit(1);
}

export async function harnessAddAction(_spec: string): Promise<void> {
  notImplemented("add");
}

export async function harnessListAction(): Promise<void> {
  notImplemented("list");
}

export async function harnessRemoveAction(_name: string): Promise<void> {
  notImplemented("remove");
}
