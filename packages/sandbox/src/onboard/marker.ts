/**
 * Read / write the onboarding marker file (`~/.claude/.onboarded`).
 *
 * Preserves the exact JSON schema the bash script wrote so downstream
 * consumers (`jq -r '.completedAt'`) keep working unchanged.
 */

import { dirname } from "node:path";
import type { FsDeps, StepStatus } from "./types.js";

export const MARKER_VERSION = 1;

export interface MarkerFile {
  version: number;
  completedAt: string;
  steps: Record<string, { status: StepStatus }>;
}

export function markerPath(home: string): string {
  return `${home}/.claude/.onboarded`;
}

export function exists(fs: FsDeps, home: string): boolean {
  return fs.exists(markerPath(home));
}

export function read(fs: FsDeps, home: string): MarkerFile | null {
  const path = markerPath(home);
  if (!fs.exists(path)) return null;
  try {
    const parsed = JSON.parse(fs.readFile(path));
    if (typeof parsed !== "object" || parsed === null) return null;
    return parsed as MarkerFile;
  } catch {
    return null;
  }
}

export function write(
  fs: FsDeps,
  home: string,
  completedAt: string,
  steps: Record<string, StepStatus>,
): void {
  const path = markerPath(home);
  fs.mkdirp(dirname(path));
  const payload: MarkerFile = {
    version: MARKER_VERSION,
    completedAt,
    steps: Object.fromEntries(Object.entries(steps).map(([k, v]) => [k, { status: v }])),
  };
  fs.writeFile(path, JSON.stringify(payload, null, 2) + "\n");
}
