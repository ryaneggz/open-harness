import React from "react";
import type { DocsThemeConfig } from "nextra-theme-docs";

const config: DocsThemeConfig = {
  logo: <strong>Open Harness</strong>,
  project: {
    link: "https://github.com/ryaneggz/open-harness",
  },
  docsRepositoryBase:
    "https://github.com/ryaneggz/open-harness/tree/main/docs",
  footer: {
    content: "Open Harness — AI Agent Sandbox Orchestrator",
  },
  head: (
    <>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta property="og:title" content="Open Harness" />
      <meta
        property="og:description"
        content="AI Agent Sandbox Orchestrator"
      />
    </>
  ),
};

export default config;
