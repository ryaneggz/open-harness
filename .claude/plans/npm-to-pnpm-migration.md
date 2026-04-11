# Plan: Swap npm for pnpm

## Summary

Migrate the entire Open Harness project from npm to pnpm as the package manager. pnpm offers faster installs, stricter dependency resolution (no phantom dependencies), and a content-addressable store that saves disk space across sandboxes.

## Scope

### Phase 1: Root monorepo + CLI + sandbox package

**Files to modify:**

| File | Change |
|------|--------|
| `package.json` | Remove `"workspaces"` array, add `"packageManager": "pnpm@10.x"` field |
| `cli/package.json` | No structural changes needed (scripts stay the same) |
| `packages/sandbox/package.json` | No structural changes needed |

**Files to create:**

| File | Purpose |
|------|---------|
| `pnpm-workspace.yaml` | Define workspace packages: `["cli", "packages/sandbox"]` |
| `.npmrc` | `shamefully-hoist=true` (if needed for compatibility), `strict-peer-dependencies=false` |

**Files to delete:**

| File | Reason |
|------|--------|
| `package-lock.json` | Replaced by `pnpm-lock.yaml` |
| `cli/package-lock.json` | Workspace manages deps from root |
| `packages/sandbox/package-lock.json` | Workspace manages deps from root |

**Script changes in root `package.json`:**

```diff
- "setup": "npm install && npm run build && npm link --workspace=cli",
- "build": "npm run build --workspaces",
- "test": "npm run test --workspaces",
- "lint": "npm run lint --workspaces",
- "format": "npm run format --workspaces"
+ "setup": "pnpm install && pnpm run build && pnpm link --global ./cli",
+ "build": "pnpm -r run build",
+ "test": "pnpm -r run test",
+ "lint": "pnpm -r run lint",
+ "format": "pnpm -r run format"
```

### Phase 2: Next.js application (`workspace/projects/next-app/`)

**Files to modify:**

| File | Change |
|------|--------|
| `workspace/projects/next-app/package.json` | Add `"packageManager": "pnpm@10.x"` |

**Files to delete:**

| File | Reason |
|------|--------|
| `workspace/projects/next-app/package-lock.json` | Replaced by `pnpm-lock.yaml` |

### Phase 3: CI/CD workflows (`.github/workflows/`)

**`.github/workflows/ci.yml` changes:**

```diff
  - name: Setup Node 22.x
    uses: actions/setup-node@v4
    with:
      node-version: "22"

+ - name: Install pnpm
+   uses: pnpm/action-setup@v4

  - name: Cache node_modules
    uses: actions/cache@v4
    with:
-     path: workspace/projects/next-app/node_modules
-     key: node-modules-${{ hashFiles('workspace/projects/next-app/package-lock.json') }}
+     path: workspace/projects/next-app/node_modules
+     key: node-modules-${{ hashFiles('workspace/projects/next-app/pnpm-lock.yaml') }}

- run: npm ci
+ run: pnpm install --frozen-lockfile

- run: npx prisma generate
+ run: pnpm exec prisma generate

- run: npx prisma migrate deploy
+ run: pnpm exec prisma migrate deploy

- run: npm run lint
+ run: pnpm run lint

(same pattern for all npm run / npx calls)
```

**`.github/workflows/release.yml`** — identical pattern of substitutions.

### Phase 4: Dockerfiles

**`.devcontainer/Dockerfile` changes:**

```diff
  RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
   && apt-get install -y --no-install-recommends nodejs

+ # Install pnpm
+ RUN corepack enable && corepack prepare pnpm@latest --activate

- RUN npm install -g @anthropic-ai/claude-code @openai/codex @mariozechner/pi-coding-agent @mariozechner/pi-mom
+ RUN pnpm add -g @anthropic-ai/claude-code @openai/codex @mariozechner/pi-coding-agent @mariozechner/pi-mom

- RUN npm install -g agent-browser@0.8.5 && agent-browser install --with-deps
+ RUN pnpm add -g agent-browser@0.8.5 && agent-browser install --with-deps
```

### Phase 5: Install & provisioning scripts

