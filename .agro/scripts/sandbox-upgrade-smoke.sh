#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/../.." && pwd)
COMPOSE_FILE=${UPGRADE_SMOKE_COMPOSE_FILE:-$REPO_ROOT/.devcontainer/docker-compose.image-only.yml}
SERVICE=${UPGRADE_SMOKE_SERVICE:-sandbox}
PROJECT=${UPGRADE_SMOKE_PROJECT:-agro-upgrade-$$}
LEGACY_IMAGE=${LEGACY_IMAGE:-ghcr.io/mifunedev/openharness:0.9.0}
NEW_IMAGE=${NEW_IMAGE:-}
KEEP=${KEEP:-0}
TIMEOUT=${UPGRADE_SMOKE_TIMEOUT_SECONDS:-600}
INTERVAL=${UPGRADE_SMOKE_INTERVAL_SECONDS:-5}
PROJECT_ROOT=${OH_PROJECT_ROOT:-/home/sandbox/harness}
WORKDIR=$(mktemp -d "${TMPDIR:-/tmp}/sandbox-upgrade-smoke.XXXXXX")

IMAGE=""
BUILT_IMAGE=""
RESULT="FAIL"
FAILURE="the smoke exited before reaching the verdict"

log() {
  printf '%s upgrade-smoke: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"
}

compose() {
  env -u GH_TOKEN \
    SANDBOX_NAME="$PROJECT" \
    AGRO_SANDBOX_IMAGE="$IMAGE" \
    AGRO_PULL_POLICY=missing \
    AGRO_HOME_MOUNT=workspace \
    docker compose --project-name "$PROJECT" --env-file "$WORKDIR/empty.env" -f "$COMPOSE_FILE" "$@"
}

container_id() {
  compose ps -q "$SERVICE" 2>/dev/null || true
}

diagnostics() {
  local cid
  cid=$(container_id)
  echo "--- docker compose ps"
  compose ps || true
  if [ -n "$cid" ]; then
    echo "--- container state ($cid)"
    docker inspect --format '{{.State.Status}} exit={{.State.ExitCode}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid" || true
    echo "--- systemd units ($cid)"
    docker exec "$cid" systemctl status openharness-bootstrap.service openharness-cron.service --no-pager || true
    echo "--- container logs tail ($cid)"
    docker logs --tail 200 "$cid" 2>&1 || true
  fi
}

fail() {
  FAILURE="$*"
  log "FAIL: $FAILURE"
  diagnostics
  exit 1
}

teardown() {
  local code=$?
  trap - EXIT
  if [ "$KEEP" = "1" ]; then
    log "KEEP=1: leaving compose project $PROJECT and image ${BUILT_IMAGE:-$IMAGE} in place"
  else
    log "tearing down compose project $PROJECT (down -v)"
    compose down -v --remove-orphans >/dev/null 2>&1 || true
    if [ -n "$BUILT_IMAGE" ]; then
      docker rmi -f "$BUILT_IMAGE" >/dev/null 2>&1 || true
    fi
  fi
  rm -rf "$WORKDIR"
  if [ "$RESULT" = "PASS" ]; then
    log "PASS: legacy volume from $LEGACY_IMAGE survived the upgrade to ${NEW_IMAGE:-$BUILT_IMAGE}"
    exit 0
  fi
  log "FAIL: $FAILURE"
  exit "${code:-1}"
}

READY_CID=""

wait_ready() {
  local label="$1" end cid state
  end=$(( $(date +%s) + TIMEOUT ))
  log "waiting up to ${TIMEOUT}s for $label: systemd units openharness-bootstrap.service and openharness-cron.service"
  while [ "$(date +%s)" -le "$end" ]; do
    cid=$(container_id)
    if [ -n "$cid" ]; then
      state=$(docker inspect --format '{{.State.Status}}' "$cid" 2>/dev/null || echo unknown)
      if [ "$state" != "running" ]; then
        fail "$label: container $cid is $state, not running"
      fi
      if docker exec "$cid" systemctl is-failed --quiet openharness-bootstrap.service 2>/dev/null; then
        fail "$label: openharness-bootstrap.service failed"
      fi
      if docker exec "$cid" systemctl is-active --quiet openharness-bootstrap.service 2>/dev/null \
        && docker exec "$cid" systemctl is-active --quiet openharness-cron.service 2>/dev/null; then
        log "$label ready: container $cid, bootstrap oneshot succeeded, cron runtime active"
        READY_CID="$cid"
        return 0
      fi
    fi
    sleep "$INTERVAL"
  done
  fail "$label: timed out after ${TIMEOUT}s waiting for systemd units"
}

