import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

// To deploy via GitHub Pages without custom domain, swap to:
// url: "https://ryaneggz.github.io"
// baseUrl: "/open-harness/"

const config: Config = {
  title: "Mifune Open Harness",
  tagline:
    "Run Claude, Codex, Gemini, and Pi side-by-side from one Docker-powered agent harness.",
  favicon: "img/favicon.svg",

  url: "https://oh.mifune.dev",
  baseUrl: "/",

  organizationName: "ryaneggz",
  projectName: "open-harness",

  trailingSlash: false,

  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl:
            "https://github.com/ryaneggz/open-harness/edit/main/apps/docs/",
          routeBasePath: "docs",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "Mifune Open Harness",
      logo: {
        alt: "Mifune Open Harness Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Docs",
        },
        {
          href: "https://github.com/ryaneggz/open-harness",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Introduction",
              to: "/docs",
            },
          ],
        },
        {
          title: "Project",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/ryaneggz/open-harness",
            },
            {
              label: "License",
              href: "https://github.com/ryaneggz/open-harness/blob/main/LICENSE",
            },
          ],
        },
      ],
      copyright: `Copyright ${new Date().getFullYear()} Open Harness Contributors.`,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
