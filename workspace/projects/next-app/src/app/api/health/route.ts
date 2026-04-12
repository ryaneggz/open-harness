import { NextResponse } from "next/server";

interface HealthResponse {
  status: "ok";
  timestamp: string;
  uptime: number;
  services: {
    nextjs: "ok";
  };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const body: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      nextjs: "ok",
    },
  };

  return NextResponse.json(body);
}
