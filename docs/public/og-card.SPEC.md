# OG Card Design Spec — `og-card.png`

**Output path**: `docs/public/og-card.png`
**Consumed by**: `theme.config.tsx` head function as `https://oh.mifune.dev/og-card.png`

## Dimensions

1200 × 630 px (2× retina export: 2400 × 1260 px, downscaled to 1200 × 630 on delivery)

## Required Elements

1. **Wordmark** — "Open Harness" in the primary display font, left-aligned, large (≥ 72 px equivalent)
2. **One-liner** — "AI Agent Sandbox Orchestrator" in a lighter weight directly below the wordmark
3. **Agent icons or wordmarks** — small horizontal row of logos: Claude, Codex, Pi Agent (or generic robot silhouettes if trademarks are a concern); bottom-left quadrant
4. **Footer URL** — `oh.mifune.dev` in small monospace, bottom-right corner
5. **Subtle grid or dot pattern** — low-opacity background texture (optional but preferred)

## Color Palette

| Role | Value | Notes |
|------|-------|-------|
| Background | `#0a0a0a` | Near-black; reads well on X dark mode |
| Primary text | `#ffffff` | Wordmark and one-liner |
| Accent | `#6ee7b7` (emerald-300) or `#38bdf8` (sky-400) | One-liner or underline accent; pick one |
| Secondary text | `#71717a` (zinc-500) | Footer URL, agent label captions |
| Border / divider | `#27272a` (zinc-800) | Optional 1 px bottom rule under wordmark |

Aesthetic reference: Vercel, Linear, and Plausible OG cards — clean, minimal, dark, developer-tool.

## Trademark / Imagery Hygiene

- **No Matrix imagery** (falling green characters, Neo silhouette, pill motifs). These are Warner Bros. trademarks and create brand confusion.
- Do not use the Anthropic "Claude" logo without checking current brand guidelines; a generic robot icon is a safe fallback.
- "Open Harness" and "oh.mifune.dev" are safe to feature prominently.

## Reference Inspirations

- Vercel OG: https://vercel.com/og-image (dark, wordmark + tagline, minimal)
- Linear OG: https://linear.app (icon + product name, bold type)
- Plausible OG: https://plausible.io (clean stats, dark bg, accent color)

## Delivery

Drop the final PNG at `docs/public/og-card.png` and commit.
Twitter Card Validator: https://cards-dev.twitter.com/validator
LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
