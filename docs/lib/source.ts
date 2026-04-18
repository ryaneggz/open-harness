import { docs, wiki } from "collections/server";
import { loader } from "fumadocs-core/source";

export const docsSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

export const wikiSource = loader({
  baseUrl: "/wiki",
  source: wiki.toFumadocsSource(),
});
