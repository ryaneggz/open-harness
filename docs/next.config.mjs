import nextra from "nextra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

export default withNextra({
  output: "export",
  images: { unoptimized: true },
  basePath: "",
  trailingSlash: true,
  experimental: { externalDir: true },
  transpilePackages: [
    "mermaid",
    "@theguild/remark-mermaid",
    "d3",
    "d3-array",
    "d3-shape",
    "d3-path",
    "d3-contour",
    "d3-sankey",
  ],
  webpack: (config) => {
    const reactDir = path.dirname(
      fileURLToPath(import.meta.resolve("react/package.json")),
    );
    const reactDomDir = path.dirname(
      fileURLToPath(import.meta.resolve("react-dom/package.json")),
    );
    config.resolve.alias = {
      ...config.resolve.alias,
      react: reactDir,
      "react-dom": reactDomDir,
    };
    return config;
  },
});
