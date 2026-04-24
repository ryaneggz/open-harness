import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { listRoutes, removeRoute, type Exposure } from "../lib/exposures.js";
import {
  detectMode,
  reloadCaddy,
  renderCaddyfile,
  writeCaddyfile,
  type Route,
} from "../lib/caddy.js";

export const unexposeTool: ToolDefinition = {
  name: "sandbox_unexpose",
  label: "Unexpose App",
  description: "Remove a Caddy route for a sandbox app.",
  promptSnippet: "sandbox_unexpose — remove a Caddy route",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name" })),
    routeName: Type.String({ description: "Route name to remove" }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const routeName = params.routeName as string;
    const config = new SandboxConfig({ name: params.name as string | undefined });
    const lines: string[] = [];

    const removed = removeRoute(routeName);
    if (!removed) {
      lines.push(`No route named '${routeName}' is active.`);
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: undefined,
      };
    }

    const mode = detectMode();
    const routes: Route[] = listRoutes().map((e) => ({
      name: e.routeName,
      port: e.port,
      sandbox: e.sandbox,
    }));
    writeCaddyfile(renderCaddyfile(routes, mode));

    const reloaded = reloadCaddy(config.name);
    if (!reloaded) {
      lines.push(
        `Warning: caddy reload failed. Route removed from registry but gateway may still serve it until next start.`,
      );
    }
    lines.push(`Route '${routeName}' removed.`);
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};

export { type Exposure };
