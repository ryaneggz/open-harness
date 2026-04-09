import type { RoadmapItem } from "@/data/roadmap";

/**
 * Returns the highest-ranked "now" phase roadmap item that has validated signal.
 * Returns null if no validated items exist.
 */
export function getTopValidatedItem(items: RoadmapItem[]): RoadmapItem | null {
  const nowItems = items
    .filter((item) => item.phase === "now" && item.signal !== "none")
    .sort((a, b) => a.rank - b.rank);

  return nowItems.length > 0 ? nowItems[0] : null;
}

/**
 * Validates that a Ralph PRD has the required US-FINAL story as the last entry.
 */
export function validatePrdHasFinalStory(prd: {
  userStories: Array<{
    id: string;
    title: string;
    acceptanceCriteria: string[];
    priority: number;
  }>;
}): { valid: boolean; error?: string } {
  if (!prd.userStories || prd.userStories.length === 0) {
    return { valid: false, error: "PRD has no user stories" };
  }

  const sorted = [...prd.userStories].sort((a, b) => b.priority - a.priority);
  const lastStory = sorted[0];

  if (!lastStory.id.includes("FINAL") && !lastStory.title.toLowerCase().includes("draft pr")) {
    return { valid: false, error: "Last story (highest priority) must be US-FINAL with draft PR" };
  }

  const criteria = lastStory.acceptanceCriteria.join(" ").toLowerCase();

  if (!criteria.includes("archive")) {
    return { valid: false, error: "US-FINAL must include archive step" };
  }

  if (!criteria.includes("ci") || !criteria.includes("green")) {
    return { valid: false, error: "US-FINAL must require CI green" };
  }

  if (!criteria.includes("closes")) {
    return { valid: false, error: "US-FINAL must include 'Closes #N' for auto-closing the issue on merge" };
  }

  if (!criteria.includes("roadmap context") && !criteria.includes("roadmap")) {
    return { valid: false, error: "US-FINAL must include Roadmap Context section in PR body" };
  }

  return { valid: true };
}

/**
 * Validates that UI stories include browser QA acceptance criteria.
 */
export function validateUiStoriesHaveBrowserQa(
  stories: Array<{ title: string; acceptanceCriteria: string[] }>
): { valid: boolean; missingQa: string[] } {
  const uiKeywords = ["ui", "page", "component", "display", "form", "layout", "navbar", "card"];
  const missingQa: string[] = [];

  for (const story of stories) {
    const isUiStory = uiKeywords.some((keyword) => story.title.toLowerCase().includes(keyword));
    if (isUiStory) {
      const hasBrowserQa = story.acceptanceCriteria.some((c) =>
        c.toLowerCase().includes("browser")
      );
      if (!hasBrowserQa) {
        missingQa.push(story.title);
      }
    }
  }

  return { valid: missingQa.length === 0, missingQa };
}

/**
 * Validates that the archive path in US-FINAL uses the correct format:
 * .ralph/archives/YYYY-MM-DD/<feature>/ (plural archives, date and feature as separate dirs)
 */
export function validateArchivePath(
  stories: Array<{ acceptanceCriteria: string[] }>
): { valid: boolean; error?: string } {
  for (const story of stories) {
    const criteria = story.acceptanceCriteria.join(" ");
    // Check for the OLD incorrect patterns
    if (criteria.includes(".ralph/archive/") && !criteria.includes(".ralph/archives/")) {
      return { valid: false, error: "Archive path uses singular 'archive' — must be 'archives'" };
    }
    if (/archives\/\d{4}-\d{2}-\d{2}-/.test(criteria)) {
      return {
        valid: false,
        error: "Archive path uses YYYY-MM-DD-<feature> — must be YYYY-MM-DD/<feature>/ (separate dirs)",
      };
    }
  }
  return { valid: true };
}

/**
 * Validates that all stories include "Typecheck passes" in acceptance criteria.
 */
export function validateStoriesHaveTypecheck(
  stories: Array<{ title: string; acceptanceCriteria: string[] }>
): { valid: boolean; missingTypecheck: string[] } {
  const missingTypecheck: string[] = [];

  for (const story of stories) {
    const hasTypecheck = story.acceptanceCriteria.some((c) =>
      c.toLowerCase().includes("typecheck")
    );
    if (!hasTypecheck) {
      missingTypecheck.push(story.title);
    }
  }

  return { valid: missingTypecheck.length === 0, missingTypecheck };
}
