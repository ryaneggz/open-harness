# Event Heartbeat Delivery Resolution Plan

Issue: #34

## Strategic-Proposal Style Spec Summary

### Problem
Slack periodic heartbeat events are firing, but the resulting assistant replies are not reliably visible in the intended Slack channel or thread. This creates a false-positive execution state where the harness believes work completed, but Slack users do not see the response.

### Best Approach
1. Treat this as a unified outbound delivery bug, not only a scheduler bug.
2. Preserve destination metadata end-to-end with optional `threadTs`.
3. Route event-originated responses through the exact same Slack post path as normal assistant responses.
4. Persist all event-originated bot replies to `log.jsonl`.
5. Add structured event lifecycle logging for `loaded`, `triggered`, `posted`, `persisted`, and `failed`.

### Recommended Design
- Implementation work must be performed from a git worktree under `.worktrees/feat/` so the base worktree remains undisturbed.
- Event schema supports optional `threadTs` on immediate, one-shot, and periodic events.
- Synthetic event retains destination metadata in `SlackEvent`.
- Agent response helpers decide between channel post and thread post from one canonical execution context.
- Logging remains centralized so event replies are recorded exactly once.
- Add a debug log file for event execution tracing and Slack post failures.

### Risks
- Duplicate logging if event path and normal path both persist output.
- Regressions for existing event files without `threadTs`.
- Subtle mismatch between placeholder working messages and final response destination.

### Acceptance Criteria
1. Event without `threadTs` posts in channel.
2. Event with `threadTs` posts in thread.
3. Visible Slack delivery matches configured destination.
4. Event replies append to `log.jsonl`.
5. Debug logs provide enough data to diagnose delivery failures.
6. Legacy event files remain compatible.
