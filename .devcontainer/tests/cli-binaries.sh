#!/usr/bin/env bash
# Test: Verify agent CLI binaries are installed with native components
# This test verifies that postinstall scripts ran and downloaded platform-native binaries
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
FAILED=0

test_cli() {
  local cli=$1
  local expected_version_prefix=$2

  echo -n "Testing $cli..."

  # Check binary exists
  if ! command -v "$cli" &>/dev/null; then
    echo -e " ${RED}FAIL${NC} (binary not in PATH)"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Test --version (postinstall is required for native binary)
  if ! output=$("$cli" --version 2>&1); then
    echo -e " ${RED}FAIL${NC} (--version failed)"
    echo "  Error: $output"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Verify it's not the "native binary not installed" error
  if echo "$output" | grep -q "native binary not installed"; then
    echo -e " ${RED}FAIL${NC} (postinstall script did not run)"
    echo "  Output: $output"
    FAILED=$((FAILED + 1))
    return 1
  fi

  # Check version string contains expected prefix
  if ! echo "$output" | grep -q "$expected_version_prefix"; then
    echo -e " ${YELLOW}WARN${NC} (unexpected version format)"
    echo "  Output: $output"
    return 0  # Don't fail on version format variation
  fi

  echo -e " ${GREEN}OK${NC}"
  return 0
}

echo "CLI Binaries Integration Test"
echo "=============================="
echo ""

# Test each CLI
test_cli "claude" "[0-9]\+\.[0-9]\+"
test_cli "codex" "[0-9]\+\.[0-9]\+"
test_cli "pi" "pi"

# Test gh (already system package, no postinstall)
test_cli "gh" "gh version"

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All tests passed${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED test(s) failed${NC}"
  exit 1
fi
