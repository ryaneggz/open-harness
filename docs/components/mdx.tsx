import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import Mermaid from "./Mermaid";

type CodeElement = { props?: { className?: string; children?: ReactNode } };

function isMermaidCodeBlock(node: unknown): node is CodeElement {
  return (
    typeof node === "object" &&
    node !== null &&
    "props" in node &&
    (node as CodeElement).props?.className === "language-mermaid"
  );
}

function toText(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (node && typeof node === "object" && "props" in node) {
    const child = (node as { props?: { children?: ReactNode } }).props?.children;
    return child !== undefined ? toText(child) : "";
  }
  return "";
}

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    pre: (props: ComponentProps<"pre">) => {
      if (isMermaidCodeBlock(props.children)) {
        return <Mermaid chart={toText(props.children.props?.children)} />;
      }
      const DefaultPre = defaultMdxComponents.pre as ComponentType<ComponentProps<"pre">>;
      return <DefaultPre {...props} />;
    },
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
