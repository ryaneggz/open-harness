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
export const roadmap: RoadmapItem[] = [];
