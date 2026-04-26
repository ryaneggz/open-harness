# OG Image Spec — Worktree Per Agent

Target file: `docs/public/blog/worktree-per-agent-og.png`
Status: NOT YET GENERATED — maintainer supplies offline before Wednesday publish.

## Dimensions

- 1200 x 630 px (Open Graph standard, also valid for Twitter `summary_large_image`)
- PNG, sRGB, < 300 KB

## Layout

Three-column visual showing the core idea: one container, many worktrees, one agent per worktree.

```
+------------------------------------------------------------+
|  [oh sandbox container]                                    |
|       |                                                    |
|   .worktrees/                                              |
|     +---- feat/docs   -> Claude Code   -> push feat/docs   |
|     +---- feat/tests  -> Codex         -> push feat/tests  |
|     +---- review/all  -> Pi            -> push review/all  |
|                                                            |
|  ONE WORKTREE PER AGENT                                    |
|  oh.mifune.dev/blog/worktree-per-agent                     |
+------------------------------------------------------------+
```

A simplified version of the in-post Mermaid diagram is fine — drop the
heartbeat scheduler and any decorative arrows so it reads at thumbnail size.

## Typography

- Title: "ONE WORKTREE PER AGENT" — bold sans-serif (Inter / Space Grotesk),
  ~72 px, white on dark bg
- Sub-line: "$40/mo per agent? No. One container. Many worktrees." —
  ~32 px, muted gray
- URL: bottom right, monospace, ~24 px

## Color Palette

Match Open Harness brand:

- Background: `#0a0a0a` (near-black)
- Primary text: `#ffffff`
- Accent (boxes / arrows): `#7c3aed` (Open Harness purple)
- Muted: `#a1a1aa`
- Code / mono: `#34d399` (mint green) for branch names

## Logo

Bottom-left: Open Harness logomark (16 px from edge), 48 px tall.
Asset: `docs/public/icon.svg`.

## Variants

Optional twitter-only variant at 1600 x 900 if a higher-res share card
is wanted — same composition, scaled.

## Verification

Once generated:

1. Drop into `docs/public/blog/worktree-per-agent-og.png`
2. Confirm `frontmatter.ogImage: /blog/worktree-per-agent-og.png` resolves
3. Test render at https://www.opengraph.xyz/url/<url-encoded-canonical>
4. Test Twitter card at https://cards-dev.twitter.com/validator
