#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ALTOS_BLOG_WORKER_ROOT:-/Users/asdc163/LocalProjects/altoslab-offcial-website-runtime}"
N8N_ENV_FILE="$HOME/.altoslab-n8n.env"
BLOG_ENV_FILE="$HOME/.altoslab-blog-worker.env"
PLIST_SOURCE="$ROOT_DIR/scripts/com.altoslab.n8n-bridge.plist.example"
PLIST_TARGET="$HOME/Library/LaunchAgents/com.altoslab.n8n-bridge.plist"

if [[ ! -f "$N8N_ENV_FILE" ]]; then
  echo "Missing $N8N_ENV_FILE. Run scripts/start-n8n-local.sh first." >&2
  exit 1
fi

if [[ ! -f "$BLOG_ENV_FILE" ]]; then
  echo "Missing $BLOG_ENV_FILE. The bridge needs the existing blog worker env." >&2
  exit 1
fi

if ! grep -Eq '^ALTOS_N8N_BRIDGE_TOKEN=.{24,}' "$N8N_ENV_FILE"; then
  echo "ALTOS_N8N_BRIDGE_TOKEN must be set in $N8N_ENV_FILE." >&2
  exit 1
fi

chmod +x "$ROOT_DIR/scripts/n8n-local-bridge.mjs"
mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
cp "$PLIST_SOURCE" "$PLIST_TARGET"
plutil -lint "$PLIST_TARGET"

launchctl bootout "gui/$(id -u)" "$PLIST_TARGET" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"
launchctl enable "gui/$(id -u)/com.altoslab.n8n-bridge"

echo "Installed com.altoslab.n8n-bridge"
echo "Bridge health: http://127.0.0.1:8797/health"
