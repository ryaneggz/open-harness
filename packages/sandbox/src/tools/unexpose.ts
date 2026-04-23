import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { listRoutes, removeExposure, removeRoute, type Exposure } from "../lib/exposures.js";
import { stopQuickTunnel } from "../lib/cloudflared.js";
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
  description:
    "Stop an active exposure. `unexpose <name>` removes a Caddy route; `unexpose <port> --public` stops a quick tunnel; `unexpose <port> --local` removes a local publish entry.",
  promptSnippet: "sandbox_unexpose — stop an active port exposure or route",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name" })),
    port: Type.Optional(Type.Number({ description: "Container port to unexpose" })),
    scope: Type.Optional(
      Type.Union([Type.Literal("local"), Type.Literal("public"), Type.Literal("route")], {
        description: "Which exposure to remove",
      }),
    ),
    routeName: Type.Optional(Type.String({ description: "Route name (for scope='route')" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const scope = params.scope as "local" | "public" | "route" | undefined;
    const config = new SandboxConfig({ name: params.name as string | undefined });
    const lines: string[] = [];

    if (scope === "route") {
      const routeName = params.routeName as string | undefined;
      if (!routeName) {
        throw new Error("scope='route' requires a routeName.");
      }
      const removed = removeRoute(routeName);
      if (!removed) {
        lines.push(`No route named '${routeName}' is active.`);
        return { content: [{ type: "text" as const, text: lines.join("\n") }], details: undefined };
      }

      const mode = detectMode();
      const routes: Route[] = listRoutes().map((e) => ({
        name: e.routeName!,
        port: e.port,
        sandbox: config.name,
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
    }

    const port = params.port as number | undefined;
    if (typeof port !== "number") {
      throw new Error("scope='local'|'public' requires a port.");
    }

    if (scope === "public") {
      const killed = stopQuickTunnel(config.name, port);
      removeExposure(port, "public");
      lines.push(
        killed
          ? `Public tunnel for port ${port} stopped.`
          : `No active public tunnel for port ${port} (registry entry cleared).`,
      );
    } else {
      // scope === "local"
      removeExposure(port, "local");
      lines.push(
        `Local exposure for port ${port} removed from registry. To actually close the host port, run 'openharness stop && openharness run' or remove '.devcontainer/docker-compose.expose.yml' from .openharness/config.json composeOverrides.`,
      );
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};

export { type Exposure };
