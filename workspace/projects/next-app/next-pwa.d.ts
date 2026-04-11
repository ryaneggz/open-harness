declare module "next-pwa" {
  import type { NextConfig } from "next";

  interface PWAConfig {
    dest?: string;
    disable?: boolean;
    register?: boolean;
    scope?: string;
    sw?: string;
    [key: string]: unknown;
  }

  export default function withPWA(
    config?: PWAConfig,
  ): (nextConfig: NextConfig) => NextConfig;
}
