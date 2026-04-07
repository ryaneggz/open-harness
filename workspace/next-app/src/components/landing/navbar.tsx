"use client";

import Link from "next/link";
import { ExternalLink, GitFork } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <nav className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          OpenHarness
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="https://github.com/ryaneggz/next-postgres-shadcn"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <GitFork className="mr-1.5 h-4 w-4" />
            GitHub
          </Link>
          <Link
            href="https://next-postgres-shadcn.ruska.dev"
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            Demo
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
