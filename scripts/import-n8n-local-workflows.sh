#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n \
  n8n import:workflow --input=/files/workflows/altos-blog-control-plane.json

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-health-watch
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-market-scan
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-scheduled-gate
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-column-release-poll
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-seo-geo
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n publish:workflow --id=altos-manual-control

echo "Imported and published ALTOS LAB n8n workflows. Open http://127.0.0.1:5679 to inspect execution history."
