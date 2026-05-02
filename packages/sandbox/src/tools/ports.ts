import { Type } from "typebox";
import type { ToolDefinition } from "../types.js";
import { SandboxConfig } from "../lib/config.js";
import { execCmd } from "../lib/docker.js";
import { captureSafe } from "../lib/exec.js";
import { readExposures } from "../lib/exposures.js";

interface Row {
  port: number;
  listening: boolean;
  label?: string;
  url?: string;
  /** e.g. `next-server (pid 35374)` — best-effort. */
  process?: string;
}

/** Parse `ss -tlnp` output into port→"command (pid N)" map. Root-owned sockets yield no entry. */
function parseListenerProcesses(ssOut: string): Map<number, string> {
  const out = new Map<number, string>();
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
  description: "Show container listeners (+ processes) and Caddy routes for a sandbox.",
  promptSnippet: "sandbox_ports — inspect listeners and routes",
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

    // Source 1: container-internal listeners from `ss -tlnp` (captures PID+command).
    // Falls back to `ss -tln` on older images.
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

    // Source 2: recorded routes (exposures registry).
    for (const e of readExposures().exposures) {
      const r: Row = rows.get(e.port) ?? { port: e.port, listening: false };
      r.label = e.routeName;
      r.url = e.url;
      rows.set(e.port, r);
    }

    if (rows.size === 0) {
      lines.push(`  (no listeners or routes)`);
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
      `  PORT   LISTENING  LABEL        URL                                       PROCESS`,
    );
    lines.push(
      `  ────   ─────────  ───────────  ────────────────────────────────────────  ────────────────────────`,
    );
    const sorted = [...rows.values()].sort((a, b) => a.port - b.port);
    for (const r of sorted) {
      const port = String(r.port).padEnd(5);
      const listening = (r.listening ? "yes" : "no").padStart(6).padEnd(9);
      const label = trunc(r.label, 11).padEnd(11);
      const url = trunc(r.url, 40).padEnd(40);
      const proc = trunc(r.process, 24);
      lines.push(`  ${port}  ${listening}  ${label}  ${url}  ${proc}`);
    }

    return {
      content: [{ type: "text" as const, text: lines.join("\n") }],
      details: undefined,
    };
  },
};
