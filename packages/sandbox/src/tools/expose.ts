import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { composeUp, composeEnv, execCmd } from "../lib/docker.js";
import { captureSafe, run, runSafe } from "../lib/exec.js";
import { listRoutes, upsertExposure, type Exposure } from "../lib/exposures.js";
import { startQuickTunnel } from "../lib/cloudflared.js";
import {
  detectMode,
  hostFor,
  reloadCaddy,
  renderCaddyfile,
  validateRouteName,
  writeCaddyfile,
  type Route,
} from "../lib/caddy.js";

const EXPOSE_OVERLAY_PATH = ".devcontainer/docker-compose.expose.yml";
const GATEWAY_OVERLAY_PATH = ".devcontainer/docker-compose.gateway.yml";

const DEPRECATION_NOTE =
  "Note: --local and --public are deprecated. Prefer: `openharness expose <name> <port>` " +
  "(Caddy-backed, TLS, no container recreate).";

export const exposeTool: ToolDefinition = {
  name: "sandbox_expose",
  label: "Expose App",
  description:
    "Expose an app running inside the sandbox. Primary: `expose <name> <port>` → Caddy route. Legacy: `--local` host-port publish or `--public` Cloudflare quick tunnel.",
  promptSnippet:
    "sandbox_expose — publish a sandbox app (Caddy route, host-port, or public tunnel)",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
    port: Type.Number({ description: "Container port to expose" }),
    scope: Type.Union([Type.Literal("local"), Type.Literal("public"), Type.Literal("route")], {
      description: "route = Caddy gateway (default); local = host publish; public = quick tunnel",
    }),
    routeName: Type.Optional(
      Type.String({ description: "Route name (required when scope === 'route')" }),
    ),
    hostPort: Type.Optional(Type.String({ description: "Override host port for --local" })),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const port = params.port as number;
    const scope = params.scope as "local" | "public" | "route";
    const config = new SandboxConfig({ name: params.name as string | undefined });
    const lines: string[] = [];

    // Listening pre-check — warning only, non-fatal.
    const ssOut = captureSafe(execCmd(config.name, ["ss", "-tln"], { user: "sandbox" }));
    if (ssOut === undefined) {
      lines.push(`Warning: sandbox '${config.name}' is not running; exposing anyway.`);
    } else if (!new RegExp(`:${port}\\b`).test(ssOut)) {
      lines.push(
        `Warning: nothing is listening on port ${port} inside '${config.name}'. Exposing anyway — start your app when ready.`,
      );
    }

    if (scope === "route") {
      const routeName = params.routeName as string | undefined;
      if (!routeName) {
        throw new Error("scope='route' requires a routeName.");
      }
      validateRouteName(routeName);

      const mode = detectMode();
      const route: Route = { name: routeName, port, sandbox: config.name };

      // Activate gateway overlay on first route (idempotent).
      SandboxConfig.addOverride(GATEWAY_OVERLAY_PATH);

      const host = hostFor(route, mode);
      const suffix = mode.mode === "remote" ? "" : ":8443";
      const exposure: Exposure = {
        port,
        scope: "route",
        routeName,
        url: `https://${host}${suffix}`,
        createdAt: new Date().toISOString(),
      };
      upsertExposure(exposure);

      // Re-read the full set of routes and rewrite the Caddyfile.
      const routes: Route[] = listRoutes().map((e) => ({
        name: e.routeName!,
        port: e.port,
        sandbox: config.name,
      }));
      writeCaddyfile(renderCaddyfile(routes, mode));

      const reloaded = reloadCaddy(config.name);
      if (!reloaded) {
        lines.push(
          `Warning: caddy reload failed. If the gateway isn't running yet, run 'openharness run' to start it.`,
        );
      }

      lines.push(`Route: ${exposure.url}`);
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: undefined,
      };
    }

    // ── legacy paths ──────────────────────────────────────────────
    lines.push(DEPRECATION_NOTE);

    if (params.hostPort) {
      lines.push(`Note: --host-port is not yet honored (defaults to ${port}:${port}).`);
    }

    if (scope === "local") {
      SandboxConfig.addOverride(EXPOSE_OVERLAY_PATH);
      lines.push(`Recreating container '${config.name}' to apply port mapping (no rebuild)…`);
      run([...composeUp(config, { build: false, forceRecreate: true }), "sandbox"], {
        env: composeEnv(config),
      });

      // Verify the port mapping was applied.
      const portOut = captureSafe(["docker", "port", config.name]) ?? "";
      if (!new RegExp(`${port}/tcp -> [\\d.]+:(\\d+)`).test(portOut)) {
        throw new Error(
          `host port ${port} is already in use (or mapping failed). Pick another with --host-port <N>.`,
        );
      }

      upsertExposure({
        port,
        scope: "local",
        hostPort: port,
        createdAt: new Date().toISOString(),
      });
      lines.push(`Local: http://localhost:${port}`);
    } else {
      // scope === "public"
      const hasCloudflared = runSafe(
        execCmd(config.name, ["which", "cloudflared"], { user: "sandbox" }),
        { stdio: "pipe" },
      );
      if (!hasCloudflared) {
        throw new Error(
          "cloudflared is not installed in the sandbox. Add '.devcontainer/docker-compose.cloudflared.yml' to '.openharness/config.json' composeOverrides and run 'openharness run'.",
        );
      }

      const { session, url } = await startQuickTunnel(config.name, port);
      upsertExposure({
        port,
        scope: "public",
        url,
        session,
        createdAt: new Date().toISOString(),
      });
      lines.push(`Public: ${url}`);
      lines.push(`  (tmux session: ${session})`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
