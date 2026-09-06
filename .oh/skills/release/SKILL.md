---
name: release
description: |
  Release a validated Open Harness commit by pushing it to main or master, then
  monitor the automatic SemVer/GHCR/GitHub Release workflow. TRIGGER when:
  asked to release, version, ship, cut a release, or verify release artifacts.
argument-hint: "[--dry-run]"
---

# Release

`.github/workflows/release.yml` owns version allocation and artifact mutation.
The workflow validates every push to `main` or `master` first, then reserves the
`v<version>` tag for the version root `package.json` names, publishes GHCR and
the CLI (or confirms the CLI version already exists), and finally publishes the
GitHub Release. Do not pre-create a release tag, draft, or `release/<version>`
branch.

Root `package.json` holds the release version. A release is a deliberate bump:
an unchanged version gives a clean, green no-op run.

## Artifact set

One release produces, from one build and one commit:

- Two npm packages: `@mifune/agro` (the `agro` executable, from `.oh/cli`) and the
  `@mifune/openharness` delegation shim (the `oh` executable, from
  `.oh/cli/legacy`), published in that order. The shim is deprecated toward
  `@mifune/agro` immediately after publication.
- Four immutable GHCR tags: `ghcr.io/mifunedev/openharness:<version>`,
  `:sha-<sha>`, `ghcr.io/mifunedev/agro:<version>`, and `:sha-<sha>`, verified to
  share one manifest digest (`.oh/scripts/verify-release-aliases.sh`), then
  `latest` on both repositories (`.oh/scripts/promote-release-latest.sh`).
- Four GitHub Release assets: `agro.js`, `oh.js`, `get-agro.sh`, and `get-oh.sh`,
  attached before the release is undrafted so
  `releases/latest/download/<asset>` resolves on publication.

## Version sites

A release cut bumps the same version in four places, and `version-parity.sh`
fails the build when they drift:

1. `package.json` (root).
2. `.oh/cli/package.json` and `.oh/cli/package-lock.json`.
3. `.oh/cli/legacy/package.json` `version`.
4. `.oh/cli/legacy/package.json` `dependencies["@mifune/agro"]` (exact pin, no
   range).

## Operator prerequisites this repository cannot verify

- The npm token has publish rights for the `@mifune` scope, including the
  `@mifune/agro` package name.
- The GHCR package `mifunedev/agro` is set to public after its first push. A new
  GHCR package is private by default, so `agro sandbox install docker` cannot
  pull it until the operator changes the visibility.
- The compatibility SLA clock starts at the first public AGRO release, that is,
  the first release that publishes `@mifune/agro` and `ghcr.io/mifunedev/agro`.

## 1. Resolve the canonical destination

```bash
if git remote get-url upstream >/dev/null 2>&1; then
  REMOTE=upstream
else
  REMOTE=origin
fi
REPO=$(gh repo view "$(git remote get-url "$REMOTE")" --json nameWithOwner -q .nameWithOwner)

if git ls-remote --exit-code --heads "$REMOTE" main >/dev/null 2>&1; then
  TARGET=main
elif git ls-remote --exit-code --heads "$REMOTE" master >/dev/null 2>&1; then
  TARGET=master
else
  echo "No main or master release branch exists on $REMOTE" >&2
  exit 1
fi
SOURCE=$(git branch --show-current)
printf 'Repo: %s · source: %s · release branch: %s\n' "$REPO" "$SOURCE" "$TARGET"
```

## 2. Pre-flight

Require all of the following before a release push:

- The working tree is clean.
- The source commit is pushed to the canonical remote.
- CI for the source commit is green.
- Root `package.json` names the version to publish, the three other version
  sites match it (`bash .oh/evals/probes/version-parity.sh`), and no
  `v<version>` tag exists yet. An unbumped push is a green no-op that publishes
  nothing.
- `CHANGELOG.md` has a `## [<version>]` section matching that version (the
  workflow falls back to `[Unreleased]` when the section is absent).
- The remote release branch is an ancestor of the source commit, so promotion is
  a fast-forward.

```bash
test -z "$(git status --porcelain)" || { echo "Working tree is dirty" >&2; exit 1; }
git fetch "$REMOTE" "$SOURCE" "$TARGET" --tags
VERSION=$(node -p "require('./package.json').version")
git rev-parse -q --verify "refs/tags/v$VERSION" >/dev/null && {
  echo "v$VERSION is already tagged; bump package.json to cut a new release" >&2
  exit 1
}
grep -q "^## \[$VERSION\]" CHANGELOG.md || {
  echo "CHANGELOG.md has no section for $VERSION" >&2
  exit 1
}
SHA=$(git rev-parse "$REMOTE/$SOURCE")
test "$(git rev-parse HEAD)" = "$SHA" || {
  echo "Local $SOURCE is not identical to $REMOTE/$SOURCE" >&2
  exit 1
}
git merge-base --is-ancestor "$REMOTE/$TARGET" "$SHA" || {
  echo "$TARGET has diverged from $SOURCE; reconcile before release" >&2
  exit 1
}
```

If `$ARGUMENTS` contains `--dry-run`, report the resolved repo, source, target,
SHA, clean-tree result, and fast-forward result, then stop without pushing.

## 3. Trigger the release

Promote the exact checked source SHA. The branch push—not a manually created
tag—is the release trigger.

```bash
git push "$REMOTE" "$SHA:refs/heads/$TARGET"
```

The workflow reads the version from root `package.json` on the pushed commit, so
retries always resolve the same version. A retry reuses a same-SHA draft or
published release. When the tag already exists on a different commit, the reserve
step reports the version as already released and every publication job skips —
the run stays green. Bump the version to publish again.

## 4. Monitor and verify

Find the `release.yml` push run for `$SHA` and `$TARGET`, then watch it:

```bash
gh run list --repo "$REPO" --workflow release.yml --branch "$TARGET" \
  --commit "$SHA" --event push --limit 5 \
  --json databaseId,headSha,status,conclusion,url
# Once the matching run appears:
gh run watch <run-id> --repo "$REPO" --exit-status
```

After success, fetch tags and identify the SemVer tag pointing to the exact SHA,
then verify the four immutable image tags, the two npm packages, the release
assets, and the GitHub Release. The tag carries the `v` prefix; the image tags
do not:

```bash
git fetch "$REMOTE" --tags
TAG=$(git tag --points-at "$SHA" \
  | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' \
  | sort -V | tail -1)
test -n "$TAG" || { echo "No SemVer tag found for $SHA" >&2; exit 1; }
gh release view "$TAG" --repo "$REPO" --json assets -q '.assets[].name'
.oh/scripts/verify-release-aliases.sh check \
  "ghcr.io/mifunedev/openharness:${TAG#v}" "ghcr.io/mifunedev/agro:${TAG#v}"
npm view "@mifune/agro@${TAG#v}" version
npm view "@mifune/openharness@${TAG#v}" version deprecated
printf 'Images: ghcr.io/mifunedev/{openharness,agro}:%s and :sha-%s\n' "${TAG#v}" "$SHA"
```

The asset list must name `agro.js`, `oh.js`, `get-agro.sh`, and `get-oh.sh`.

The canonical mutable/latest branch is `main` when it exists, otherwise
`master`. Immediately before promotion, the workflow freshly reads both remote
refs and promotes the canonical head's versioned image to `latest` by immutable
digest. Stale canonical runs and every noncanonical-branch run skip `latest`;
GitHub's `make_latest` flag uses the same rule after a second fresh check.
