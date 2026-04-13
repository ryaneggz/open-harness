# Documentation Drift Delegated Workflow

Use /delegate for this entire workflow.

Goal: find the highest-impact documentation drift and align docs with current product reality without duplicating existing work.

## Required workflow
1. Check for duplicate existing work first:
   - existing open GitHub issues about the same documentation drift
   - existing open PRs or draft PRs covering the same scope
   - recent merged PRs that already solved it
   - if duplicate work exists, do not duplicate effort; summarize and stop
2. Use /strategic-proposal to rank and prioritize highest-impact documentation drift.
3. Select the top validated docs-drift item.
4. Create a GitHub issue to spec the work.
5. Create a draft PR for the chosen fix.
6. Commit planning artifacts to that draft PR.
7. Implement the documentation alignment changes.
8. Commit implementation changes to the PR branch and push.
9. Use /ci-status to watch CI until completion.
10. If CI passes, mark the PR ready for review.
11. If nothing actionable is found, respond with exactly `[SILENT]`.

## Constraints
- Must use /delegate for the full workflow.
- Must avoid duplicate issues and PRs.
- Prefer highest user impact and highest drift severity first.
- Keep changes narrowly scoped to the selected docs-drift issue.
