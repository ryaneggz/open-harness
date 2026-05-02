/**
 * `oh open <name|port>` — open a route's URL in the user's browser.
 *
 * If the positional parses as a number it is treated as a port; otherwise
 * it is treated as a route name (matches the legacy `resolveSubcommand`).
 */

export async function openAction(target: string): Promise<void> {
  const { openTool } = await import("../../tools/index.js");
  const maybePort = Number(target);
  const params: Record<string, unknown> = Number.isFinite(maybePort)
    ? { port: maybePort }
    : { routeName: target };

  const result = await openTool.execute("cli", params, undefined, undefined, undefined as never);
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}
