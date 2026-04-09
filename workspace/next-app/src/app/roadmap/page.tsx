import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { RoadmapCard } from "@/components/roadmap/roadmap-card";
import { roadmap } from "@/data/roadmap";

export const metadata: Metadata = {
  title: "Roadmap | OpenHarness",
  description:
    "See what we're building next for Open Harness. Vote on features you want by reacting to GitHub issues.",
};

const phases = [
  { key: "now" as const, title: "Building Now", description: "Validated and in progress" },
  { key: "next" as const, title: "Up Next", description: "Signal confirmed, dependencies pending" },
  {
    key: "later" as const,
    title: "On the Horizon",
    description: "Planned but needs more community signal",
  },
] as const;

export default function RoadmapPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-4xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-bold tracking-tight">Product Roadmap</h1>
        <p className="mt-2 text-muted-foreground">
          We build what users demonstrably want. Signal over features.
        </p>

        <div className="mt-6 rounded-lg border border-border bg-muted/30 p-4">
          <h2 className="text-sm font-semibold">How to influence the roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            React with{" "}
            <span role="img" aria-label="thumbs up">
              👍
            </span>{" "}
            on{" "}
            <Link
              href="https://github.com/ryaneggz/next-postgres-shadcn/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground"
            >
              GitHub issues
            </Link>{" "}
            to signal demand. Items with the most community votes get built first. Infrastructure
            prerequisites (auth, security) are built regardless of votes because everything else
            depends on them.
          </p>
        </div>

        {roadmap.length === 0 ? (
          <div className="mt-12 text-center text-muted-foreground">
            <p className="text-lg">Roadmap initializing</p>
            <p className="mt-1 text-sm">
              The strategic council hasn&apos;t run yet. Check back soon.
            </p>
          </div>
        ) : (
          phases.map(({ key, title, description }) => {
            const items = roadmap.filter((item) => item.phase === key);
            if (items.length === 0) return null;
            return (
              <section key={key} className="mt-10">
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mb-4 text-sm text-muted-foreground">{description}</p>
                <div className="grid gap-3">
                  {items.map((item) => (
                    <RoadmapCard key={item.rank} item={item} />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </main>
      <Footer />
    </>
  );
}
