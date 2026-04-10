export type RoadmapPhase = "now" | "next" | "later";
export type RoadmapCategory = "product" | "docs" | "security" | "registry" | "agent";
export type Complexity = "S" | "M" | "L";

export interface RoadmapItem {
  rank: number;
  title: string;
  description: string;
  category: RoadmapCategory;
  phase: RoadmapPhase;
  complexity: Complexity;
  signal: string;
  issueNumber?: number;
  dependencies?: string[];
}

// Populated by /strategic-proposal skill — do not edit manually
export const roadmap: RoadmapItem[] = [
  {
    rank: 1,
    title: "Add /api/health endpoint for runtime monitoring",
    description:
      "Health check API route reporting app and database status for liveness probes and uptime monitors.",
    category: "product",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
    issueNumber: 4,
  },
  {
    rank: 2,
    title: "Add Open Graph meta tags and social sharing cards",
    description:
      "OG and Twitter Card meta tags so shared links render with title, description, and preview image.",
    category: "docs",
    phase: "now",
    complexity: "S",
    signal: "infrastructure",
    issueNumber: 5,
  },
];
