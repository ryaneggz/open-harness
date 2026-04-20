import { createMDX } from "fumadocs-mdx/next";

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  output: process.env.STATIC_EXPORT === "true" ? "export" : undefined,
  basePath: process.env.DOCS_BASE_PATH || "",
  images: { unoptimized: true },
};

const withMDX = createMDX();

export default withMDX(config);
