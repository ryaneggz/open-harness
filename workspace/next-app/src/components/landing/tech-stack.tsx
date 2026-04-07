"use client";

interface TechItem {
  name: string;
  subtitle: string;
  emoji: string;
}

const stack: TechItem[] = [
  { name: "Next.js 16", subtitle: "App Router + Turbopack", emoji: "▲" },
  { name: "TypeScript", subtitle: "Strict mode", emoji: "🔷" },
  { name: "PostgreSQL", subtitle: "Relational database", emoji: "🐘" },
  { name: "Prisma", subtitle: "Type-safe ORM", emoji: "💎" },
  { name: "shadcn/ui", subtitle: "Component library", emoji: "🎨" },
  { name: "Tailwind", subtitle: "Utility-first CSS", emoji: "💨" },
  { name: "Docker", subtitle: "Containerization", emoji: "🐳" },
  { name: "Cloudflare", subtitle: "Tunnel + DNS", emoji: "⚡" },
  { name: "Vitest", subtitle: "Unit testing", emoji: "🧪" },
  { name: "Playwright", subtitle: "E2E testing", emoji: "🎭" },
];

function TechCard({ name, subtitle, emoji }: TechItem) {
  return (
    <div className="flex shrink-0 items-center gap-4 rounded-xl border border-border/30 bg-card/30 px-6 py-4 backdrop-blur-sm">
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="font-semibold leading-tight">{name}</p>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

export function TechStack() {
  const items = [...stack, ...stack, ...stack];

  return (
    <section className="py-16">
      <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Tech Stack
      </p>
      <h2 className="mb-10 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Production-grade tools, zero configuration
      </h2>
      <div className="group relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-32 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-32 bg-gradient-to-l from-background to-transparent" />
        <div className="flex w-max gap-4 animate-marquee group-hover:[animation-play-state:paused]">
          {items.map((tech, i) => (
            <TechCard key={`${tech.name}-${i}`} {...tech} />
          ))}
        </div>
      </div>
    </section>
  );
}
