import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  uptime: number;
  services: {
    nextjs: "ok";
    database: "ok" | "error";
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  let dbStatus: "ok" | "error" = "ok";

  try {
    await Promise.race([
      prisma.$queryRawUnsafe("SELECT 1"),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error("Database timeout")), 4000),
      ),
    ]);
  } catch {
    dbStatus = "error";
  }

  const status = dbStatus === "ok" ? "ok" : "degraded";
  const body: HealthResponse = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      nextjs: "ok",
      database: dbStatus,
    },
  };

  return NextResponse.json(body, { status: status === "ok" ? 200 : 503 });
}
