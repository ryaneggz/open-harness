# PRD: Integrate `pi-web-ui` into Open Harness

## Context

Open Harness currently exposes two agent surfaces: a terminal (Claude Code / `pi`) and Slack (`packages/slack/`, a vendored fork of `pi-mono/packages/mom`). There is no **browser chat UI**, yet upstream `pi-mono` publishes `@mariozechner/pi-web-ui` — a reusable Lit-based chat UI (ChatPanel, storage stores, REPL + artifact tools) that already drives production AI assistants. Vendoring it gives operators a third, browser-reachable way to talk to harness agents, exposed via the existing cloudflared tunnel alongside Slack.

The integration must match the precedent set by `packages/slack/`: **vendor the fork, never consume from npm**, commit `src/` and `dist/`, pin exact sibling versions, and expose via docker-compose overlays.

## Delivery model

- **Vendored fork** at `packages/web-ui/` (source of truth). Mirrors `packages/slack/`.
- **Standalone Vite example app** at `packages/web-ui/example/` (kept from upstream), built to a static bundle served by `nginx:alpine` behind the cloudflared tunnel.
- **Two-phase agent wiring**:
  - **Phase 1** — BYO-keys, 100% client-side. Ship fast, prove the deployment.
  - **Phase 2** — sandbox agent bridge: ChatPanel talks to openharness sandbox agents (same ones driving Slack) over a WebSocket bridge, so the web UI becomes a first-class front end for harness-managed agents.

## Phased Plan

### Phase 0 — Vendoring (prerequisite, 1 PR)

**Goal:** get `packages/web-ui/` building and committed. No deployment, no agent wiring.

1. Copy `pi-mono/packages/web-ui/` → `packages/web-ui/` (source + tsconfig + build scripts).
2. Copy `pi-mono/packages/web-ui/example/` → `packages/web-ui/example/`.
3. Rewrite `file:` deps: upstream uses `"@mariozechner/pi-ai": "file:../../ai"`. We don't vendor pi-ai. Replace with **exact version pins** against the npm publish matching pi-mom's lockstep version (currently `0.67.68`).
4. Rename package: `@mariozechner/pi-web-ui` → **`@openharness/web-ui`**. Keep the internal module name where examples import it to minimize diff, but publish under the openharness scope.
5. Add `packages/web-ui/` to `pnpm-workspace.yaml`.
6. Add root `"build:web-ui"` script and ensure `pnpm build` at root includes it.
7. Commit `src/` + `dist/` + `example/dist/` (matches slack pattern of committing compiled output).
8. Write `.claude/rules/web-ui-package.md` mirroring `.claude/rules/slack-package.md`: vendor-not-npm, exact version pins, configurable provider, rebuild dist before commit.
9. Write `.claude/specs/web-ui-package-spec.md` documenting divergence points from upstream.

**Critical files created/modified:**
- `packages/web-ui/package.json` (new, scoped `@openharness/web-ui`)
- `packages/web-ui/example/package.json` (new, private)
- `packages/web-ui/tsconfig.build.json` (copy from upstream)
- `packages/web-ui/src/**` (copy from upstream)
- `pnpm-workspace.yaml` (add `packages/web-ui`, `packages/web-ui/example`)
- `package.json` (add `build:web-ui` script)
- `.claude/rules/web-ui-package.md` (new)
- `.claude/specs/web-ui-package-spec.md` (new)

**Verification:**
- `pnpm install && pnpm --filter @openharness/web-ui build` produces `dist/index.js`, `dist/index.d.ts`, `dist/app.css`.
- `pnpm --filter pi-web-ui-example build` produces `example/dist/index.html` + hashed assets.
- `pnpm --filter pi-web-ui-example dev` opens a working chat at `http://localhost:5173` after pasting an Anthropic key in the settings dialog.

### Phase 1 — Deployment (BYO keys, 1 PR)

**Goal:** web-ui reachable via cloudflared, users paste their own API keys. Zero harness-side agent coupling.

1. Add `.devcontainer/docker-compose.web-ui.yml`:
   - Service `web-ui`: builds `packages/web-ui/example/` (multi-stage Dockerfile — node builder + `nginx:alpine` runtime).
   - Binds `packages/web-ui/example/dist` as static root.
   - Network-attached to the shared compose network so cloudflared can reach it.
