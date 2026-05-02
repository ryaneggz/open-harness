/**
 * `oh ports [name]` — inspect listeners and routes for a sandbox.
 */

export async function portsAction(name?: string): Promise<void> {
  const { portsTool } = await import("../../tools/index.js");
  const result = await portsTool.execute("cli", { name }, undefined, undefined, undefined as never);
  for (const item of result.content) {
    if (item.type === "text" && "text" in item) console.log(item.text);
  }
}
