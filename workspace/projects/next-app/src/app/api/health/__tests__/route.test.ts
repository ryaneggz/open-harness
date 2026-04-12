import { describe, it, expect } from "vitest";

import { GET } from "../route";

describe("GET /api/health", () => {
  it("returns 200 with status 'ok'", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.services.nextjs).toBe("ok");
  });

  it("includes timestamp and uptime in response", async () => {
    const response = await GET();
    const body = await response.json();

    expect(body.timestamp).toBeDefined();
    expect(() => new Date(body.timestamp).toISOString()).not.toThrow();
    expect(typeof body.uptime).toBe("number");
    expect(body.uptime).toBeGreaterThanOrEqual(0);
  });
});
