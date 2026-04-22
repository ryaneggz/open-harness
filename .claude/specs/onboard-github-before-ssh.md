# Spec — Run GitHub CLI before SSH in onboard wizard

> Issue: [#108](https://github.com/ryaneggz/open-harness/issues/108)
> Parent effort: [#103](https://github.com/ryaneggz/open-harness/issues/103) / revival PR [#107](https://github.com/ryaneggz/open-harness/pull/107) (TypeScript port of `install/onboard.sh`)
> Status: proposed → in progress
> Date: 2026-04-21

## Relationship to #103 / #107

The TS port preserved the original bash step order verbatim. That was the
right call for the port — keep behaviour identical, prove parity, merge. This
change rides along on PR #107 as the first behavioural tweak on top of the
TypeScript foundation, rather than landing as a separate follow-up PR.

## Problem

The onboard wizard orders steps as:

```
1. LLM
2. Slack
3. SSH Key       ← runs ssh-keygen, prints pubkey, waits for user to add to GitHub
4. GitHub CLI    ← runs `gh auth login`
5. Cloudflare
6. Claude Code
```

`gh auth login` (interactive flow and `-p ssh`) can **generate an SSH key and
upload it to github.com in one step**. Because SSH runs first, the wizard today
either:

- leaves the user to copy-paste the generated pubkey into github.com/settings/keys, then come back and press Enter to re-verify; or
- lets the SSH step finish `unverified`, then has `gh auth login` generate a *second* unused key.

Both paths are worse than just running `gh` first.

## Resolution

Promote GitHub CLI to step 2/6 (right after LLM), demote Slack to 3/6, and
demote SSH to 4/6.

```
1. LLM
2. GitHub CLI    ← `gh auth login` may generate + upload SSH key itself
3. Slack
4. SSH Key       ← fast-path: key already exists, verify only
5. Cloudflare
6. Claude Code
```

Rationale for placing GitHub ahead of Slack as well: git credentials are the
most broadly-shared auth in the sandbox (clone, push, release, PR tooling,
and now SSH). Getting them in place immediately after the LLM means every
later step can assume they exist.

Nothing about the SSH step's fallback behaviour changes — if the user declined
`gh`'s SSH offer, the step still generates a key and prompts them to paste it
into GitHub, exactly as before. The win is the common path: `gh` handled SSH,
so step 4 just verifies and moves on.

## Mechanics

| Change | File | Notes |
|--------|------|-------|
| Reorder array | `packages/sandbox/src/onboard/steps/index.ts` | `ALL_STEPS` order becomes llm, github, slack, ssh, cloudflare, claude |
| Relabel GitHub | `packages/sandbox/src/onboard/steps/github.ts` | `label: "Step 2/6 — GitHub CLI"` |
| Relabel Slack | `packages/sandbox/src/onboard/steps/slack.ts` | `label: "Step 3/6 — Slack (Mom Bot)"` |
| Relabel SSH | `packages/sandbox/src/onboard/steps/ssh.ts` | `label: "Step 4/6 — SSH Key"` |
| Summary row order | `packages/sandbox/src/onboard/orchestrator.ts` (`printSummary`) | Row order matches new sequence |
| Hint string | `packages/sandbox/src/onboard/orchestrator.ts` | `--only` hint lists ids in new order |
| Tool description | `packages/sandbox/src/tools/onboard.ts` | `sandbox_onboard.only` parameter description |
| Tests | `packages/sandbox/src/__tests__/onboard-orchestrator.test.ts` | `allSteps` fixture re-ordered; label strings updated |
| Docs | `docs/content/docs/getting-started/onboarding.mdx` | Renumber headings; call out that `gh auth login` can generate the key; adjust troubleshooting |

No changes to `STEP_IDS`, the marker format, or `parseArgs`. Users who pass
`--only ssh` or `--only github` still hit the correct step.

## Non-goals

- **Do not** pass `-p ssh` to `gh auth login` unconditionally — the interactive prompt already offers SSH; flagging it would remove the user's choice of HTTPS.
- **Do not** delete the SSH fallback — users who pick HTTPS at the `gh` prompt still need a working key for git-over-SSH if that is what their downstream tools expect.

## Acceptance

- All existing onboard tests pass against the new order and labels.
- `openharness onboard --only ssh` and `--only github` still work.
- Marker file schema unchanged (version 1, same keys).
- Docs numbering is consistent between table and headings.
