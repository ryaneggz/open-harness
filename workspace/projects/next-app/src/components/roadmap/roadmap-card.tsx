"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RoadmapItem, RoadmapCategory, Complexity } from "@/data/roadmap";

const categoryColors: Record<RoadmapCategory, string> = {
  product: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  docs: "bg-green-500/10 text-green-700 dark:text-green-400",
  security: "bg-red-500/10 text-red-700 dark:text-red-400",
  registry: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  agent: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

const complexityColors: Record<Complexity, string> = {
  S: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  M: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  L: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
};

export function RoadmapCard({ item }: { item: RoadmapItem }) {
  const issueUrl = item.issueNumber
    ? `https://github.com/ryaneggz/open-harness/issues/${item.issueNumber}`
    : null;

  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">#{item.rank}</span>
          <CardTitle className="text-base">{item.title}</CardTitle>
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", categoryColors[item.category])}>
            {item.category}
          </Badge>
          <Badge variant="outline" className={cn("text-xs", complexityColors[item.complexity])}>
            {item.complexity === "S" ? "Small" : item.complexity === "M" ? "Medium" : "Large"}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {item.signal === "none"
              ? "Needs votes"
              : item.signal === "infrastructure"
                ? "Infrastructure"
                : item.signal}
          </span>
          {issueUrl && (
            <Link
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Vote
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        {item.dependencies && item.dependencies.length > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Depends on: {item.dependencies.join(", ")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