2. Add `packages/web-ui/example/Dockerfile` (multi-stage).
3. Extend `.devcontainer/cloudflared/config.yml` (or equivalent overlay): add an ingress rule routing `web-ui.<tunnel-host>` → `http://web-ui:80`.
4. Update `.openharness/config.json` to include `.devcontainer/docker-compose.web-ui.yml` in `composeOverrides`.
5. Document the public URL + BYO-keys flow in `docs/` (new page: `docs/content/web-ui.mdx`).
6. `/provision` skill rebuild: verify web-ui container comes up healthy during `pnpm test:setup`.

**Critical files:**
- `.devcontainer/docker-compose.web-ui.yml` (new)
- `packages/web-ui/example/Dockerfile` (new)
- `.devcontainer/cloudflared/config.yml` (edit — add ingress rule)
- `.openharness/config.json` (edit — add overlay)
- `docs/content/web-ui.mdx` (new)

**Verification:**
- `/provision` succeeds with the new overlay.
- `curl -I https://web-ui.<tunnel-host>` returns 200.
- Chrome: open URL → settings → paste Anthropic key → send "hello" → stream reply. Session persists in IndexedDB across reloads.
- Existing Slack + sandbox flows unaffected (`/repair` green).

### Phase 2 — Sandbox agent bridge (multi-PR)

**Goal:** ChatPanel talks to openharness sandbox agents, matching the architecture that powers the Slack bot. Users no longer need their own API keys; they auth to the harness and speak to managed agents.

The upstream ChatPanel is driven by a concrete `Agent` instance from `@mariozechner/pi-agent-core` whose `convertToLlm` issues direct provider calls. To route through the sandbox, we substitute a **remote agent proxy** that preserves the `Agent` interface but streams over WebSocket.

**Sub-phases:**

**2a. Agent bridge server** (`packages/web-ui/bridge/`)
- New TypeScript service in `packages/web-ui/bridge/`, built to `dist/bridge.js`.
- Exposes `WS /agent` that accepts ChatPanel messages, instantiates a `pi-agent-core` Agent inside the harness (same construction path as `packages/slack/src/agent.ts`), streams `AgentMessage` deltas back.
- Reuses provider/model selection from harness `settings.json` (same config reader as slack).
- Reuses `pi-coding-agent` tooling so the web UI can run code in the sandbox, mirroring Slack's tool suppression and threadTs conventions adapted for HTTP/WS.
- Auth: bearer token issued by harness (initial implementation: shared secret in env; follow-up: per-user GitHub OAuth).

**2b. Client-side `RemoteAgent`** (`packages/web-ui/src/RemoteAgent.ts`)
- New class implementing the subset of `Agent` that ChatPanel calls (`state`, message push, streaming events, tool-result relay).
- Swaps transport from direct-LLM to WS.
- Falls back to BYO-keys mode if bridge unreachable (keeps Phase 1 flow as safety net).

**2c. Wire-up in `example/src/main.ts`**
- Feature-flag `VITE_AGENT_MODE=byok|bridge`.
- When `bridge`, instantiate `RemoteAgent` instead of local `Agent`.
- Hide the `ApiKeyPromptDialog` in bridge mode; show bridge-status indicator instead.

**2d. Compose overlay update**
- Extend `.devcontainer/docker-compose.web-ui.yml` with a second service `web-ui-bridge` (node runtime) running `packages/web-ui/bridge/dist/bridge.js`.
- Add cloudflared ingress rule: `web-ui-api.<tunnel-host>` → `http://web-ui-bridge:8787`.
- nginx config in the static service adds a reverse-proxy `/agent` → bridge, or bake the bridge URL into the build via `VITE_BRIDGE_URL`.

**Critical files:**
- `packages/web-ui/bridge/src/server.ts` (new — WS server)
- `packages/web-ui/bridge/src/agent-factory.ts` (new — reuses `packages/slack/src/agent.ts` construction)
- `packages/web-ui/src/RemoteAgent.ts` (new)
- `packages/web-ui/example/src/main.ts` (edit — mode switch)
- `.devcontainer/docker-compose.web-ui.yml` (edit — add bridge service)

