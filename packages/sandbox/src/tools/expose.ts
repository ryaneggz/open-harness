import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { composeUp, composeEnv, execCmd } from "../lib/docker.js";
import { captureSafe, run, runSafe } from "../lib/exec.js";
import { upsertExposure } from "../lib/exposures.js";
import { startQuickTunnel } from "../lib/cloudflared.js";

const OVERLAY_PATH = ".devcontainer/docker-compose.expose.yml";

export const exposeTool: ToolDefinition = {
  name: "sandbox_expose",
  label: "Expose App",
  description:
    "Expose an app running inside the sandbox — either locally (host port publish) or publicly (Cloudflare quick tunnel).",
  promptSnippet: "sandbox_expose — publish or tunnel a sandbox app port",
  parameters: Type.Object({
    name: Type.Optional(
      Type.String({ description: "Sandbox name (auto-resolved if omitted)" }),
    ),
    port: Type.Number({ description: "Container port to expose" }),
    scope: Type.Union([Type.Literal("local"), Type.Literal("public")], {
      description: "local = host port publish; public = Cloudflare quick tunnel",
    }),
    hostPort: Type.Optional(
      Type.String({ description: "(Phase 2) override host port for --local" }),
    ),
  }),

  async execute(_toolCallId, params: Record<string, unknown>) {
    const port = params.port as number;
    const scope = params.scope as "local" | "public";
    const config = new SandboxConfig({ name: params.name as string | undefined });
    const lines: string[] = [];

    if (params.hostPort) {
      lines.push(
        `Note: --host-port is not yet honored in Phase 1 (defaults to ${port}:${port}).`,
      );
    }

    // Listening pre-check — warning only, non-fatal.
    const ssOut = captureSafe(execCmd(config.name, ["ss", "-tln"], { user: "sandbox" }));
    if (ssOut === undefined) {
      lines.push(`Warning: sandbox '${config.name}' is not running; exposing anyway.`);
    } else if (!new RegExp(`:${port}\\b`).test(ssOut)) {
      lines.push(
        `Warning: nothing is listening on port ${port} inside '${config.name}'. Exposing anyway — start your app when ready.`,
      );
    }

    if (scope === "local") {
      SandboxConfig.addOverride(OVERLAY_PATH);
      lines.push(
        `Recreating container '${config.name}' to apply port mapping (no rebuild)…`,
      );
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
      // Verify cloudflared is available inside the sandbox.
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
