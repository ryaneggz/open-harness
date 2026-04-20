import nextra from "nextra";

const withNextra = nextra({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.tsx",
});

export default withNextra({
  output: "export",
  images: { unoptimized: true },
  basePath: "/open-harness",
  experimental: { externalDir: true, esmExternals: "loose" },
  webpack: (config) => {
    config.resolve.symlinks = false;
    return config;
  },
});
