"use client";

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Why not just run an AI agent on my local machine?",
    answer:
      "Running agents directly on your machine risks file conflicts, broken environments, and no clean rollback. This harness gives each agent its own Docker container with a dedicated database and filesystem — fully isolated from your host and from other agents.",
  },
  {
    question: "What problem does this harness solve?",
    answer:
      "The gap between \"agent can write code\" and \"agent can ship a full-stack web feature end-to-end.\" Agents need a real database, real UI components, a real deployment URL, and a scaffolded workspace with identity, skills, and memory configured for their task. This harness provides all of that out of the box.",
  },
  {
    question: "How is this different from a plain Docker container?",
    answer:
      "A raw container gives you an OS. This harness gives you a provisioned Next.js + PostgreSQL + Prisma + shadcn/ui stack with persistent agent memory, a public Cloudflare tunnel, autonomous heartbeats, and agent tooling pre-installed. The orchestrator also scaffolds the agent's workspace — SOUL.md, MEMORY.md, skills, and task context — before the agent starts working.",
  },
  {
    question: "Can multiple agents work on the same project?",
    answer:
      "Yes. Each agent gets its own git worktree branch, Docker container, and independent heartbeat schedule. They share the repo but can't interfere with each other's work — each has its own memory, skills, and cron tasks. The orchestrator manages provisioning, lifecycle, and teardown from the host.",
  },
  {
    question: "What happens when an agent's context window fills up?",
    answer:
      "The memory system — SOUL.md for identity, MEMORY.md for long-term decisions, and daily logs for session history — lets new sessions pick up where the last left off. Agents don't start from scratch.",
  },
  {
    question: "Is this only for Next.js projects?",
    answer:
      "This is a Next.js + PostgreSQL + shadcn harness — one of many you can build. Open Harness is the underlying framework for creating purpose-specific agent sandboxes for any stack: Python + FastAPI, Go + HTMX, or whatever your project needs.",
  },
];

export function FAQ(): React.JSX.Element {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h2 className="mb-2 text-center text-2xl font-bold tracking-tight sm:text-3xl">
        Frequently Asked Questions
      </h2>
      <p className="mb-10 text-center text-muted-foreground">
        Why this harness exists and what it does for your agents.
      </p>
      <Accordion>
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={String(i)}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground">{faq.answer}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
