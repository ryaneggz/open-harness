import { docsSource, wikiSource } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(docsSource, wikiSource, {
  language: "english",
});

// Required for static export
export const dynamic = "force-static";