**`install/setup.sh` changes:**

All `npm install -g <pkg>` calls become `pnpm add -g <pkg>`. Add pnpm installation step after Node.js:

```diff
+ # ─── pnpm (via corepack) ───────────────────────────────────────────
+ banner "Enabling pnpm via corepack"
+ corepack enable
+ corepack prepare pnpm@latest --activate
+ ok "pnpm $(pnpm --version) installed"
```

Summary line changes:
```diff
- printf "  npm      : %s\n" "$(npm --version)"
+ printf "  pnpm     : %s\n" "$(pnpm --version)"
```

**`install/entrypoint.sh` changes:**

```diff
- npm install -g agent-browser@0.8.5 && \
+ pnpm add -g agent-browser@0.8.5 && \
```

### Phase 6: Documentation & rules

**Files to update:**

| File | Change |
|------|--------|
| `README.md` | `npm run setup` → `pnpm run setup`, prerequisites mention pnpm |
| `workspace/CLAUDE.md` | All `npm run` → `pnpm run`, `npm test` → `pnpm test` |
| `workspace/.claude/rules/code-quality.md` | `npm run lint` → `pnpm run lint`, etc. |
| `workspace/.claude/rules/git.md` | `npm test` → `pnpm test` in pre-commit description |
| `.claude/skills/release/SKILL.md` | All npm references → pnpm |
| `.claude/skills/repair/SKILL.md` | All npm references → pnpm |
| `.claude/skills/delegate/SKILL.md` | All npm references → pnpm |
| `.claude/skills/provision/SKILL.md` | All npm references → pnpm |
| `.claude/agents/agent-builder.md` | npm → pnpm references |
| `.claude/agents/command-builder.md` | npm → pnpm references |
| `.claude/agents/skill-builder.md` | npm → pnpm references |

### Phase 7: Agent worktree scripts

Any `install/setup.sh` files in `.worktrees/agent/*/` that contain `npm install -g` calls need the same substitutions. These are gitignored but should be updated on next provision.

## Command mapping cheat sheet

| npm | pnpm |
|-----|------|
| `npm install` | `pnpm install` |
| `npm ci` | `pnpm install --frozen-lockfile` |
| `npm run <script>` | `pnpm run <script>` |
| `npm test` | `pnpm test` |
| `npm install -g <pkg>` | `pnpm add -g <pkg>` |
| `npx <cmd>` | `pnpm exec <cmd>` (or `pnpm dlx <cmd>` for one-off) |
| `npm link --workspace=cli` | `pnpm link --global ./cli` |
| `npm run build --workspaces` | `pnpm -r run build` |
| `"workspaces": [...]` in package.json | `pnpm-workspace.yaml` |

## Why pnpm over npm

1. **Strict dependency resolution** — no phantom deps; if you didn't declare it, you can't import it
2. **Content-addressable store** — packages stored once on disk, hard-linked into projects (big win for multi-sandbox setups)
3. **Faster installs** — benchmarks consistently show 2-3x faster than npm
4. **Native workspace support** — `pnpm -r run` is cleaner than `npm run --workspaces`
5. **Built into Node.js** — corepack ships with Node 22, so `corepack enable` is all that's needed

## Risks & mitigations

| Risk | Mitigation |
|------|-----------|
| Phantom dependency breakage | Run `pnpm install` and fix any missing declares |
| Global install path differs | Verify `pnpm add -g` puts bins on PATH in containers |
| CI cache invalidation | First run will be a cache miss; subsequent runs benefit from pnpm's speed |
| `.worktrees/` scripts out of sync | Document in provisioning that new sandboxes use pnpm |
| Corepack not enabled in CI | `pnpm/action-setup@v4` handles this automatically |

## Implementation order

1. Root monorepo (package.json + pnpm-workspace.yaml + lockfile swap)
2. Generate `pnpm-lock.yaml` with `pnpm install`
3. Next.js app lockfile swap
4. CI workflows
5. Dockerfiles
6. Install scripts (setup.sh, entrypoint.sh)
7. Documentation and rules
8. Verify: `pnpm -r run build && pnpm -r run test && pnpm -r run lint`
