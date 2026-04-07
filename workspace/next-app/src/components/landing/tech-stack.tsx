import type { LucideIcon } from "lucide-react";
import {
  Code2,
  FileCode2,
  Database,
  Layers,
  Paintbrush,
  Container,
  Globe,
  TestTube2,
  MonitorCheck,
  Hexagon,
} from "lucide-react";

interface TechItem {
  name: string;
  icon: LucideIcon;
}

const stack: TechItem[] = [
  { name: "Next.js 16", icon: Hexagon },
  { name: "TypeScript", icon: FileCode2 },
  { name: "PostgreSQL 16", icon: Database },
  { name: "Prisma 7", icon: Layers },
  { name: "shadcn/ui", icon: Code2 },
  { name: "Tailwind CSS v4", icon: Paintbrush },
  { name: "Docker", icon: Container },
  { name: "Cloudflare Tunnels", icon: Globe },
  { name: "Vitest", icon: TestTube2 },
  { name: "Playwright", icon: MonitorCheck },
];

function MarqueeRow({ items, reverse }: { items: TechItem[]; reverse?: boolean }) {
  const doubled = [...items, ...items];

  return (
    <div className="relative overflow-hidden">
      <div
        className={`flex w-max gap-6 ${reverse ? "animate-marquee-reverse" : "animate-marquee"}`}
      >
        {doubled.map((tech, i) => (
          <div
            key={`${tech.name}-${i}`}
            className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5"
          >
            <tech.icon className="h-5 w-5 shrink-0 text-muted-foreground" />
            <span className="whitespace-nowrap text-sm font-medium">{tech.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TechStack() {
  const half = Math.ceil(stack.length / 2);
  const row1 = stack.slice(0, half);
  const row2 = stack.slice(half);

  return (
    <section className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">Tech Stack</h2>
      <p className="mb-8 text-center text-muted-foreground">
        Production-grade tools, zero configuration.
      </p>
      <div className="flex flex-col gap-4">
        <MarqueeRow items={row1} />
        <MarqueeRow items={row2} reverse />
      </div>
    </section>
  );
}
