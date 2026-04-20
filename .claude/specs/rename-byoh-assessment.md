# Branding Assessment: `openharness` → `byoh`

> Status: **Proposal** · Tracks: [#93](https://github.com/ryaneggz/open-harness/issues/93)

## Context

Weighing a rebrand from **openharness** to **byoh**, where BYOH stands for **"Bring Your Own Harness."** Domains `byoh.io` and `byoh.sh` are available on Namecheap. This is a brand/positioning assessment — not a migration plan. The question is: *is this a better name for what this product actually is?*

## What the product actually is

This is an orchestrator that spins up sandboxed dev containers (via `.devcontainer/`), each running an AI coding agent (Claude, Codex, or Pi) with a mounted workspace containing SOUL.md, MEMORY.md, heartbeats, and skills. You bring your own agent, your own project template, your own rules — the tool provides the container lifecycle, the scaffolding, and the observability. The "harness" is the agent's runtime environment.

That framing matters for name evaluation.

## Current name: `openharness`

**Strengths**
- "Harness" is a legible metaphor for what's being provided — a controlled environment for an agent to run in.
- "Open" signals OSS + extensibility; reads clean for enterprise skeptics.
- Googleable in context ("openharness AI agent") — the compound word has low collision with unrelated products.

**Weaknesses**
- Passive framing. "Open harness" describes what the *project* is (an open one), not what the *user* does with it.
- "Open" is overloaded — every third dev tool is "Open{Thing}" (OpenTelemetry, OpenAI, OpenCode, OpenDevin). Signal is diluted.
- Already inconsistent in the repo: `openharness`, `open-harness`, `@openharness`, `OpenHarness` — four forms in use. That's a symptom of a name that doesn't have an obvious canonical spelling.

## Proposed name: `byoh` / "Bring Your Own Harness"

**Strengths**
- Active framing. "BYO*" is an instantly-recognizable developer-tool pattern (BYOC, BYOK, BYOD, BYOSSH). It tells users what *they* do: bring their agent, their project, their config.
- The expansion is the positioning. "Bring Your Own Harness" reads as a genuine product statement — you (the human) are in charge; the tool provides the substrate, not the opinions.
- Short. 4 letters. Fits everywhere — npm scope, CLI binary, Docker image tag, tweet handle.
- Differentiates from the "agent framework" crowd (LangGraph, CrewAI, AutoGen) by emphasizing *infrastructure*, not *cognition*. That's actually the correct positioning for what this is.
- Two good domains available at reasonable tiers (`.sh` is on-brand for shell/devtools; `.io` is mainstream SaaS).

**Weaknesses**
- "BYOH" alone doesn't self-explain the way "openharness" does. Users who see `byoh` without the expansion will bounce — every touchpoint (nav, hero, README H1, npm description) has to pair the acronym with "Bring Your Own Harness" until the brand earns recognition.
- Pronunciation is ambiguous: "bee-why-oh-aitch" vs "bye-oh" vs "boy-oh." Pick one and commit in podcast appearances, conf talks, etc. Recommend "bee-why-oh-aitch" — follows the BYO* family convention.
- Loses the "harness" keyword from the first impression. "openharness" at least tells you this is about running something; "byoh" tells you nothing until expanded. SEO for cold traffic gets harder, not easier.
- Acronym-as-brand is harder to love than a word-brand. "Docker," "Vercel," "Render," "Fly" — word-brands stick. "BYOH" is in the same family as "AWS" or "GCP," which are functional, not beloved.

## The comparison

| Dimension | openharness | byoh |
|-----------|-------------|------|
| Self-explanatory on first read | Yes | No — needs expansion |
| Positioning (what user does) | Passive | Active, on-brand for devtools |
| Differentiation from agent frameworks | Weak | Strong |
| Memorability | Medium (compound) | High (4 letters) |
| SEO on cold traffic | Medium | Weak |
| Typability / CLI ergonomics | Long (9 chars, already uses `oh` alias) | Short (4 chars) |
| Trademark/collision risk | Low | Low-to-medium (BYOH used informally in hosting) |
| "Feels like a brand" | 6/10 | 7/10 if paired with tagline, 4/10 bare |

## The real question

The name change is justified **if** the product's positioning story is "you bring the agent, we run the harness." If that's genuinely the pitch — if the docs lead with "plug in any coding agent, get a sandboxed environment with memory, heartbeats, and skills" — then `byoh` crystallizes that. The current `CLAUDE.md` leans this direction ("you do NOT write application code... your sole purpose is to manage sandboxed agent workspaces"), so the framing fits.

The name change is **not** justified if the product is really about being *the* harness (opinionated, batteries-included, our agent + our skills + our runtime). In that case, "openharness" is more honest and `byoh` undersells the product.

Best signal for which it is: what does the landing page hero *want* to say? If it wants to say "bring your own agent, we handle the rest," rename. If it wants to say "the open-source agent sandbox platform," keep.

## Domain recommendation

- **Primary: `byoh.sh`** — on-brand for developer tooling, signals "shell/sandbox/scripting," matches the audience.
- **Secondary: `byoh.io`** — park it and redirect. `.io` is what non-developers will guess; cheap insurance.

Grab both. They're cheap. Don't split product vs docs across them — one canonical domain, one redirect.

## Positioning copy to test before committing

Draft three one-liners and read them back-to-back. If the BYOH framing is genuinely better, this should be obvious:

1. *Current:* "OpenHarness — the open-source orchestrator for AI coding agents."
2. *Proposed literal:* "BYOH — Bring Your Own Harness. The sandbox platform for AI coding agents."
3. *Proposed punchy:* "BYOH. Bring your agent. We'll handle the harness."

If #3 makes you smile and #1 feels corporate, the rename is right. If #1 feels more "real" and #3 feels like a marketing stunt, the rename is wrong.

## Risks to the brand (not the code)

- **Acronym confusion** — BYOH is close to BYOD (Bring Your Own Device), which is an IT/security term. Some audiences will parse it as a security posture, not a dev tool. Verify the expansion is prominent on first touch.
- **Loss of "harness" as a keyword** — search traffic for "AI agent harness" or "agent sandbox harness" won't land on a site called "byoh" unless the H1 spells it out. Every page title should carry "harness" even if the brand is BYOH.
- **BYO\* saturation** — the pattern is familiar, which cuts both ways. It's legible but unoriginal. If you want a distinctive brand moment, `byoh` won't provide it; it'll feel like a category entry, not a category-definer.
- **Trademark / conflict check** — quick USPTO/WIPO search before printing stickers. Informal hosting-community uses of "BYOH" exist ("bring your own host"); unlikely to be a legal problem but worth 10 minutes of diligence.

## Recommendation

**Lean yes, conditional on positioning.** `byoh` is a sharper name *if* the product story is genuinely "you bring the agent, we run the harness." It's active, short, on-pattern for devtools, and forces the positioning to be explicit. `openharness` is safer and more self-explanatory but blends into the OSS-agent-tool crowd.

Before committing:

1. **Write the landing page hero in both voices.** If BYOH-voice reads better, rename.
2. **Say "BYOH" out loud five times.** If it still feels weird after five, it'll feel weird forever — kill it.
3. **Check `npmjs.com/org/byoh` and USPTO for conflicts** (namecheap availability isn't the full picture).
4. **Decide canonical capitalization** — `BYOH` (acronym, all caps in prose) vs `byoh` (lowercase, like `pnpm`). Recommend lowercase for the CLI/npm/docker and `BYOH` only when spelled out in prose.
5. **Pick one domain as primary** (`byoh.sh` recommended), grab both, redirect the other.

If all five pass the gut check, the rename is justified. The technical migration is a coordinated-but-tractable day of work that can happen in a dual-compat release cycle so existing users aren't broken — scoped in a follow-up issue if this proposal is approved.
