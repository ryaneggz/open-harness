import { docsSource, wikiSource } from "@/lib/source";
import { createSearchAPI } from "fumadocs-core/search/server";
import type { StructuredData } from "fumadocs-core/mdx-plugins";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function buildIndex(page: { url: string; data: any }) {
  let structuredData: StructuredData | undefined;

  if ("structuredData" in page.data) {
    structuredData =
      typeof page.data.structuredData === "function"
        ? await page.data.structuredData()
        : (page.data.structuredData as StructuredData);
  } else if ("load" in page.data && typeof page.data.load === "function") {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData) {
    throw new Error(
      `Cannot find structured data for page: ${page.url}`
    );
  }

  return {
    title: (page.data.title as string) ?? "",
    description: page.data.description as string | undefined,
    url: page.url,
    id: page.url,
    structuredData,
  };
}

export const { GET } = createSearchAPI("advanced", {
  language: "english",
  indexes: async () => {
    const docsPages = docsSource.getPages().map((page) => buildIndex(page));
    const wikiPages = wikiSource.getPages().map((page) => buildIndex(page));
    return Promise.all([...docsPages, ...wikiPages]);
  },
});

// Required for static export
export const dynamic = "force-static";
