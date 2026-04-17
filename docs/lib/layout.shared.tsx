import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: "Open Harness",
    },
    links: [
      { text: "Docs", url: "/docs", active: "nested-url" },
      { text: "Wiki", url: "/wiki", active: "nested-url" },
    ],
  };
}
