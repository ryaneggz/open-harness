import { docsSource } from "@/lib/source";
import { createFromSource } from "fumadocs-core/search/server";

export const { GET } = createFromSource(docsSource, {
  language: "english",
});

// Required for static export
export const dynamic = "force-static";
