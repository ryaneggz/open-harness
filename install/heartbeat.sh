#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Heartbeat runner — periodically invokes an agent with HEARTBEAT.md tasks
# Subcommands: start (default), stop, status
# ---------------------------------------------------------------------------

HEARTBEAT_DIR="${HOME}/.heartbeat"
PID_FILE="${HEARTBEAT_DIR}/heartbeat.pid"
LOG_FILE="${HEARTBEAT_DIR}/heartbeat.log"

HEARTBEAT_INTERVAL="${HEARTBEAT_INTERVAL:-1800}"
HEARTBEAT_ACTIVE_START="${HEARTBEAT_ACTIVE_START:-}"
HEARTBEAT_ACTIVE_END="${HEARTBEAT_ACTIVE_END:-}"
HEARTBEAT_AGENT="${HEARTBEAT_AGENT:-pi}"
HEARTBEAT_FALLBACK="${HEARTBEAT_FALLBACK:-claude codex}"
HEARTBEAT_FILE="${HEARTBEAT_FILE:-${HOME}/workspace/HEARTBEAT.md}"
SOUL_FILE="${SOUL_FILE:-${HOME}/workspace/SOUL.md}"
MEMORY_DIR="${MEMORY_DIR:-${HOME}/workspace/memory}"
LOG_MAX_LINES="${HEARTBEAT_LOG_MAX_LINES:-1000}"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

log() {
  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  echo "[$ts] $*" | tee -a "$LOG_FILE"
}

rotate_log() {
  if [[ -f "$LOG_FILE" ]]; then
    local lines
    lines=$(wc -l < "$LOG_FILE")
    if (( lines > LOG_MAX_LINES )); then
      tail -n 500 "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
      log "Log rotated (was ${lines} lines)"
    fi
  fi
}

# Returns 0 (true) if HEARTBEAT.md is effectively empty (skip heartbeat).
# Returns 1 (false) if file is missing OR has substantive content.
is_heartbeat_empty() {
  local file="$1"
  [[ ! -f "$file" ]] && return 1  # missing = not empty, run heartbeat

  local content
  # Strip HTML comments, then filter out headers, empty list items, whitespace
  content=$(sed 's/<!--[^>]*-->//g' "$file" \
    | sed ':a;N;$!ba;s/<!--[^>]*-->//g' \
    | grep -vE '^\s*$' \
    | grep -vE '^\s*#{1,6}\s' \
    | grep -vE '^\s*[-*+]\s*$' \
    | grep -vE '^\s*[-*+]\s*\[[ xX]?\]\s*$' \
    || true)

  [[ -z "$content" ]]
}

# Returns 0 if within active hours (or if active hours are not configured).
is_active_hours() {
  [[ -z "$HEARTBEAT_ACTIVE_START" || -z "$HEARTBEAT_ACTIVE_END" ]] && return 0

  local hour
  hour=$(date +%H | sed 's/^0//')
  local start="$HEARTBEAT_ACTIVE_START"
  local end="$HEARTBEAT_ACTIVE_END"

  if (( start <= end )); then
    # Normal range: e.g. 9-17
    (( hour >= start && hour < end ))
  else
    # Wrap-around: e.g. 22-6
    (( hour >= start || hour < end ))
  fi
}

# Returns 0 if response is a HEARTBEAT_OK acknowledgment.
is_heartbeat_ok() {
  local response="$1"
  (( ${#response} < 300 )) && [[ "$response" == *"HEARTBEAT_OK"* ]]
}

# Invoke a single agent. Sets caller's `response` and returns the exit code.
invoke_agent() {
  local agent="$1" prompt="$2"
  local ec=0
  case "$agent" in
    claude)
      response=$(timeout 300 claude -p "$prompt" --dangerously-skip-permissions 2>&1) || ec=$?
      ;;
    codex)
      response=$(timeout 300 codex "$prompt" 2>&1) || ec=$?
      ;;
    pi)
      response=$(timeout 300 pi -p "$prompt" --dangerously-skip-permissions 2>&1) || ec=$?
      ;;
    *)
      response=$(timeout 300 "$agent" -p "$prompt" 2>&1) || ec=$?
      ;;
  esac
  return $ec
}

# ---------------------------------------------------------------------------
# Core
# ---------------------------------------------------------------------------

