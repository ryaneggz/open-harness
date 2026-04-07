"use client";

import Link from "next/link";
import { GitFork, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-24 text-center sm:py-32">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Built on Open Harness
      </p>
      <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        OpenHarness: <span className="text-muted-foreground">Next + Postgres + shadcn</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
        A fully-provisioned Next.js + PostgreSQL + shadcn/ui development environment running inside
        an isolated Docker sandbox — with persistent memory, autonomous heartbeats, and a public
        tunnel.
      </p>
      <div className="mt-10 flex items-center justify-center gap-4">
        <Link
          href="https://next-postgres-shadcn.ruska.dev"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ size: "lg" })}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Live Demo
        </Link>
        <Link
          href="https://github.com/ryaneggz/open-harness"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <GitFork className="mr-2 h-4 w-4" />
          View on GitHub
        </Link>
      </div>
    </section>
  );
}
