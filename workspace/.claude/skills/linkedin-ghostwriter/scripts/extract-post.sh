#!/usr/bin/env bash
set -euo pipefail

# Extract a single LinkedIn post using agent-browser
# Usage: ./extract-post.sh <url> <output-file> [screenshot-path]

URL="$1"
OUTPUT="$2"
SCREENSHOT="${3:-}"

# Close any existing session
agent-browser close --all 2>/dev/null || true
sleep 1

# Open the URL
echo "Opening: $URL"
agent-browser open "$URL" 2>&1

# Wait for page to load
sleep 3

# Try to dismiss sign-in dialog if it appears
agent-browser click "Dismiss" 2>/dev/null || true
sleep 2

# Get the full text content from main
TEXT=$(agent-browser get text "main" 2>/dev/null || echo "FAILED")

# Get accessibility snapshot for structured data
SNAPSHOT=$(agent-browser snapshot --compact 2>/dev/null || echo "FAILED")

# Take screenshot if path provided
if [[ -n "$SCREENSHOT" ]]; then
  agent-browser screenshot "$SCREENSHOT" 2>/dev/null || true
fi

# Write output
cat > "$OUTPUT" << HEREDOC
---
url: $URL
extracted: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
---

## Post Text

$TEXT

## Raw Snapshot

\`\`\`
$SNAPSHOT
\`\`\`
HEREDOC

echo "Saved to: $OUTPUT"
agent-browser close --all 2>/dev/null || true
