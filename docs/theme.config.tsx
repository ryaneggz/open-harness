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
    text: "Open Harness — AI Agent Sandbox Orchestrator",
  },
  useNextSeoProps() {
    return {
      titleTemplate: "%s — Open Harness",
    };
  },
};

export default config;