**Reused / referenced existing code:**
- `packages/slack/src/agent.ts` — agent construction, system prompt, tool registration. Extract shared builder into `packages/slack/src/agent-factory.ts` (or a new `packages/shared/`) so bridge + slack don't duplicate.
- `packages/slack/src/config.ts` — provider/model selection from `settings.json`.
- `packages/sandbox/src/lib/heartbeat/` — pattern for long-running node services managed by the harness.

**Verification:**
- `VITE_AGENT_MODE=bridge pnpm --filter pi-web-ui-example dev` connects to local bridge; no API key prompt appears; sending "run ls" executes inside the sandbox and streams output.
- Slack and web-ui produce identical replies to the same prompt (provider/model parity).
- Token rotation works: restart bridge with new `BRIDGE_SHARED_SECRET`, existing web clients re-auth on next send.
- `/ci-status` green after push; vitest covers `RemoteAgent` streaming + fallback.

## Out of scope (explicitly deferred)

- Per-user GitHub OAuth on the bridge (tracked as Phase 3).
- Multi-agent routing (picking which harness agent receives the message).
- Mobile-optimized layout changes (upstream ChatPanel is desktop-first; accept as-is).
- Migrating Slack bot to call the same bridge (nice future consolidation, not this PRD).

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Upstream `pi-web-ui` moves fast (v0.67.68 today); fork drift | Same policy as slack fork: periodic rebase, document divergence in `.claude/specs/web-ui-package-spec.md` |
| Heavy deps (pdfjs, xlsx, docx-preview, @lmstudio/sdk) bloat bundle | Ship as-is in Phase 1; defer chunking to follow-up if Lighthouse flags it |
| IndexedDB keys stored in browser are user-exfiltrable if XSS | Standard CSP headers in nginx; Phase 2 removes the need for browser-stored keys entirely |
| ChatPanel assumes local `Agent`; `RemoteAgent` substitution may break on internal method use | Phase 2a begins with a spike: audit every `Agent` method ChatPanel calls; test via upstream unit tests adapted to fork |
| Cloudflared ingress conflict with existing rules | Use distinct subdomains (`web-ui`, `web-ui-api`); validate with `cloudflared tunnel ingress validate` in CI |

## Verification end-to-end (post-Phase 2)

```bash
# 1. Rebuild sandbox with new overlay
/provision

# 2. Confirm all three surfaces alive
openharness list
curl -I https://web-ui.$TUNNEL_HOST           # 200
curl -I https://web-ui-api.$TUNNEL_HOST/health # 200
# Slack: send DM → get reply

# 3. Parity test
# Same prompt via: terminal claude, Slack DM, browser ChatPanel
# All three produce identical model + similar replies.

# 4. Tests
pnpm --filter @openharness/web-ui test
pnpm --filter pi-web-ui-example build
/ci-status
```

## File map (all phases)

```
packages/web-ui/
├── package.json                    # @openharness/web-ui, exact pins
├── tsconfig.build.json
├── src/                            # vendored from pi-mono + RemoteAgent.ts
│   ├── ChatPanel.ts                # (from upstream)
│   ├── RemoteAgent.ts              # NEW (Phase 2b)
│   └── ...
├── dist/                           # committed
├── example/                        # vendored starter, tweaked for openharness
│   ├── package.json
│   ├── Dockerfile                  # NEW (Phase 1)
│   ├── src/main.ts                 # edited: mode switch (Phase 2c)
│   └── dist/                       # committed static bundle
└── bridge/                         # NEW (Phase 2a)
    ├── src/server.ts
    ├── src/agent-factory.ts
    └── dist/

.devcontainer/
├── docker-compose.web-ui.yml       # NEW (Phase 1; edited Phase 2d)
└── cloudflared/config.yml          # edited: ingress rules

.claude/
├── rules/web-ui-package.md         # NEW (Phase 0)
└── specs/web-ui-package-spec.md    # NEW (Phase 0)

.openharness/config.json            # edited: add web-ui overlay
docs/content/web-ui.mdx             # NEW (Phase 1)
```
