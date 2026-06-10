#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n \
  n8n import:workflow --input=/files/workflows/altos-blog-control-plane.json

echo "Imported ALTOS LAB n8n workflows. Open http://127.0.0.1:5678 to confirm owner setup and activation state."
