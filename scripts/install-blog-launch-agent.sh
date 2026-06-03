#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-blog-worker.env"
PLIST_SOURCE="$ROOT_DIR/scripts/com.altoslab.blog-local-worker.plist.example"
PLIST_TARGET="$HOME/Library/LaunchAgents/com.altoslab.blog-local-worker.plist"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Copy scripts/altoslab-blog-worker.env.example there and fill the production secret first." >&2
  exit 1
fi

if ! grep -Eq '^BLOG_INGEST_HMAC_SECRET=.{24,}' "$ENV_FILE"; then
  echo "BLOG_INGEST_HMAC_SECRET must be set in $ENV_FILE before installing the scheduler." >&2
  exit 1
fi

if grep -Eq 'replace-with|test-secret' "$ENV_FILE"; then
  echo "$ENV_FILE still contains placeholder/test values. Refusing to install the production scheduler." >&2
  exit 1
fi

chmod +x \
  "$ROOT_DIR/scripts/blog-antigravity-orchestrator.mjs" \
  "$ROOT_DIR/scripts/blog-local-worker.mjs" \
  "$ROOT_DIR/scripts/blog-scheduled-runner.mjs" \
  "$ROOT_DIR/scripts/blog-sop-doctor.mjs" \
  "$ROOT_DIR/scripts/verify-blog-release.mjs"

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp "$PLIST_SOURCE" "$PLIST_TARGET"
plutil -lint "$PLIST_TARGET"

launchctl bootout "gui/$(id -u)" "$PLIST_TARGET" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"
launchctl enable "gui/$(id -u)/com.altoslab.blog-local-worker"

echo "Installed com.altoslab.blog-local-worker"
echo "Logs:"
echo "  $HOME/Library/Logs/altoslab-blog-local-worker.out.log"
echo "  $HOME/Library/Logs/altoslab-blog-local-worker.err.log"
