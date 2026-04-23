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
      exposure.scope === "public" && exposure.url
        ? exposure.url
        : `http://localhost:${exposure.hostPort ?? port}`;

    lines.push(`${exposure.scope === "public" ? "Public" : "Local"}: ${url}`);
    runSafe(["xdg-open", url], { stdio: "pipe" }) || runSafe(["open", url], { stdio: "pipe" });

    return { content: [{ type: "text" as const, text: lines.join("\n") }], details: undefined };
  },
};
