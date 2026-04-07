"use client";

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
  { name: "PostgreSQL", icon: Database },
  { name: "Prisma", icon: Layers },
  { name: "shadcn/ui", icon: Code2 },
  { name: "Tailwind", icon: Paintbrush },
  { name: "Docker", icon: Container },
  { name: "Cloudflare", icon: Globe },
  { name: "Vitest", icon: TestTube2 },
  { name: "Playwright", icon: MonitorCheck },
];

function TechBadge({ name, icon: Icon }: TechItem) {
  return (
    <div className="flex shrink-0 items-center gap-2 rounded-full border border-border/30 bg-card/40 px-4 py-2 backdrop-blur-sm transition-colors hover:border-border/60 hover:bg-card/60">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="whitespace-nowrap text-sm">{name}</span>
    </div>
  );
}

export function TechStack() {
  const items = [...stack, ...stack, ...stack];

  return (
    <section className="py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">Tech Stack</h2>
      <p className="mb-10 text-center text-muted-foreground">
        Production-grade tools, zero configuration.
      </p>
      <div className="group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max gap-3 animate-marquee group-hover:[animation-play-state:paused]">
          {items.map((tech, i) => (
            <TechBadge key={`${tech.name}-${i}`} {...tech} />
          ))}
        </div>
      </div>
    </section>
  );
}
