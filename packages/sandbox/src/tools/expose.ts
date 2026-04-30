import { Type } from "typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { execCmd } from "../lib/docker.js";
import { captureSafe } from "../lib/exec.js";
import { listRoutes, upsertExposure, type Exposure } from "../lib/exposures.js";
import {
  detectMode,
  hostFor,
  reloadCaddy,
  renderCaddyfile,
  validateRouteName,
  writeCaddyfile,
  type Route,
} from "../lib/caddy.js";

const GATEWAY_OVERLAY_PATH = ".devcontainer/docker-compose.gateway.yml";

export const exposeTool: ToolDefinition = {
  name: "sandbox_expose",
  label: "Expose App",
  description:
    "Expose a sandbox app via a Caddy route. Laptop: https://<name>.<sandbox>.localhost:8443 (tls internal). Remote (PUBLIC_DOMAIN set): https://<name>.<sandbox>.<PUBLIC_DOMAIN>.",
  promptSnippet: "sandbox_expose — route a sandbox app through the Caddy gateway",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
    routeName: Type.String({
      description: "Route name — forms the hostname prefix (kebab-case, 1–30 chars)",
    }),
    port: Type.Number({ description: "Container port the app is listening on" }),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const port = params.port as number;
    const routeName = params.routeName as string;
    validateRouteName(routeName);

    const config = new SandboxConfig({ name: params.name as string | undefined });
    const lines: string[] = [];

    // Listening pre-check — warning only, non-fatal.
    const ssOut = captureSafe(execCmd(config.name, ["ss", "-tln"], { user: "sandbox" }));
    if (ssOut === undefined) {
      lines.push(`Warning: sandbox '${config.name}' is not running; routing anyway.`);
    } else if (!new RegExp(`:${port}\\b`).test(ssOut)) {
      lines.push(
        `Warning: nothing is listening on port ${port} inside '${config.name}'. Route added — start your app when ready.`,
      );
    }

    const mode = detectMode();
    const route: Route = { name: routeName, port, sandbox: config.name };
    const host = hostFor(route, mode);
    const suffix = mode.mode === "remote" ? "" : ":8443";
    const url = `https://${host}${suffix}`;

    // Activate gateway overlay on first route (idempotent).
    SandboxConfig.addOverride(GATEWAY_OVERLAY_PATH);

    const exposure: Exposure = {
      routeName,
      port,
      sandbox: config.name,
      url,
      createdAt: new Date().toISOString(),
    };
    upsertExposure(exposure);

    const routes: Route[] = listRoutes().map((e) => ({
      name: e.routeName,
      port: e.port,
      sandbox: e.sandbox,
    }));
    writeCaddyfile(renderCaddyfile(routes, mode));

    const reloaded = reloadCaddy(config.name);
    if (!reloaded) {
      lines.push(
        `Warning: caddy reload failed. If the gateway isn't running yet, run 'openharness run' to start it.`,
      );
    }

    lines.push(`Route: ${url}`);
    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
