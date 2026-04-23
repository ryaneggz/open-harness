"use client";

import Link from "next/link";
import { BookOpen, GitFork, Map } from "lucide-react";
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
            href="/roadmap"
            aria-label="Roadmap"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <Map className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Roadmap</span>
          </Link>
          <Link
            href="https://github.com/ryaneggz/open-harness"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <GitFork className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
          <Link
            href="https://ryaneggz.github.io/open-harness/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Docs"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            <BookOpen className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Docs</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
}
