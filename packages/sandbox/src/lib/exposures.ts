import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const EXPOSURES_PATH = ".openharness/exposures.json";

export type Scope = "local" | "public" | "route";

export interface Exposure {
  port: number;
  scope: Scope;
  hostPort?: number;
  url?: string;
  session?: string;
  /** Route name — only set when scope === "route". */
  routeName?: string;
  createdAt: string;
}

export interface ExposuresFile {
  version: 1;
  exposures: Exposure[];
}

const EMPTY: ExposuresFile = { version: 1, exposures: [] };

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
    return { version: 1, exposures: parsed.exposures ?? [] };
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

export function upsertExposure(e: Exposure): void {
  const file = readExposures();
  // Route scope dedupes by routeName; local/public dedupe by (port, scope).
  const others = file.exposures.filter((x) => {
    if (e.scope === "route" && x.scope === "route") {
      return x.routeName !== e.routeName;
    }
    return !(x.port === e.port && x.scope === e.scope);
  });
  writeExposures({ version: 1, exposures: [...others, e] });
}

export function removeExposure(port: number, scope: Scope): void {
  const file = readExposures();
  const next = file.exposures.filter((x) => !(x.port === port && x.scope === scope));
  if (next.length !== file.exposures.length) {
    writeExposures({ version: 1, exposures: next });
  }
}

export function removeRoute(routeName: string): boolean {
  const file = readExposures();
  const next = file.exposures.filter((x) => !(x.scope === "route" && x.routeName === routeName));
  if (next.length === file.exposures.length) return false;
  writeExposures({ version: 1, exposures: next });
  return true;
}

export function findExposure(port: number, scope?: Scope): Exposure | undefined {
  const file = readExposures();
  if (scope) return file.exposures.find((x) => x.port === port && x.scope === scope);
  return (
    file.exposures.find((x) => x.port === port && x.scope === "public") ??
    file.exposures.find((x) => x.port === port && x.scope === "route") ??
    file.exposures.find((x) => x.port === port && x.scope === "local")
  );
}

export function listRoutes(): Exposure[] {
  return readExposures().exposures.filter((x) => x.scope === "route");
}
