import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: vi.fn(),
  },
}));

import { GET } from "../route";
import { prisma } from "@/lib/prisma";

const mockQueryRawUnsafe = vi.mocked(prisma.$queryRawUnsafe);

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with status 'ok' when database is reachable", async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.database).toBe("ok");
    expect(body.services.nextjs).toBe("ok");
  });

  it("includes timestamp, uptime, and services in response", async () => {
    mockQueryRawUnsafe.mockResolvedValue([{ "?column?": 1 }]);

    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(body.services).toBeDefined();
    expect(body.services.nextjs).toBe("ok");
    expect(body.services.database).toBeDefined();
  });

  it("returns 503 with status 'degraded' when database query throws", async () => {
    mockQueryRawUnsafe.mockRejectedValue(new Error("Connection refused"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
  });

  it("sets services.database to 'error' when database is unreachable", async () => {
    mockQueryRawUnsafe.mockRejectedValue(new Error("ECONNREFUSED"));

    const response = await GET();
    const body = await response.json();

    expect(body.services.database).toBe("error");
    expect(body.services.nextjs).toBe("ok");
  });
});
