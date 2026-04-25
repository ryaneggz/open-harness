import React from "react";
import { useRouter } from "next/router";
import { useConfig } from "nextra-theme-docs";
import type { DocsThemeConfig } from "nextra-theme-docs";

const SITE_URL = "https://oh.mifune.dev";
const DEFAULT_TITLE = "Open Harness";
const DEFAULT_DESCRIPTION = "AI Agent Sandbox Orchestrator";
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-card.png`;

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
  head: function Head() {
    const { asPath } = useRouter();
    const { frontMatter } = useConfig();

    const title = (frontMatter.title as string | undefined) ?? DEFAULT_TITLE;
    const description =
      (frontMatter.description as string | undefined) ?? DEFAULT_DESCRIPTION;

    // Resolve ogImage: if frontMatter provides a relative path, make it absolute.
    const rawOgImage =
      (frontMatter.ogImage as string | undefined) ?? DEFAULT_OG_IMAGE;
    const ogImage = rawOgImage.startsWith("http")
      ? rawOgImage
      : `${SITE_URL}${rawOgImage.startsWith("/") ? "" : "/"}${rawOgImage}`;

    // Strip trailing slash from asPath for canonical (Nextra emits trailingSlash pages,
    // but the canonical should be the canonical URL without the slash, matching the domain root style).
    const canonicalPath = asPath === "/" ? "" : asPath.replace(/\/$/, "");
    const canonicalUrl = `${SITE_URL}${canonicalPath}`;

    const isBlogPost =
      asPath.startsWith("/blog/") && asPath !== "/blog/" && asPath !== "/blog";

    return (
      <>
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />

        {/* Open Graph — base */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:url" content={canonicalUrl} />
        <meta
          property="og:type"
          content={isBlogPost ? "article" : "website"}
        />
        <meta property="og:site_name" content={DEFAULT_TITLE} />

        {/* Open Graph — article-specific */}
        {isBlogPost && frontMatter.date && (
          <meta
            property="article:published_time"
            content={frontMatter.date as string}
          />
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </>
    );
  },
};

export default config;
