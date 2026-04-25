# OG Image Spec — `byoh-og.png`

Per-post Open Graph card for `/blog/byoh`. Maintainer renders the PNG and drops it at `docs/public/blog/byoh-og.png`. This file is the design brief, not the asset.

## Mechanical requirements

- **Filename**: `byoh-og.png` (must match `ogImage` frontmatter in `byoh.mdx`).
- **Dimensions**: `1200 × 630` (Open Graph 1.91:1 — also fits Twitter/X summary_large_image, LinkedIn, dev.to cover).
- **Format**: PNG, sRGB, ≤300 KB after compression. No transparency (social platforms flatten to white inconsistently).
- **Safe zone**: keep all text inside a 1080×510 rectangle centered on the canvas. LinkedIn and Slack crop ~5% off each edge.
- **Text rendering**: ship as rasterized text in the PNG (no live fonts). Min effective text size at thumbnail (≈400px wide) ≥ 24px equivalent — i.e. headline ≥ 72px in the source.

## What to depict

A laptop screen full of stacked Node version managers (visual chaos) on the left, collapsing into a single clean terminal pane on the right showing:

```
$ oh sandbox my-agent
```

Arrow or fold-line between the two halves communicates "many → one." The post's hook is _replacement_, so the image must read as "before / after" at thumbnail size, not as a feature list.

If the visual gag is too busy at 1200×630, fall back to **Option B**: pure typographic card, headline only, no illustration. (Better to ship a clean type card than a cluttered illustration.)

## Copy on the card

- **Headline (large, top-left or center)**: `BYOH` (uppercase, monospace, brand color).
- **Subhead (smaller, beneath)**: `Stop installing agent CLIs on your laptop.`
- **Footer (small, bottom-right)**: `oh.mifune.dev` + small Open Harness mark.
- **No date.** Posts get re-shared; dated cards age badly.

## Color palette

Pull from the Open Harness docs theme — match `docs/theme.config.tsx` brand colors. If the live palette isn't easy to extract:

- **Background**: near-black `#0B0E14` (matches typical terminal dark theme).
- **Primary text / headline**: warm white `#F5F2EA`.
- **Accent (BYOH wordmark, terminal prompt `$`, accent strokes)**: amber `#F0B429` (reads well against dark on every social platform's preview chrome).
- **Secondary text (subhead, footer URL)**: muted gray `#9AA0A6`.

Avoid pure `#FFFFFF` — Twitter/X and LinkedIn render their own white chrome around it and the card disappears into the page.

## Typography

- **Headline**: monospace (JetBrains Mono, IBM Plex Mono, or whatever the docs site already uses for code). Reinforces the "this is a developer tool" read at a glance.
- **Subhead**: same family for consistency, lighter weight.
- **Footer URL**: same family, smaller, muted.

## Accessibility / fallback

- Provide a 2× retina version (`byoh-og@2x.png`, 2400×1260) if the rendering pipeline supports it. Optional.
- Ensure headline contrast ratio against background ≥ 7:1 (AAA). The amber-on-near-black combo above is ~10:1 — safe.

## Out of scope for this spec

- Animated / video card (OG only renders the still).
- Per-platform variants (Twitter card vs LinkedIn vs dev.to cover) — single PNG covers all three at 1200×630.
- Auto-generation pipeline. If we add one later (Satori, @vercel/og, etc.) it lives in a separate PR; this file documents the manual asset for now.
