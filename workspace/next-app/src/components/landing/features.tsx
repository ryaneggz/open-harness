import { Layers, Zap, Globe, Bot, Brain, HeartPulse } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "Full Stack Ready",
    description:
      "Next.js 16 + PostgreSQL 16 + Prisma 7 + shadcn/ui, pre-wired and running out of the box.",
  },
  {
    icon: Zap,
    title: "One Command Setup",
    description:
      "npm run setup + openharness quickstart provisions the entire environment in minutes.",
  },
  {
    icon: Globe,
    title: "Public Tunnel",
    description:
      "Cloudflared tunnel at next-postgres-shadcn.ruska.dev for instant QA and live demos.",
  },
  {
    icon: Bot,
    title: "AI Agent Native",
    description:
      "Claude Code, Codex, and Pi Agent pre-installed with full permissions in an isolated sandbox.",
  },
  {
    icon: Brain,
    title: "Persistent Memory",
    description:
      "SOUL.md, MEMORY.md, and daily logs survive across sessions — agents remember context.",
  },
  {
    icon: HeartPulse,
    title: "Autonomous Heartbeats",
    description: "Cron-scheduled tasks let agents monitor, maintain, and report while you sleep.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        What&apos;s in the box
      </h2>
      <p className="mb-12 text-center text-muted-foreground">
        Everything you need to go from zero to shipping with AI agents.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="border-border/50">
            <CardHeader>
              <feature.icon className="mb-2 h-6 w-6 text-muted-foreground" />
              <CardTitle className="text-lg">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
