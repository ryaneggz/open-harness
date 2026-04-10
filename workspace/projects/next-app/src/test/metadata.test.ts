import { describe, it, expect, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-geist-sans" }),
  Geist_Mono: () => ({ variable: "--font-geist-mono" }),
}));

import { metadata as rootMetadata } from "@/app/layout";
import { metadata as roadmapMetadata } from "@/app/roadmap/page";
import type { Metadata } from "next";

function getOpenGraph(metadata: Metadata): NonNullable<Metadata["openGraph"]> {
  expect(metadata.openGraph).toBeDefined();
  return metadata.openGraph!;
}

describe("root layout metadata", () => {
  const og = getOpenGraph(rootMetadata);

  it("includes openGraph.title", () => {
    expect(og.title).toBeDefined();
    expect(og.title).toContain("OpenHarness");
  });

  it("includes openGraph.description", () => {
    expect(og.description).toBeDefined();
    expect(typeof og.description).toBe("string");
  });

  it("includes openGraph.url", () => {
    expect("url" in og && og.url).toBeDefined();
  });

  it("includes openGraph.siteName", () => {
    expect("siteName" in og && og.siteName).toBe("OpenHarness");
  });

  it("includes twitter.card = summary_large_image", () => {
    expect(rootMetadata.twitter).toBeDefined();
    const twitter = rootMetadata.twitter as { card: string };
    expect(twitter.card).toBe("summary_large_image");
  });

  it("includes openGraph.images with correct dimensions", () => {
    expect("images" in og && og.images).toBeDefined();
    const images = "images" in og ? og.images : undefined;
    expect(Array.isArray(images)).toBe(true);

    const firstImage = (images as Array<{ url: string; width: number; height: number }>)[0];
    expect(firstImage.url).toContain("/og-image.png");
    expect(firstImage.width).toBe(1200);
    expect(firstImage.height).toBe(630);
  });
});

describe("roadmap page metadata", () => {
  const og = getOpenGraph(roadmapMetadata);

  it("includes openGraph.title containing Roadmap", () => {
    expect(og.title).toBeDefined();
    expect(og.title).toContain("Roadmap");
  });

  it("includes openGraph.description", () => {
    expect(og.description).toBeDefined();
    expect(typeof og.description).toBe("string");
  });

  it("includes twitter.card = summary_large_image", () => {
    expect(roadmapMetadata.twitter).toBeDefined();
    const twitter = roadmapMetadata.twitter as { card: string };
    expect(twitter.card).toBe("summary_large_image");
  });
});
