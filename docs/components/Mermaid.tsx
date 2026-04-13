import { useEffect, useRef, useState } from "react";

export default function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let cancelled = false;
    import("mermaid").then((mod) => {
      const mermaid = mod.default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        securityLevel: "loose",
      });
      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      mermaid.render(id, chart.trim()).then(({ svg: rendered }) => {
        if (!cancelled) setSvg(rendered);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [chart]);

  return (
    <div
      ref={ref}
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
      style={{ display: "flex", justifyContent: "center", margin: "1.5rem 0" }}
    />
  );
}
