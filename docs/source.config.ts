import { defineDocs, defineConfig } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
});

export const wiki = defineDocs({
  dir: "content/wiki",
});

export default defineConfig();
