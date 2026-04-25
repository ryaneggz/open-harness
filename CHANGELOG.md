# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions use CalVer (`YYYY.M.D` with `-N` suffix for same-day releases) and match git tags.

Update policy and release automation live in [`.claude/rules/git.md`](.claude/rules/git.md) § Changelog.

## [Unreleased]

### Added
### Changed
### Fixed
### Removed
### Deprecated
### Security

## [2026.4.24] - 2026-04-24

### Added
- Root `CHANGELOG.md` and Keep-a-Changelog workflow documented in `.claude/rules/git.md`; `/release` now promotes `[Unreleased]` to the new version section at tag time.

### Fixed
- Slack bot no longer drops oversized agent replies with cascading `msg_too_long` errors. Main message is capped at 2,900 chars with a `_message truncated — full response in thread_` footer; full content spills to thread replies; `setWorking(false)` always clears the working indicator. ([#135](https://github.com/ryaneggz/openharness/issues/135))

---

Release history prior to this file: see [git tags](https://github.com/ryaneggz/openharness/tags) and [GitHub Releases](https://github.com/ryaneggz/openharness/releases). Most recent pre-changelog tag: `2026.4.22`.
