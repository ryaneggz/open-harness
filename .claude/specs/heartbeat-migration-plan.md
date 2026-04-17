# Heartbeat Migration: Bash to TypeScript

## Context

The heartbeat system is a 470-line bash script (`install/heartbeat.sh`) that manages periodic agent tasks via system cron. It's the only major subsystem still in bash — the rest of the sandbox tooling is TypeScript. The current TS wrapper (`packages/sandbox/src/tools/heartbeat.ts`) is a 52-line shim that shells out to `docker exec ... heartbeat.sh`. This migration brings the heartbeat system in line with the rest of the codebase for maintainability, testability (0 tests today), and type safety.

## Recommended Architecture: In-Process Croner Daemon

Replace system cron + bash entirely with an in-process Node scheduler using **croner** (already a dependency in `packages/slack/`, proven in `EventsWatcher`).

**Why this over rewriting bash-to-TS with cron kept:**
- Eliminates the fragile crontab manipulation layer (pipe to `crontab -`, `env.sh` generation, `CRON_MARKER` grep filtering)
- croner is battle-tested in-codebase (`packages/slack/src/events.ts:341`)
- Directly testable with vitest — no system cron mocking needed
- Graceful shutdown via `Cron.stop()` vs `crontab -r`

**Trade-offs:**
- Adds a long-lived Node process (~30-50MB) — negligible in a dev container already running Node 22 + Claude CLI
- If daemon crashes, heartbeats stop until container restart (same as cron crashing)
- PID-lockfiles are slightly less robust than kernel `flock`, but heartbeat skips are non-critical

## File Plan

### New: `packages/sandbox/src/lib/heartbeat/` (7 modules)

| File | Responsibility | Lines (est.) |
|------|---------------|-------------|
| `config.ts` | Parse `heartbeats.conf` + legacy `HEARTBEAT.md` fallback, `HeartbeatEntry` type | ~80 |
| `logger.ts` | `HeartbeatLogger` — timestamped file append, 1000-line rotation, `tail()` | ~50 |
| `lock.ts` | `LockManager` — PID-based lockfiles with stale detection via `fs.openSync(O_EXCL)` | ~60 |
| `gates.ts` | `isActiveHours()`, `isHeartbeatEmpty()`, `isHeartbeatOk()` | ~50 |
| `runner.ts` | `HeartbeatRunner` — single heartbeat execution (gates + prompt build + async `spawn` agent + logging) | ~120 |
| `scheduler.ts` | `HeartbeatScheduler` — creates/manages `Cron` instances per entry, status reporting | ~60 |
| `daemon.ts` | `HeartbeatDaemon` — orchestrates parse → schedule → signal handling; subcommands: start/sync/stop/status/migrate | ~100 |
| `index.ts` | Barrel re-export | ~5 |

### New: `packages/sandbox/src/cli/heartbeat-daemon.ts`

Standalone Node script — instantiates `HeartbeatDaemon`, dispatches subcommand from `process.argv`. Handles `SIGTERM`/`SIGINT` for graceful shutdown.

### Modified Files

| File | Change |
|------|--------|
| `packages/sandbox/package.json` | Add `"croner": "^9.1.0"` to dependencies |
| `packages/sandbox/src/tools/heartbeat.ts` | Shell out to `node heartbeat-daemon.js <action>` instead of `heartbeat.sh` |
| `.devcontainer/entrypoint.sh:88-96` | Replace `service cron start` + `heartbeat.sh sync` with `node heartbeat-daemon.js start &` |
| `install/heartbeat.sh` | Deprecation shim (print warning, delegate to TS daemon) — remove after one release cycle |

### New Tests: `packages/sandbox/src/__tests__/heartbeat-*.test.ts`

| Test file | Covers |
|-----------|--------|
| `heartbeat-config.test.ts` | Config parsing, comment/blank handling, `secondsToCron()`, legacy fallback |
| `heartbeat-gates.test.ts` | Active hours (wraparound, unconfigured), empty file detection, HEARTBEAT_OK |
| `heartbeat-lock.test.ts` | Lock acquire/release, stale PID detection |
| `heartbeat-runner.test.ts` | Gate paths, prompt construction (with/without SOUL.md), timeout, agent spawn mock |
| `heartbeat-scheduler.test.ts` | Lifecycle (start/stop/re-sync), croner mock |

## Implementation Phases

### Phase 1 — Core Library (parallelizable)

1. Add `croner` dep to `package.json`
2. Write `config.ts`, `logger.ts`, `lock.ts`, `gates.ts` (no interdependencies)
3. Write `runner.ts` (depends on logger, lock, gates)
4. Write `scheduler.ts` (depends on runner, logger)
5. Write `daemon.ts` + `index.ts` (depends on config, scheduler)

### Phase 2 — CLI + Container Integration

6. Write `heartbeat-daemon.ts` CLI entrypoint
7. Update `entrypoint.sh` to start daemon instead of cron
8. Update `tools/heartbeat.ts` to delegate to TS daemon via docker exec

### Phase 3 — Tests

9. Write test files for config, gates, lock, runner, scheduler

### Phase 4 — Deprecation

10. Convert `install/heartbeat.sh` to a thin shim with deprecation warning
11. Update docs (heartbeats.conf header, CLAUDE.md references)

### Phase 5 — Cleanup (after one release cycle)

12. Remove `install/heartbeat.sh`
13. Remove `cron` from Dockerfile apt-get (verify no other consumers first)

## Key Design Decisions

**Agent invocation**: Use async `child_process.spawn` (not `spawnSync`) with `AbortSignal.timeout(300_000)`. The daemon shares one event loop across all cron jobs — blocking would prevent concurrent heartbeats from starting.

**Lockfiles**: `fs.openSync(path, O_WRONLY | O_CREAT | O_EXCL)` for atomic creation. Write PID. On `EEXIST`: read PID, check `process.kill(pid, 0)` for liveness, unlink stale locks. Release in `finally` block.

**Backwards compatibility**: `heartbeats.conf` format unchanged. CLI interface (`openharness heartbeat sync/stop/status/migrate`) unchanged. `status` output changes from "Cron daemon: running" to "Heartbeat daemon: running (pid NNN)".

**Reused patterns**:
- `Cron` constructor pattern from `packages/slack/src/events.ts:341-346`
- `exec.ts` utilities for agent spawning (switch to async equivalent)
- `SandboxConfig` for resolving workspace paths

## Verification

1. `pnpm --filter @openharness/sandbox run build` — compiles without errors
2. `pnpm --filter @openharness/sandbox run test` — all new + existing tests pass
3. `pnpm --filter @openharness/sandbox run lint && pnpm --filter @openharness/sandbox run format:check` — clean
4. Inside container: `node packages/sandbox/dist/src/cli/heartbeat-daemon.js status` — shows scheduled heartbeats
5. Inside container: verify a heartbeat fires on schedule (check `~/.heartbeat/heartbeat.log`)
6. `openharness heartbeat status <name>` from host — works through docker exec
7. Container restart — verify daemon auto-starts and heartbeats resume
