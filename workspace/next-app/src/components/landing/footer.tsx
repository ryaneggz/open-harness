import Link from "next/link";
import { GitFork } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
        <p className="text-sm text-muted-foreground">
          Built with{" "}
          <Link
            href="https://github.com/ryaneggz/open-harness/tree/agent/next-postgres-shadcn"
            className="font-medium text-foreground underline-offset-4 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Harness
          </Link>
        </p>
        <Link
          href="https://github.com/ryaneggz/open-harness/tree/agent/next-postgres-shadcn"
          className="text-muted-foreground hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <GitFork className="h-5 w-5" />
        </Link>
      </div>
    </footer>
  );
}
