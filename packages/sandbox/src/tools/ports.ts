import { Type } from "@sinclair/typebox";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import { SandboxConfig } from "../lib/config.js";
import { execCmd } from "../lib/docker.js";
import { captureSafe } from "../lib/exec.js";
import { readExposures } from "../lib/exposures.js";
import { isQuickTunnelAlive } from "../lib/cloudflared.js";

interface Row {
  port: number;
  listening: boolean;
  local?: string;
  public?: string;
}

export const portsTool: ToolDefinition = {
  name: "sandbox_ports",
  label: "Inspect Ports",
  description:
    "Show port exposures (container listeners, host ports, public tunnels) for a sandbox.",
  promptSnippet: "sandbox_ports — inspect current port exposures",
  parameters: Type.Object({
    name: Type.Optional(
      Type.String({ description: "Sandbox name (auto-resolved if omitted)" }),
    ),
  }),

  async execute(_toolCallId: string, params: Record<string, unknown>) {
    const config = new SandboxConfig({
      name: params.name as string | undefined,
    });
    const lines: string[] = [`\nPorts for sandbox '${config.name}':`];

    // Probe docker port — undefined if container is not running.
    const portOut = captureSafe(["docker", "port", config.name]);
    if (portOut === undefined) {
      lines.push(`  Sandbox '${config.name}' is not running.`);
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: undefined,
      };
    }

    // Build row map keyed by container port.
    const rows = new Map<number, Row>();

    // Source 1: host port mappings from `docker port <name>`.
    const hostRe = /(\d+)\/tcp -> [\d.]+:(\d+)/g;
    for (const m of portOut.matchAll(hostRe)) {
      const container = Number(m[1]);
      const host = Number(m[2]);
      const r: Row = rows.get(container) ?? { port: container, listening: false };
      r.local = `http://localhost:${host}`;
      rows.set(container, r);
    }

    // Source 2: container-internal listeners from `ss -tln`.
    const ssOut =
      captureSafe(execCmd(config.name, ["ss", "-tln"], { user: "sandbox" })) ??
      "";
    const listenRe = /LISTEN\s+\d+\s+\d+\s+[^\s]*?:(\d+)\b/g;
    for (const m of ssOut.matchAll(listenRe)) {
      const port = Number(m[1]);
      const r: Row = rows.get(port) ?? { port, listening: false };
      r.listening = true;
      rows.set(port, r);
    }

    // Source 3: recorded exposures (expose tool).
    for (const e of readExposures().exposures) {
      const r: Row = rows.get(e.port) ?? { port: e.port, listening: false };
      if (e.scope === "public") {
        const alive = isQuickTunnelAlive(config.name, e.port);
        r.public = alive ? (e.url ?? "—") : "(stale)";
      } else if (!r.local) {
        r.local = `http://localhost:${e.hostPort ?? e.port}`;
      }
      rows.set(e.port, r);
    }

    if (rows.size === 0) {
      lines.push(`  (no exposures)`);
      return {
        content: [{ type: "text" as const, text: lines.join("\n") }],
        details: undefined,
      };
    }

    lines.push(`  PORT   LISTENING  LOCAL                    PUBLIC`);
    lines.push(
      `  ────   ─────────  ──────────────────────   ──────────────────────────────────`,
    );
    const sorted = [...rows.values()].sort((a, b) => a.port - b.port);
    for (const r of sorted) {
      const port = String(r.port).padEnd(5);
      const listening = (r.listening ? "yes" : "no").padStart(6).padEnd(9);
      const local = (r.local ?? "—").padEnd(22);
      const pub = r.public ?? "—";
      lines.push(`  ${port}  ${listening}  ${local}   ${pub}`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