sandbox_sh() {
  docker exec -i -u sandbox "$1" bash -s
}

snapshot() {
  local cid="$1"
  sandbox_sh "$cid" <<'EOF'
set -u
home=$HOME
harness=$home/harness
printf 'hosts_sha=%s\n' "$( [ -f "$home/.config/gh/hosts.yml" ] && sha256sum "$home/.config/gh/hosts.yml" | cut -d' ' -f1 || echo absent)"
printf 'canary_sha=%s\n' "$( [ -f "$harness/UPGRADE-CANARY.txt" ] && sha256sum "$harness/UPGRADE-CANARY.txt" | cut -d' ' -f1 || echo absent)"
printf 'oh_dir=%s\n' "$( [ -d "$harness/.oh" ] && echo present || echo absent)"
printf 'agro_dir=%s\n' "$( [ -e "$harness/.agro" ] && echo present || echo absent)"
printf 'oh_marker=%s\n' "$( [ -f "$harness/.oh/.image-seeded" ] && echo present || echo absent)"
printf 'oh_scripts_sha=%s\n' "$( [ -d "$harness/.oh/scripts" ] && (cd "$harness/.oh/scripts" && find . -type f -print0 | LC_ALL=C sort -z | xargs -0 sha256sum | sha256sum | cut -d' ' -f1) || echo absent)"
printf 'oh_entries=%s\n' "$( [ -d "$harness/.oh" ] && (cd "$harness/.oh" && ls -A1 | LC_ALL=C sort | tr '\n' ',') || echo absent)"
EOF
}

value_of() {
  printf '%s\n' "$1" | sed -n "s/^$2=//p"
}

log_shape() {
  local cid="$1" label="$2"
  log "$label: ls -la $PROJECT_ROOT/.oh | head"
  sandbox_sh "$cid" <<'EOF' | sed 's/^/    /'
ls -la "$HOME/harness/.oh" 2>&1 | head
EOF
}

trap teardown EXIT
: > "$WORKDIR/empty.env"

log "compose project $PROJECT, compose file ${COMPOSE_FILE#"$REPO_ROOT"/}, workspace volume ${PROJECT}_workspace"
log "step 1/7: boot legacy image $LEGACY_IMAGE"
if ! docker image inspect --format '{{.Id}}' "$LEGACY_IMAGE" >/dev/null 2>&1; then
  log "pulling $LEGACY_IMAGE"
  docker pull "$LEGACY_IMAGE"
fi
IMAGE="$LEGACY_IMAGE"
compose up -d --no-build "$SERVICE"
wait_ready "legacy boot"
legacy_cid="$READY_CID"

log "step 2/7: write synthetic state inside the volume as the sandbox user"
sandbox_sh "$legacy_cid" <<EOF
set -eu
mkdir -p "\$HOME/.config/gh"
cat > "\$HOME/.config/gh/hosts.yml" <<'HOSTS'
github.com:
    user: synthetic-canary
    oauth_token: gho_SYNTHETIC_CANARY
    git_protocol: https
    users:
        synthetic-canary:
            oauth_token: gho_SYNTHETIC_CANARY
HOSTS
chmod 0600 "\$HOME/.config/gh/hosts.yml"
printf 'sandbox-upgrade-smoke canary\nproject=%s\nlegacy_image=%s\nwritten=%s\n' "$PROJECT" "$LEGACY_IMAGE" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "\$HOME/harness/UPGRADE-CANARY.txt"
EOF
before=$(snapshot "$legacy_cid")
log "legacy snapshot:"
printf '%s\n' "$before" | sed 's/^/    /'
log_shape "$legacy_cid" "legacy"

[ "$(value_of "$before" hosts_sha)" != "absent" ] || fail "precondition: hosts.yml was not written in the legacy sandbox"
[ "$(value_of "$before" canary_sha)" != "absent" ] || fail "precondition: UPGRADE-CANARY.txt was not written in the legacy sandbox"
[ "$(value_of "$before" oh_dir)" = "present" ] || fail "precondition: the legacy image did not seed $PROJECT_ROOT/.oh"
[ "$(value_of "$before" agro_dir)" = "absent" ] || fail "precondition: the legacy image seeded $PROJECT_ROOT/.agro, so this run cannot prove the legacy-volume path"

