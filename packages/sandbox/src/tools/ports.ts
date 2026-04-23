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
  /** Route name (scope === "route"). */
  label?: string;
  /** e.g. `next-server (pid 35374)` — best-effort. */
  process?: string;
}

/** Parse `ss -tlnp` output into port→"command (pid N)" map. Root-owned sockets yield no entry. */
function parseListenerProcesses(ssOut: string): Map<number, string> {
  const out = new Map<number, string>();
  // Format: "LISTEN 0 511 *:8080 *:* users:(("next-server",pid=35374,fd=16))"
  const lineRe = /LISTEN[^\n]*:(\d+)\s+[^\n]*?users:\(\("([^"]+)",pid=(\d+)/g;
  for (const m of ssOut.matchAll(lineRe)) {
    const port = Number(m[1]);
    const cmd = m[2];
    const pid = m[3];
    if (!out.has(port)) out.set(port, `${cmd} (pid ${pid})`);
  }
  return out;
}

export const portsTool: ToolDefinition = {
  name: "sandbox_ports",
  label: "Inspect Ports",
  description:
    "Show port exposures and routes — container listeners (+ processes), host-port mappings, Caddy routes, Cloudflare tunnels.",
  promptSnippet: "sandbox_ports — inspect exposures, routes, and listeners",
  parameters: Type.Object({
    name: Type.Optional(Type.String({ description: "Sandbox name (auto-resolved if omitted)" })),
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

    // Source 2: container-internal listeners from `ss -tlnp` (captures PID+command).
    // Falls back to `ss -tln` on older images without iproute2-enough support.
    const ssOut =
      captureSafe(execCmd(config.name, ["ss", "-tlnp"], { user: "sandbox" })) ??
      captureSafe(execCmd(config.name, ["ss", "-tln"], { user: "sandbox" })) ??
      "";
    const procs = parseListenerProcesses(ssOut);
    const listenRe = /LISTEN\s+\d+\s+\d+\s+[^\s]*?:(\d+)\b/g;
    for (const m of ssOut.matchAll(listenRe)) {
      const port = Number(m[1]);
      const r: Row = rows.get(port) ?? { port, listening: false };
      r.listening = true;
      const p = procs.get(port);
      if (p && !r.process) r.process = p;
      rows.set(port, r);
    }

    // Source 3: recorded exposures (expose tool).
    for (const e of readExposures().exposures) {
      const r: Row = rows.get(e.port) ?? { port: e.port, listening: false };
      if (e.scope === "public") {
        const alive = isQuickTunnelAlive(config.name, e.port);
        r.public = alive ? (e.url ?? "—") : "(stale)";
      } else if (e.scope === "route") {
        r.label = e.routeName;
        if (e.url && !r.public) r.public = e.url;
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

    // Truncate helper for fixed-width columns.
    const trunc = (s: string | undefined, n: number): string => {
      const v = s ?? "—";
      return v.length > n ? v.slice(0, n - 1) + "…" : v;
    };

    lines.push(
      `  PORT   LISTENING  LABEL        LOCAL                    PUBLIC                         PROCESS`,
    );
    lines.push(
      `  ────   ─────────  ───────────  ──────────────────────   ─────────────────────────────  ────────────────────────`,
    );
    const sorted = [...rows.values()].sort((a, b) => a.port - b.port);
    for (const r of sorted) {
      const port = String(r.port).padEnd(5);
      const listening = (r.listening ? "yes" : "no").padStart(6).padEnd(9);
      const label = trunc(r.label, 11).padEnd(11);
      const local = trunc(r.local, 22).padEnd(22);
      const pub = trunc(r.public, 29).padEnd(29);
      const proc = trunc(r.process, 24);
      lines.push(`  ${port}  ${listening}  ${label}  ${local}   ${pub}  ${proc}`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
