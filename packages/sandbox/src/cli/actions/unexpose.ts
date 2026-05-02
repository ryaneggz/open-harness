/**
 * `oh unexpose <name>` — remove a Caddy route for a sandbox app.
 */

export async function unexposeAction(name: string): Promise<void> {
  const { unexposeTool } = await import("../../tools/index.js");
  const result = await unexposeTool.execute(
    "cli",
    { routeName: name },
    undefined,
    undefined,
    undefined as never,
  );
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}