log "step 3/7: docker compose stop (the workspace volume stays)"
compose stop "$SERVICE"

if [ -n "$NEW_IMAGE" ]; then
  log "step 4/7: using NEW_IMAGE=$NEW_IMAGE (no build)"
  IMAGE="$NEW_IMAGE"
else
  BUILT_IMAGE="agro-upgrade-smoke:$$"
  log "step 4/7: docker build -f .devcontainer/Dockerfile -t $BUILT_IMAGE $REPO_ROOT"
  docker build --file "$REPO_ROOT/.devcontainer/Dockerfile" --tag "$BUILT_IMAGE" "$REPO_ROOT"
  IMAGE="$BUILT_IMAGE"
fi

log "step 5/7: boot $IMAGE against the same project and volume"
compose up -d --no-build "$SERVICE"
wait_ready "upgraded boot"
new_cid="$READY_CID"
[ "$new_cid" != "$legacy_cid" ] || fail "compose reused the legacy container $legacy_cid instead of recreating it from $IMAGE"

log "step 6/7: assert state survived"
after=$(snapshot "$new_cid")
log "upgraded snapshot:"
printf '%s\n' "$after" | sed 's/^/    /'
log_shape "$new_cid" "upgraded"

bootstrap_log=$(docker exec "$new_cid" journalctl -u openharness-bootstrap.service --no-pager -o cat 2>/dev/null || true)
if [ -z "$bootstrap_log" ]; then
  bootstrap_log=$(docker logs "$new_cid" 2>&1 || true)
fi

[ "$(value_of "$after" hosts_sha)" = "$(value_of "$before" hosts_sha)" ] \
  || fail "\$HOME/.config/gh/hosts.yml changed across the upgrade (before $(value_of "$before" hosts_sha), after $(value_of "$after" hosts_sha))"
[ "$(value_of "$after" canary_sha)" = "$(value_of "$before" canary_sha)" ] \
  || fail "$PROJECT_ROOT/UPGRADE-CANARY.txt changed across the upgrade (before $(value_of "$before" canary_sha), after $(value_of "$after" canary_sha))"
[ "$(value_of "$after" oh_dir)" = "present" ] || fail "$PROJECT_ROOT/.oh is gone after the upgrade"
[ "$(value_of "$after" agro_dir)" = "absent" ] || fail "$PROJECT_ROOT/.agro was created next to the legacy .oh/ control plane"
[ "$(value_of "$after" oh_marker)" = "$(value_of "$before" oh_marker)" ] \
  || fail "$PROJECT_ROOT/.oh/.image-seeded changed (before $(value_of "$before" oh_marker), after $(value_of "$after" oh_marker))"
[ "$(value_of "$after" oh_scripts_sha)" = "$(value_of "$before" oh_scripts_sha)" ] \
  || fail "$PROJECT_ROOT/.oh/scripts content changed across the upgrade"
before_entries=$(value_of "$before" oh_entries)
after_entries=$(value_of "$after" oh_entries)
IFS=',' read -r -a entries <<<"$before_entries"
for entry in "${entries[@]}"; do
  [ -n "$entry" ] || continue
  case ",$after_entries," in
    *",$entry,"*) ;;
    *) fail "$PROJECT_ROOT/.oh/$entry disappeared across the upgrade" ;;
  esac
done
if printf '%s\n' "$bootstrap_log" | grep -q "not seeding"; then
  fail "the upgraded entrypoint logged a not-seeding conflict warning"
fi
if printf '%s\n' "$bootstrap_log" | grep -q "resolve the conflict"; then
  fail "the upgraded entrypoint logged a control-plane conflict"
fi
if printf '%s\n' "$bootstrap_log" | grep -q "seeded control plane into"; then
  fail "the upgraded entrypoint re-seeded the workspace over the legacy .oh/ control plane"
fi
docker exec "$new_cid" systemctl is-active --quiet openharness-bootstrap.service || fail "openharness-bootstrap.service is not active after the upgrade"
docker exec "$new_cid" systemctl is-active --quiet openharness-cron.service || fail "openharness-cron.service is not active after the upgrade"
log "compose health after upgrade: $(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$new_cid" 2>/dev/null || echo inspect-failed)"

log "step 7/7: all assertions held"
RESULT="PASS"
