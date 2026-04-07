"use client";

import Link from "next/link";
import { GitFork, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export function Hero() {
  return (
    <div className="flex flex-col justify-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Built on Open Harness
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Give your AI agents{" "}
        <span className="text-muted-foreground">a real dev environment</span>
      </h1>
      <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">
        This harness gives AI coding agents an isolated, fully-wired Next.js + PostgreSQL +
        shadcn/ui sandbox — scaffolded with identity, memory, and skills for their task — so they
        can build, test, and deploy real web features, not just generate code.
      </p>
      <div className="mt-8 flex items-center gap-4">
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
          href="https://github.com/ryaneggz/open-harness/tree/agent/next-postgres-shadcn"
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <GitFork className="mr-2 h-4 w-4" />
          View on GitHub
        </Link>
      </div>
    </div>
  );
}
