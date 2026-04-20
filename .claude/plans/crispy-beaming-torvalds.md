# Plan: Adopt the Advisor Strategy

## Context

Anthropic released the **advisor strategy** (April 9, 2026) — an API-level feature that inverts traditional multi-model orchestration. Instead of Opus driving everything (or orchestrating smaller models top-down), a cheap executor model (Sonnet/Haiku) runs end-to-end and selectively escalates to Opus via a server-side `advisor_20260301` tool when deeper reasoning is needed.

**Why this matters for the harness:**
- The Slack bot (`packages/slack/`) currently runs **Opus for every message** (`defaultModel: "claude-opus-4-6"` in settings.json). This is expensive.
- Sonnet + Opus advisor achieves near-Opus quality at ~50-85% lower cost (Anthropic benchmarks: +2.7pp SWE-bench, -11.9% cost).
- The harness's existing multi-agent patterns (sonnet workers → opus council) already partially align with advisor philosophy — this plan formalizes and extends that alignment.

**Source:** [Anthropic blog post](https://claude.com/blog/the-advisor-strategy) and [Advisor tool API docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool)

---

## Scope

Two layers of change:

| Layer | What | Impact |
|-------|------|--------|
| **Layer 1: Direct API** | Slack bot makes direct Anthropic API calls via `pi-agent-core` | Concrete advisor tool integration — highest impact |
| **Layer 2: Claude Code agents** | `.claude/agents/`, `.claude/skills/` use the `Agent` tool | Philosophy/guidance updates only — the `Agent` tool does not expose the `advisor_20260301` API parameter |

**Not in scope:** Heartbeat daemon (spawns CLI agents, not API calls), application code inside sandboxes.

---

## Phase 1: Settings Schema

**File:** `.openharness/agent/settings.json`

Add advisor configuration block. Change default model from Opus to Sonnet.

```json
{
  "lastChangelogVersion": "0.66.1",
  "defaultProvider": "anthropic",
  "defaultModel": "claude-sonnet-4-6",
  "defaultThinkingLevel": "high",
  "advisor": {
    "enabled": true,
    "model": "claude-opus-4-7",
    "maxUses": 3,
    "caching": false
  }
}
```

**Design decisions:**
- `defaultModel` → `claude-sonnet-4-6` (executor model becomes the default)
- `advisor.model` → `claude-opus-4-7` (latest supported advisor per [docs compatibility table](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool#model-compatibility))
- `advisor.maxUses: 3` — recommended cap per Anthropic best practices
- `advisor.caching: false` — only worthwhile for 3+ advisor calls per conversation; most Slack interactions are shorter
- Backward-compatible: if `advisor` key absent, bot operates as before

---

## Phase 2: Slack Bot — Advisor Integration

**Primary file:** `packages/slack/src/agent.ts`

This is the highest-impact change. The bot currently constructs a single `model` object at startup (line 59) and uses Opus for everything.

### Step 2a: Extend `readAgentDefaults()` (line 28-49)

Add advisor config parsing:

```typescript
interface AdvisorConfig {
  enabled: boolean;
  model: string;
  maxUses: number;
  caching: boolean;
}

function readAgentDefaults(): {
  provider?: string;
  model?: string;
  advisor?: AdvisorConfig;
} {
  // ... existing try/catch logic, plus:
  return {
    provider: settings.defaultProvider || undefined,
    model: settings.defaultModel || undefined,
    advisor: settings.advisor || undefined,
  };
}
```

### Step 2b: Build advisor tool payload

After `readAgentDefaults()` call (line 52), construct the advisor tool object:

```typescript
const advisorToolDef = agentDefaults.advisor?.enabled
  ? {
      type: "advisor_20260301" as const,
      name: "advisor" as const,
      model: agentDefaults.advisor.model,
      max_uses: agentDefaults.advisor.maxUses,
      ...(agentDefaults.advisor.caching
        ? { caching: { type: "ephemeral", ttl: "5m" } }
        : {}),
    }
  : null;
```

### Step 2c: Inject advisor via `onPayload` callback

The `Agent` constructor (line 480) accepts `onPayload` which mutates the raw API payload before sending. Inject the advisor tool into the `tools` array:

```typescript
const agent = new Agent({
  // ... existing config (model now resolves to Sonnet) ...
  onPayload: advisorToolDef
    ? (payload: any, _model: any) => {
        if (payload.tools) {
          payload.tools.push(advisorToolDef);
        } else {
          payload.tools = [advisorToolDef];
        }
        // Add beta header
        payload.headers = {
          ...payload.headers,
          "anthropic-beta": [
            payload.headers?.["anthropic-beta"],
            "advisor-tool-2026-03-01",
          ]
            .filter(Boolean)
            .join(","),
        };
        return payload;
      }
    : undefined,
});
```

**Note:** Need to verify whether `onPayload` can set headers, or if we need a custom `streamFn` wrapper instead. The `Agent` constructor also accepts `streamFn` which wraps `streamSimple` — this is the fallback approach if `onPayload` doesn't pass through headers.

**Fallback — custom `streamFn`:**

```typescript
import { streamSimple } from "@mariozechner/pi-ai";

const agent = new Agent({
  // ...
  streamFn: advisorToolDef
    ? (model, context, options) =>
        streamSimple(model, context, {
          ...options,
          headers: {
            ...options?.headers,
            "anthropic-beta": "advisor-tool-2026-03-01",
          },
        })
    : undefined,
  onPayload: advisorToolDef
    ? (payload: any) => {
        payload.tools = [...(payload.tools || []), advisorToolDef];
        return payload;
      }
    : undefined,
});
```

### Step 2d: Update system prompt for advisor-aware behavior

Add advisor guidance section to `buildSystemPrompt()` (line 186), appended after the existing Tools section:

```text
## Advisor
You have access to an `advisor` tool backed by a stronger model. It takes NO parameters —
when you call advisor(), your entire conversation history is forwarded automatically.

Call advisor BEFORE substantive work — before writing, before committing to an interpretation.
If the task requires orientation first (finding files, reading context), do that, then call advisor.

Also call advisor:
- When you believe the task is complete (write the result first, then call advisor to validate)
- When stuck — errors recurring, approach not converging
- When considering a change of approach

For simple tasks (greetings, file reads, status checks), do NOT call the advisor.
You have up to 3 advisor calls per request. Use them wisely.

Give the advice serious weight. If you follow a step and it fails empirically, adapt.
```

This follows Anthropic's [recommended system prompt for coding tasks](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool#suggested-system-prompt-for-coding-tasks), condensed for Slack bot context.

### Step 2e: Handle advisor response blocks

The `advisor_tool_result` blocks appear in assistant content. The existing event handler (line 544-656) processes `content` blocks by type (`thinking`, `text`). Need to ensure `server_tool_use` and `advisor_tool_result` blocks are:
1. Passed through to `session.prompt()` on subsequent turns (the `AgentSession` likely handles this already since it replays full assistant content)
2. Not rendered to Slack as messages (they're internal plumbing)

Check whether `pi-agent-core`'s `Agent` class handles unknown content block types gracefully. If not, add a filter in the `message_end` handler to skip `server_tool_use` and `advisor_tool_result` types.

---

## Phase 3: Agent & Skill Philosophy Updates

These are documentation/guidance changes — no behavioral impact on Claude Code agents since they don't use the `advisor_20260301` API tool.

### 3a: PM agent — update model delegation table

**File:** `.claude/agents/pm.md` (line 27-31)

```markdown
## Model Delegation Guide

| Model | Best For | Cost | Note |
|-------|----------|------|------|
| **opus** | Synthesis, judgment, ambiguous requirements | highest | Advisor role — consult, don't execute |
| **sonnet** | Standard features, API routes, execution | medium | Default executor |
| **haiku** | Simple edits, config, boilerplate, docs | lowest | No advisor needed |

> **Advisor strategy**: For direct API consumers, prefer Sonnet executor + Opus advisor
> over running Opus directly. See [Anthropic advisor docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/advisor-tool).
```

### 3b: Agent builder — add advisor awareness

**File:** `.claude/agents/agent-builder.md`

Add to "Model Selection" section (around line 188):

```markdown
**Advisor Strategy (API consumers only)**:
When building agents that make direct Anthropic API calls (e.g., Slack bot),
recommend Sonnet as executor with Opus advisor tool. This achieves near-Opus
quality at Sonnet cost. For Claude Code sub-agents (Agent tool), traditional
model selection applies — the Agent tool does not expose the advisor API parameter.
```

### 3c: Delegate skill — update model selection guidance

**File:** `.claude/skills/delegate/SKILL.md` (line 77)

Update the Model column description:

```markdown
| **Model** | haiku (config/docs) / sonnet (standard) / opus (only for multi-file architecture synthesis) |
```

Add note: "Default to sonnet for most tasks. Reserve opus only when the task requires synthesizing across many files or resolving deeply ambiguous requirements."

---

## Phase 4: Tests

### 4a: Slack bot unit tests

**File:** `packages/slack/src/__tests__/agent.test.ts` (or create if needed)

- Test `readAgentDefaults()` returns advisor config when present in settings.json
- Test `readAgentDefaults()` returns `undefined` for advisor when field absent (backward compat)
- Test that `advisorToolDef` is constructed correctly when `advisor.enabled: true`
- Test that `advisorToolDef` is `null` when `advisor.enabled: false`
- Test that `onPayload` injects the advisor tool into the tools array

### 4b: Integration smoke test

- Start Slack bot with new settings
- Send a simple message → verify Sonnet handles it (no advisor call)
- Send a complex message → verify advisor is consulted (check logs for advisor token usage)

---

## Phase 5: Documentation

### 5a: Workspace AGENTS.md

Add brief "Model Strategy" note to Sub-Agents section:

```markdown
## Model Strategy

Multi-model orchestration follows the advisor pattern: Sonnet executes, Opus advises.
- Direct API consumers (Slack bot): Sonnet executor + Opus advisor tool
- Claude Code sub-agents: Sonnet for execution, Opus for synthesis/council roles
```

### 5b: Workspace TOOLS.md

Add advisor tool entry in environment section documenting the `advisor` field in `settings.json`.

### 5c: Run `/compress` after editing `.original.md` files

Per freshness-guard rule, edit `.original.md` files, then run `/compress` to regenerate compressed versions.

---

## Verification

1. **Settings**: `cat .openharness/agent/settings.json` — verify advisor config present
2. **TypeScript**: `cd packages/slack && pnpm run type-check` — no type errors
3. **Tests**: `cd packages/slack && pnpm test` — all pass
4. **Build**: `cd packages/slack && pnpm run build` — dist regenerated
5. **Smoke test**: Start Slack bot, send messages, verify:
   - Simple messages use Sonnet only (check cost logs)
   - Complex messages trigger advisor calls (check `usage.iterations` in logs)
   - `advisor_tool_result` blocks don't leak to Slack messages
6. **Lint/format**: `pnpm run lint && pnpm run format:check`

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Quality regression in Slack responses | `advisor.enabled` flag — set to `false` to revert without code changes |
| `pi-agent-core` doesn't handle `advisor_tool_result` blocks | Test with minimal script first; add content block filter if needed |
| Beta header conflicts | Concatenate with existing beta headers via comma-delimited string |
| `onPayload` doesn't support header injection | Fallback to custom `streamFn` wrapper approach (documented above) |
| Cost increase for Haiku-level tasks | System prompt instructs: "for simple tasks, do NOT call the advisor" |

---

## Files Modified

| File | Change Type |
|------|------------|
| `.openharness/agent/settings.json` | Config: add advisor block, change defaultModel |
| `packages/slack/src/agent.ts` | Code: advisor tool injection, system prompt update |
| `.claude/agents/pm.md` | Docs: update model delegation table |
| `.claude/agents/agent-builder.md` | Docs: add advisor strategy awareness section |
| `.claude/skills/delegate/SKILL.md` | Docs: update model selection guidance |
| `workspace/AGENTS.original.md` | Docs: add model strategy section |
| `workspace/TOOLS.original.md` | Docs: add advisor settings documentation |
