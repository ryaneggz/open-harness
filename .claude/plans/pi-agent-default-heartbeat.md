# Plan: Make Pi Agent Default for HEARTBEAT

**Issue:** [ryaneggz/open-harness#1](https://github.com/ryaneggz/open-harness/issues/1)
**Branch:** `feat/pi-agent-default-heartbeat`

## Summary

Change the default `HEARTBEAT_AGENT` from `claude` to `pi` across all configuration surfaces, add a dedicated `pi` case in the heartbeat dispatcher, and promote Pi Agent from optional to default installation.

## Changes Required

### 1. `install/heartbeat.sh`
- **Line 16:** Change default `HEARTBEAT_AGENT="${HEARTBEAT_AGENT:-claude}"` to `HEARTBEAT_AGENT="${HEARTBEAT_AGENT:-pi}"`
- **Lines 136-146:** Add a dedicated `pi)` case in the agent dispatch switch, matching Pi Agent's CLI invocation pattern (`pi -p "$prompt" --dangerously-skip-permissions`)

### 2. `Makefile`
- **Line 8:** Change `HEARTBEAT_AGENT ?= claude` to `HEARTBEAT_AGENT ?= pi`

### 3. `docker-compose.yml`
- **Line 14:** Change `HEARTBEAT_AGENT=${HEARTBEAT_AGENT:-claude}` to `HEARTBEAT_AGENT=${HEARTBEAT_AGENT:-pi}`

### 4. `install/setup.sh`
- **Line 27:** Change `INSTALL_PI_AGENT=false` to `INSTALL_PI_AGENT=true` (Pi Agent should be installed by default since it's now the default heartbeat agent)
- **Line 57:** Change interactive prompt from `[y/N]` to `[Y/n]` and invert the check to default-yes

## TDD Approach

### Test Framework
- Use `bats-core` (Bash Automated Testing System) for shell script testing
- Tests live in `tests/` directory

### Tests (written first, expected to fail)
1. **Default config tests:** Verify `HEARTBEAT_AGENT` defaults to `pi` in heartbeat.sh, Makefile, docker-compose.yml
2. **Dispatch case test:** Verify `pi` has a dedicated case in heartbeat.sh switch statement
3. **Install default test:** Verify `INSTALL_PI_AGENT` defaults to `true` in setup.sh

## Rollback

Users can override back to Claude via:
- `HEARTBEAT_AGENT=claude` in environment
- `make HEARTBEAT_AGENT=claude heartbeat`
