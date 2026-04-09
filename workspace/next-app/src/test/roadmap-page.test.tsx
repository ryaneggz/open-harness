import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import RoadmapPage from "@/app/roadmap/page";

afterEach(() => {
  cleanup();
});

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("roadmap page", () => {
  it("renders the page heading", () => {
    render(<RoadmapPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Product Roadmap" })).toBeDefined();
  });

  it("shows signal-over-features principle", () => {
    render(<RoadmapPage />);
    expect(screen.getByText(/Signal over features/)).toBeDefined();
  });

  it("shows how to influence callout", () => {
    render(<RoadmapPage />);
    expect(screen.getByText("How to influence the roadmap")).toBeDefined();
  });

  it("shows empty state when roadmap is empty", () => {
    render(<RoadmapPage />);
    expect(screen.getByText("Roadmap initializing")).toBeDefined();
  });

  it("links to GitHub issues for voting", () => {
    render(<RoadmapPage />);
    const links = screen.getAllByRole("link");
    const githubIssuesLink = links.find(
      (link) =>
        link.getAttribute("href") ===
        "https://github.com/ryaneggz/next-postgres-shadcn/issues"
    );
    expect(githubIssuesLink).toBeDefined();
  });
});
