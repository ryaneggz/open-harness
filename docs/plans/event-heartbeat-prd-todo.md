# PRD TODO — Event Heartbeat Delivery Bug

Issue: #34

- [ ] Confirm duplicate issues and PRs do not already cover this exact delivery bug.
- [ ] Inspect `packages/slack/src/events.ts` for event schema and synthetic event creation.
- [ ] Inspect `packages/slack/src/slack.ts` for Slack post primitives and logging boundaries.
- [ ] Inspect `packages/slack/src/agent.ts` for final response dispatch and persistence behavior.
- [ ] Define one canonical outbound response path for both normal and event-triggered runs.
- [ ] Ensure event execution context carries `threadTs` when present.
- [ ] Verify channel-level events still post top-level when `threadTs` is absent.
- [ ] Ensure event-originated final responses are appended to `log.jsonl`.
- [ ] Add structured event execution logging with correlation fields.
- [ ] Add or update tests for event parsing with and without `threadTs`.
- [ ] Add or update tests for visible channel delivery and thread delivery paths.
- [ ] Add or update tests for event-originated log persistence.
- [ ] Validate heartbeat behavior manually in Slack.
- [ ] Create and use a dedicated git worktree under `.worktrees/feat/` for implementation so the base worktree is not disturbed.
- [ ] Ensure this bugfix uses its own unique worktree directory and does not reuse another feature or bugfix worktree.
- [ ] Implement fix on PR branch from that dedicated worktree.
- [ ] Run tests and validate behavior.
- [ ] Push implementation commits.
- [ ] Use CI status to watch checks.
- [ ] Remove draft status once CI is green.
