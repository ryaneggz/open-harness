import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { findExposure } from "../lib/exposures.js";
import { runSafe } from "../lib/exec.js";

export const openTool: ToolDefinition = {
  name: "sandbox_open",
  label: "Open Exposure",
  description: "Open an exposed app's URL (prefers public tunnel over local).",
  promptSnippet: "sandbox_open — open an exposed app URL",
  parameters: Type.Object({
    port: Type.Number({ description: "Container port to open" }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const port = params.port as number;
    const lines: string[] = [];

    const exposure = findExposure(port);
    if (!exposure) {
      lines.push(`No exposure for port ${port}.`);
      lines.push(`Run: openharness expose ${port} --local`);
      return { content: [{ type: "text" as const, text: lines.join("\n") }], details: undefined };
    }

    const url =
      (exposure.scope === "public" || exposure.scope === "route") && exposure.url
        ? exposure.url
        : `http://localhost:${exposure.hostPort ?? port}`;

    const scopeLabel =
      exposure.scope === "public" ? "Public" : exposure.scope === "route" ? "Route" : "Local";
    lines.push(`${scopeLabel}: ${url}`);
    const opened =
      runSafe(["xdg-open", url], { stdio: "pipe" }) || runSafe(["open", url], { stdio: "pipe" });
    if (!opened) lines.push(`(could not auto-open; copy the URL above)`);

    return { content: [{ type: "text" as const, text: lines.join("\n") }], details: undefined };
  },
};
