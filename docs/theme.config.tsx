import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: (
    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
      <img
        src="/open-harness/icon.svg"
        alt="OH"
        width={28}
        height={28}
        style={{ borderRadius: 6 }}
      />
      <strong style={{ fontSize: "1.1rem" }}>Open Harness</strong>
    </span>
  ),
  project: {
    link: "https://github.com/ryaneggz/open-harness",
  },
  docsRepositoryBase:
    "https://github.com/ryaneggz/open-harness/tree/main/docs",
  primaryHue: 0,
  primarySaturation: 0,
  nextThemes: {
    defaultTheme: "dark",
  },
  head: (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
        rel="stylesheet"
      />
      <link rel="icon" href="/open-harness/favicon.ico" />
      <link rel="icon" type="image/svg+xml" href="/open-harness/icon.svg" />
      <meta name="theme-color" content="#0a0a0a" />
    </>
  ),
  footer: {
    text: "Open Harness — AI Agent Sandbox Orchestrator",
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s — Open Harness",
    };
  },
};

export default config;
