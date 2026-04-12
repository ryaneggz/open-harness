import { Layers, Zap, Globe, Bot, Brain, HeartPulse } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "Zero to Full Stack",
    description:
      "Stop hand-wiring Next.js, PostgreSQL, Prisma, and shadcn/ui. This harness gives agents a production-grade web stack, pre-configured and running — so they build features, not boilerplate.",
  },
  {
    icon: Zap,
    title: "Minutes, Not Hours",
    description:
      "No Dockerfile tweaking, env var juggling, or dependency debugging. openharness sandbox provisions the entire sandbox — Docker, database, tunnel, agent CLI — in one shot.",
  },
  {
    icon: Globe,
    title: "Instant Feedback Loop",
    description:
      "Agents write frontend code but you need to see the result. A Cloudflare tunnel gives you a public URL to verify UI changes in a real browser — or let the agent verify with agent-browser.",
  },
  {
    icon: Bot,
    title: "Bring Any Agent",
    description:
      "Run multiple agents in the same harness — each in its own isolated container with its own heartbeats, memory, and skills. Claude Code, Codex, Pi Agent, or your own. Switch or add agents without reconfiguring anything.",
  },
  {
    icon: Brain,
    title: "Agents That Remember",
    description:
      "AI agents forget everything between sessions. This harness gives them structured memory — identity, long-term decisions, and daily logs — that persists across container restarts.",
  },
  {
    icon: HeartPulse,
    title: "Work While You Sleep",
    description:
      "Each agent gets its own cron-scheduled heartbeats — monitoring, auditing, and reporting independently. Multiple agents can work in parallel, each on their own schedule, with no human in the loop.",
  },
];

export function Features() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        What&apos;s in the box
      </h2>
      <p className="mb-12 text-center text-muted-foreground">
        Everything an AI agent needs to ship full-stack web features end-to-end.
      </p>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title}>
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
