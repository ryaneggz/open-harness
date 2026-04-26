# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions use CalVer (`YYYY.M.D` with `-N` suffix for same-day releases) and match git tags.

Update policy and release automation live in [`.claude/rules/git.md`](.claude/rules/git.md) § Changelog.

## [Unreleased]

### Added
- README "Docker only (no installer)" section — concise compose-based deploy path for hosts that have only Docker + git.
- Per-page OpenGraph + canonical link tags via theme.config.tsx head function ([#140](https://github.com/ryaneggz/open-harness/issues/140)).
- Blog post draft: Worktree-per-agent — stages for Wed publish ([#145](https://github.com/ryaneggz/open-harness/pull/145)).
- Blog section at /blog and About page nav entry (#143).
- Blog post: BYOH — stop installing agent CLIs on your laptop (#144).
- Root `CHANGELOG.md` and Keep-a-Changelog workflow documented in `.claude/rules/git.md`; `/release` now promotes `[Unreleased]` to the new version section at tag time.
- Generate `sitemap.xml` and `robots.txt` during docs build via `next-sitemap` ([#141](https://github.com/ryaneggz/open-harness/issues/141)).
- Launch runbook consolidating manual cutover steps (DNS, GH settings, OG validation, GSC, promotion).

### Changed
- README and installation docs now use the short `https://oh.mifune.dev/install.sh` URL (302 redirect to the raw GitHub install script on `main`) instead of the long `raw.githubusercontent.com` URL.
- `/release` now executes the `[Unreleased]` → `[$VERSION]` promotion (was prose-only) and `release.yml` sources the GitHub Release body from the promoted CHANGELOG section via `body_path` instead of `generate_release_notes`, so the GitHub Release notes match the changelog byte-for-byte.
- Revert prior secondary product name; "Open Harness" is the sole brand across README, docs, and onboarding ([#157](https://github.com/ryaneggz/open-harness/issues/157)).
- Cloudflare onboarding step now requires an explicit public hostname (no default domain) ([#157](https://github.com/ryaneggz/open-harness/issues/157)).
- Slim README to ~110 lines, lead with oh CLI flow (#139).
- Wiki promoted from `workspace/wiki/` to `docs/wiki/` — same structure (`pages/`, `sources/`, `index.md`, `log.md`), now top-level alongside human-curated docs.
- 26 docs pages converted from Nextra MDX to plain markdown rendered by GitHub.

### Fixed
- Slack bot no longer drops oversized agent replies with cascading `msg_too_long` errors. Main message is capped at 2,900 chars with a `_message truncated — full response in thread_` footer; full content spills to thread replies; `setWorking(false)` always clears the working indicator. ([#135](https://github.com/ryaneggz/open-harness/issues/135))

### Removed
- Nextra docs site and the `.github/workflows/docs.yml` deployment — documentation is now plain markdown in `docs/`, read in the GitHub UI.
- Reference Next.js application at `workspace/projects/next-app/`, along with its CI jobs (`workspace/projects/next-app` paths in `ci.yml` / `release.yml`) and the release pre-flight gate referencing it.
- Root `package.json` scripts: `dev`, `docs:dev`, `docs:build`, `docs:preview`.

### Deprecated
### Security

---

Release history prior to this file: see [git tags](https://github.com/ryaneggz/open-harness/tags) and [GitHub Releases](https://github.com/ryaneggz/open-harness/releases). Most recent pre-changelog tag: `2026.4.22`.
