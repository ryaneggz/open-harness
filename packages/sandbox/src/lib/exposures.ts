import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const EXPOSURES_PATH = ".openharness/exposures.json";

/**
 * A single named Caddy route from the gateway to a sandbox port.
 * This is the only exposure shape — legacy `--local` host-port publishes and
 * `--public` quick-tunnels were removed in favour of the gateway.
 */
export interface Exposure {
  routeName: string;
  port: number;
  sandbox: string;
  url: string;
  createdAt: string;
}

export interface ExposuresFile {
  version: 1;
  exposures: Exposure[];
}

const EMPTY: ExposuresFile = { version: 1, exposures: [] };

/**
 * Type guard that also filters out any pre-gateway entries left from the
 * deprecated scope-union era. Safe to apply to raw parsed JSON.
 */
function isExposure(x: unknown): x is Exposure {
  if (!x || typeof x !== "object") return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.routeName === "string" &&
    typeof e.port === "number" &&
    typeof e.sandbox === "string" &&
    typeof e.url === "string" &&
    typeof e.createdAt === "string"
  );
}

export function readExposures(): ExposuresFile {
  const path = resolve(EXPOSURES_PATH);
  if (!existsSync(path)) return { ...EMPTY, exposures: [] };
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<ExposuresFile>;
    if (parsed.version !== 1) {
      console.warn(`[exposures] unknown version ${parsed.version} — treating as empty`);
      return { ...EMPTY, exposures: [] };
    }
    const exposures = (parsed.exposures ?? []).filter(isExposure);
    return { version: 1, exposures };
  } catch (err) {
    console.warn(`[exposures] failed to parse ${EXPOSURES_PATH}: ${(err as Error).message}`);
    return { ...EMPTY, exposures: [] };
  }
}

export function writeExposures(file: ExposuresFile): void {
  const path = resolve(EXPOSURES_PATH);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify(file, null, 2) + "\n", "utf-8");
  renameSync(tmp, path);
}

/** Upsert by routeName — one route per name. */
export function upsertExposure(e: Exposure): void {
  const file = readExposures();
  const others = file.exposures.filter((x) => x.routeName !== e.routeName);
  writeExposures({ version: 1, exposures: [...others, e] });
}

/** Remove a route by name. Returns true if something was removed. */
export function removeRoute(routeName: string): boolean {
  const file = readExposures();
  const next = file.exposures.filter((x) => x.routeName !== routeName);
  if (next.length === file.exposures.length) return false;
  writeExposures({ version: 1, exposures: next });
  return true;
}

export function findRouteByName(routeName: string): Exposure | undefined {
  return readExposures().exposures.find((x) => x.routeName === routeName);
}

export function findRouteByPort(port: number): Exposure | undefined {
  return readExposures().exposures.find((x) => x.port === port);
}

export function listRoutes(): Exposure[] {
  return readExposures().exposures;
}