run_heartbeat() {
  # Gate: active hours
  if ! is_active_hours; then
    log "Outside active hours (${HEARTBEAT_ACTIVE_START}-${HEARTBEAT_ACTIVE_END}), skipping"
    return 0
  fi

  # Gate: empty file
  if is_heartbeat_empty "$HEARTBEAT_FILE"; then
    log "HEARTBEAT.md is effectively empty, skipping"
    return 0
  fi

  local heartbeat_content
  heartbeat_content=$(cat "$HEARTBEAT_FILE")

  # Build prompt — inject SOUL.md if present and non-empty
  local prompt=""
  if [[ -f "$SOUL_FILE" ]] && [[ -s "$SOUL_FILE" ]]; then
    prompt="$(cat "$SOUL_FILE")

---

"
  fi

  local today
  today=$(date -u +"%Y-%m-%d")

  prompt="${prompt}You are performing a periodic heartbeat check. Read the HEARTBEAT.md content below and follow its instructions strictly.

If all tasks are complete or nothing needs attention, reply with exactly: HEARTBEAT_OK
If any task requires action, perform it and report what you did. Keep responses concise.

If you learn anything worth remembering long-term, append it to memory/${today}.md (create the memory/ directory and file if needed).

---
HEARTBEAT.md:
${heartbeat_content}
---"

  # Build ordered agent list: primary + fallbacks
  local agents=("$HEARTBEAT_AGENT")
  for fb in $HEARTBEAT_FALLBACK; do
    [[ "$fb" != "$HEARTBEAT_AGENT" ]] && agents+=("$fb")
  done

  local response=""
  local exit_code=0
  local succeeded=false

  for agent in "${agents[@]}"; do
    log "Running heartbeat (agent: ${agent})"
    response=""
    exit_code=0
    invoke_agent "$agent" "$prompt" || exit_code=$?

    if (( exit_code == 124 )); then
      log "Agent ${agent} timed out (300s limit)"
    elif (( exit_code != 0 )); then
      log "Agent ${agent} failed (exit code ${exit_code}): ${response:0:500}"
    else
      succeeded=true
      break
    fi

    if (( ${#agents[@]} > 1 )); then
      log "Falling back to next agent..."
    fi
  done

  if [[ "$succeeded" != true ]]; then
    log "All agents failed"
    return 0
  fi

  if is_heartbeat_ok "$response"; then
    log "HEARTBEAT_OK"
  else
    log "Heartbeat response:"
    echo "$response" | tee -a "$LOG_FILE"
  fi

  rotate_log
}

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

cmd_start() {
  mkdir -p "$HEARTBEAT_DIR"
  mkdir -p "$MEMORY_DIR"

  # Prevent duplicate instances
  if [[ -f "$PID_FILE" ]]; then
    local old_pid
    old_pid=$(cat "$PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
      echo "Heartbeat already running (PID ${old_pid}). Use 'heartbeat.sh stop' first."
      exit 1
    fi
    rm -f "$PID_FILE"
  fi

  echo $$ > "$PID_FILE"
  trap 'log "Heartbeat stopped (signal)"; rm -f "$PID_FILE"; exit 0' SIGTERM SIGINT

  log "Heartbeat started (PID $$, interval ${HEARTBEAT_INTERVAL}s, agent ${HEARTBEAT_AGENT})"
  if [[ -n "$HEARTBEAT_ACTIVE_START" && -n "$HEARTBEAT_ACTIVE_END" ]]; then
    log "Active hours: ${HEARTBEAT_ACTIVE_START}:00 - ${HEARTBEAT_ACTIVE_END}:00"
  fi

  while true; do
    run_heartbeat || true
    sleep "$HEARTBEAT_INTERVAL" &
    wait $! || true
  done
}

cmd_stop() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "Heartbeat is not running (no PID file)."
    exit 1
  fi

  local pid
  pid=$(cat "$PID_FILE")

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    # Wait briefly for clean exit
    for _ in 1 2 3 4 5; do
      kill -0 "$pid" 2>/dev/null || break
      sleep 1
    done
    rm -f "$PID_FILE"
    echo "Heartbeat stopped (was PID ${pid})."
  else
    rm -f "$PID_FILE"
    echo "Heartbeat was not running (stale PID file removed)."
  fi
}

cmd_status() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "Heartbeat: not running"
    if [[ -f "$LOG_FILE" ]]; then
      echo ""
      echo "Last log entries:"
      tail -n 5 "$LOG_FILE"
    fi
    return 0
  fi

  local pid
  pid=$(cat "$PID_FILE")

  if kill -0 "$pid" 2>/dev/null; then
    echo "Heartbeat: running (PID ${pid})"
    echo "Interval:  ${HEARTBEAT_INTERVAL}s"
    echo "Agent:     ${HEARTBEAT_AGENT}"
    if [[ -n "$HEARTBEAT_ACTIVE_START" && -n "$HEARTBEAT_ACTIVE_END" ]]; then
      echo "Active:    ${HEARTBEAT_ACTIVE_START}:00 - ${HEARTBEAT_ACTIVE_END}:00"
    else
      echo "Active:    always"
    fi
  else
    echo "Heartbeat: not running (stale PID)"
    rm -f "$PID_FILE"
  fi

  if [[ -f "$LOG_FILE" ]]; then
    echo ""
    echo "Recent log:"
    tail -n 5 "$LOG_FILE"
  fi
}

# ---------------------------------------------------------------------------
# Dispatch
# ---------------------------------------------------------------------------

case "${1:-start}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  *)      echo "Usage: heartbeat.sh {start|stop|status}" >&2; exit 1 ;;
esac
