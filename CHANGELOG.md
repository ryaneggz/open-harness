# Changelog

All notable changes to this project are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions use CalVer (`YYYY.M.D` with `-N` suffix for same-day releases) and match git tags.

Update policy and release automation live in [`.claude/rules/git.md`](.claude/rules/git.md) § Changelog.

## [Unreleased]

### Added
- Blog section at /blog and About page nav entry (#143).
- Root `CHANGELOG.md` and Keep-a-Changelog workflow documented in `.claude/rules/git.md`; `/release` now promotes `[Unreleased]` to the new version section at tag time.

### Changed
### Fixed
- Slack bot no longer drops oversized agent replies with cascading `msg_too_long` errors. Main message is capped at 2,900 chars with a `_message truncated — full response in thread_` footer; full content spills to thread replies; `setWorking(false)` always clears the working indicator. ([#135](https://github.com/ryaneggz/openharness/issues/135))

### Removed
### Deprecated
### Security

---

Release history prior to this file: see [git tags](https://github.com/ryaneggz/openharness/tags) and [GitHub Releases](https://github.com/ryaneggz/openharness/releases). Most recent pre-changelog tag: `2026.4.22`.
