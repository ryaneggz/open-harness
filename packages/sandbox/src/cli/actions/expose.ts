/**
 * `oh expose <name> <port>` — expose a sandbox app via a Caddy route.
 *
 * Validation rules carried over from the legacy `resolveSubcommand`:
 *  - the first positional must be a route name (kebab-case), not a port;
 *  - the second positional must be a numeric port.
 */

export async function exposeAction(name: string, portArg: string): Promise<void> {
  if (!Number.isNaN(Number(name))) {
    console.error(
      `Usage: openharness expose <name> <port>\n` +
        `(The first positional is the route name, not a port. Example: openharness expose docs 8080)`,
    );
    process.exit(1);
  }

  const port = Number(portArg);
  if (!Number.isFinite(port)) {
    console.error(`Port must be a number, got '${portArg}'.`);
    process.exit(1);
  }

  const { exposeTool } = await import("../../tools/index.js");
  const result = await exposeTool.execute(
    "cli",
    { routeName: name, port },
    undefined,
    undefined,
    undefined as never,
  );
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}
