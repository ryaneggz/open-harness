// @vitest-environment node
import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { resolve } from "path";
import net from "net";

const APP_DIR = resolve(__dirname, "../..");
const DB_HOST = process.env.PGHOST || "localhost";
const DB_PORT = Number(process.env.PGPORT || 5432);
const DEV_URL = "http://localhost:3000";
const PUBLIC_URL = "https://next-postgres-shadcn.ruska.dev";

function tcpConnect(
  host: string,
  port: number,
  timeoutMs = 5000,
): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeoutMs);
    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve(true);
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function httpOk(
  url: string,
  timeoutMs = 10000,
): Promise<{ ok: boolean; status: number }> {
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
    it("has DATABASE_URL set", () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toMatch(/^postgresql:\/\//);
    });

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

    it("has package-lock.json in sync", () => {
      const lockfile = resolve(APP_DIR, "node_modules/.package-lock.json");
      expect(existsSync(lockfile)).toBe(true);
    });
  });

  describe("Prisma", () => {
    it("has Prisma client generated", () => {
      const clientDir = resolve(APP_DIR, "src/generated/prisma");
      expect(existsSync(clientDir)).toBe(true);
    });
  });

  describe("PostgreSQL", () => {
    it("can connect via TCP", async () => {
      const reachable = await tcpConnect(DB_HOST, DB_PORT);
      expect(reachable).toBe(true);
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
