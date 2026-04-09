import { describe, it, expect } from "vitest";
import {
  validatePrdHasFinalStory,
  validateUiStoriesHaveBrowserQa,
  validateStoriesHaveTypecheck,
} from "@/lib/implement-guards";

describe("Ralph PRD validation", () => {
  const validFinalStory = {
    id: "US-FINAL",
    title: "Archive Ralph run, submit draft PR, and verify CI green",
    acceptanceCriteria: [
      "All previous stories have passes: true",
      "Archive .ralph/prd.json and .ralph/progress.txt",
      "Create draft PR to development",
      "PR body MUST include 'Closes #N' where N is the GitHub issue number",
      "PR body MUST include a Roadmap Context section with: Rank, Category, Phase, Complexity, Signal",
      "Run /ci-status — CI must be GREEN",
    ],
    priority: 999,
  };

  const validUiStory = {
    id: "US-002",
    title: "Add roadmap page component",
    acceptanceCriteria: [
      "Page renders with phase sections",
      "Typecheck passes",
      "Verify in browser using agent-browser skill",
    ],
    priority: 2,
  };

  const validBackendStory = {
    id: "US-001",
    title: "Add user model to database",
    acceptanceCriteria: [
      "Prisma migration runs successfully",
      "Typecheck passes",
    ],
    priority: 1,
  };

  describe("validatePrdHasFinalStory", () => {
    it("passes with valid US-FINAL as highest priority", () => {
      const result = validatePrdHasFinalStory({
        userStories: [validBackendStory, validUiStory, validFinalStory],
      });
      expect(result.valid).toBe(true);
    });

    it("fails when no user stories exist", () => {
      const result = validatePrdHasFinalStory({ userStories: [] });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("no user stories");
    });

    it("fails when last story is not US-FINAL", () => {
      const result = validatePrdHasFinalStory({
        userStories: [
          validBackendStory,
          { ...validUiStory, priority: 999 },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("US-FINAL");
    });

    it("fails when US-FINAL missing archive step", () => {
      const result = validatePrdHasFinalStory({
        userStories: [
          validBackendStory,
          {
            ...validFinalStory,
            acceptanceCriteria: [
              "Create draft PR",
              "CI must be GREEN",
            ],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("archive");
    });

    it("fails when US-FINAL missing CI green requirement", () => {
      const result = validatePrdHasFinalStory({
        userStories: [
          validBackendStory,
          {
            ...validFinalStory,
            acceptanceCriteria: [
              "Archive .ralph/prd.json",
              "Create draft PR",
            ],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("CI green");
    });

    it("fails when US-FINAL missing Closes statement", () => {
      const result = validatePrdHasFinalStory({
        userStories: [
          validBackendStory,
          {
            ...validFinalStory,
            acceptanceCriteria: [
              "Archive .ralph/prd.json",
              "Create draft PR",
              "Roadmap Context section included",
              "CI must be GREEN",
            ],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Closes");
    });

    it("fails when US-FINAL missing Roadmap Context", () => {
      const result = validatePrdHasFinalStory({
        userStories: [
          validBackendStory,
          {
            ...validFinalStory,
            acceptanceCriteria: [
              "Archive .ralph/prd.json",
              "Closes #42",
              "CI must be GREEN",
            ],
          },
        ],
      });
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Roadmap Context");
    });
  });

  describe("validateUiStoriesHaveBrowserQa", () => {
    it("passes when UI stories include browser QA", () => {
      const result = validateUiStoriesHaveBrowserQa([validUiStory]);
      expect(result.valid).toBe(true);
      expect(result.missingQa).toHaveLength(0);
    });

    it("fails when UI story missing browser QA", () => {
      const result = validateUiStoriesHaveBrowserQa([
        {
          title: "Add dashboard page",
          acceptanceCriteria: ["Typecheck passes"],
        },
      ]);
      expect(result.valid).toBe(false);
      expect(result.missingQa).toContain("Add dashboard page");
    });

    it("ignores backend stories", () => {
      const result = validateUiStoriesHaveBrowserQa([validBackendStory]);
      expect(result.valid).toBe(true);
    });

    it("detects multiple missing QA stories", () => {
      const result = validateUiStoriesHaveBrowserQa([
        { title: "Add form component", acceptanceCriteria: ["Typecheck passes"] },
        { title: "Update navbar layout", acceptanceCriteria: ["Typecheck passes"] },
      ]);
      expect(result.valid).toBe(false);
      expect(result.missingQa).toHaveLength(2);
    });
  });

  describe("validateStoriesHaveTypecheck", () => {
    it("passes when all stories include typecheck", () => {
      const result = validateStoriesHaveTypecheck([validBackendStory, validUiStory]);
      expect(result.valid).toBe(true);
    });

    it("fails when story missing typecheck", () => {
      const result = validateStoriesHaveTypecheck([
        {
          title: "Add feature",
          acceptanceCriteria: ["Feature works"],
        },
      ]);
      expect(result.valid).toBe(false);
      expect(result.missingTypecheck).toContain("Add feature");
    });
  });
});
