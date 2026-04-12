// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";

const APP_DIR = resolve(__dirname, "../..");
const DEV_URL = "http://localhost:3000";
const PUBLIC_URL = "https://next-postgres-shadcn.ruska.dev";

async function httpOk(url: string, timeoutMs = 10000): Promise<{ ok: boolean; status: number }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "follow",
    });
    return { ok: res.status >= 200 && res.status < 400, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

describe("Setup Check", () => {
  describe("Environment", () => {
    it("has Node.js >= 22", () => {
      const major = Number(process.version.slice(1).split(".")[0]);
      expect(major).toBeGreaterThanOrEqual(22);
    });
  });

  describe("Dependencies", () => {
    it("has node_modules installed", () => {
      const nm = resolve(APP_DIR, "node_modules");
      expect(existsSync(nm)).toBe(true);
    });

    it("has pnpm-lock.yaml in sync", () => {
      const lockfile = resolve(APP_DIR, "pnpm-lock.yaml");
      expect(existsSync(lockfile)).toBe(true);
    });
  });

  describe("Next.js Dev Server", () => {
    it("responds on port 3000", async () => {
      const { ok, status } = await httpOk(DEV_URL);
      expect(ok).toBe(true);
      expect(status).toBe(200);
    });
  });

  describe("Cloudflare Tunnel", () => {
    it("public URL responds", async () => {
      const { ok, status } = await httpOk(PUBLIC_URL, 15000);
      expect(ok).toBe(true);
      expect(status).toBe(200);
    });
  });
});
