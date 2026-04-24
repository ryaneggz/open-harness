import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { findRouteByName, findRouteByPort } from "../lib/exposures.js";
import { runSafe } from "../lib/exec.js";

export const openTool: ToolDefinition = {
  name: "sandbox_open",
  label: "Open Exposure",
  description: "Open an active route's URL in the default browser.",
  promptSnippet: "sandbox_open — open a route URL",
  parameters: Type.Object({
    routeName: Type.Optional(Type.String({ description: "Route name" })),
    port: Type.Optional(Type.Number({ description: "Container port (alternative to routeName)" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const routeName = params.routeName as string | undefined;
    const port = params.port as number | undefined;
    const lines: string[] = [];

    const route = routeName
      ? findRouteByName(routeName)
      : typeof port === "number"
        ? findRouteByPort(port)
        : undefined;

    if (!route) {
      const key = routeName ?? (port !== undefined ? `port ${port}` : "(no key given)");
      lines.push(`No route for ${key}.`);
      lines.push(`Run: openharness expose <name> <port>`);
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: undefined,
      };
    }

    lines.push(`Route: ${route.url}`);
    const opened =
      runSafe(["xdg-open", route.url], { stdio: "pipe" }) ||
      runSafe(["open", route.url], { stdio: "pipe" });
    if (!opened) lines.push(`(could not auto-open; copy the URL above)`);

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
