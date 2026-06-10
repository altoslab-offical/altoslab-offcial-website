#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"
OLD_PLIST="$HOME/Library/LaunchAgents/com.altoslab.blog-local-worker.plist"

curl -fsS http://127.0.0.1:8797/health >/dev/null
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps --status running | grep -q 'n8n'

if [[ -f "$OLD_PLIST" ]]; then
  launchctl bootout "gui/$(id -u)" "$OLD_PLIST" >/dev/null 2>&1 || true
fi

echo "Old blog LaunchAgent unloaded. n8n local control plane remains active."
