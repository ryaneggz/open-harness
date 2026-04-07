import { Badge } from "@/components/ui/badge";

const stack = [
  "Next.js 16",
  "TypeScript",
  "PostgreSQL 16",
  "Prisma 7",
  "shadcn/ui",
  "Tailwind CSS v4",
  "Docker",
  "Cloudflare Tunnels",
  "Vitest",
  "Playwright",
];

export function TechStack() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">Tech Stack</h2>
      <p className="mb-8 text-center text-muted-foreground">
        Production-grade tools, zero configuration.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {stack.map((tech) => (
          <Badge key={tech} variant="secondary" className="px-3 py-1.5 text-sm">
            {tech}
          </Badge>
        ))}
      </div>
    </section>
  );
}
