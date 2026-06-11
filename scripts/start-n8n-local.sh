#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"

ensure_secret_line() {
  local key="$1"
  local bytes="${2:-32}"
  if [[ -f "$ENV_FILE" ]] && grep -q "^${key}=" "$ENV_FILE"; then
    return
  fi
  local value
  value="$(openssl rand -hex "$bytes")"
  printf '%s=%s\n' "$key" "$value" >> "$ENV_FILE"
}

mkdir -p "$(dirname "$ENV_FILE")"
touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

ensure_secret_line "N8N_ENCRYPTION_KEY" 32
ensure_secret_line "POSTGRES_PASSWORD" 24
ensure_secret_line "ALTOS_N8N_BRIDGE_TOKEN" 32

if ! grep -q '^POSTGRES_USER=' "$ENV_FILE"; then
  printf 'POSTGRES_USER=n8n\n' >> "$ENV_FILE"
fi
if ! grep -q '^POSTGRES_DB=' "$ENV_FILE"; then
  printf 'POSTGRES_DB=n8n\n' >> "$ENV_FILE"
fi
if ! grep -q '^N8N_LOCAL_PORT=' "$ENV_FILE"; then
  printf 'N8N_LOCAL_PORT=5679\n' >> "$ENV_FILE"
fi
if ! grep -q '^WEBHOOK_URL=' "$ENV_FILE"; then
  printf 'WEBHOOK_URL=http://127.0.0.1:5679/\n' >> "$ENV_FILE"
fi
if ! grep -q '^N8N_BLOCK_ENV_ACCESS_IN_NODE=' "$ENV_FILE"; then
  printf 'N8N_BLOCK_ENV_ACCESS_IN_NODE=false\n' >> "$ENV_FILE"
fi
if ! grep -q '^ALTOS_BLOG_AUTOMATION_BASE_URL=' "$ENV_FILE"; then
  printf 'ALTOS_BLOG_AUTOMATION_BASE_URL=https://altoslab-ai.cc\n' >> "$ENV_FILE"
fi
if ! grep -q '^GENERIC_TIMEZONE=' "$ENV_FILE"; then
  printf 'GENERIC_TIMEZONE=Asia/Taipei\n' >> "$ENV_FILE"
fi
if ! grep -q '^TZ=' "$ENV_FILE"; then
  printf 'TZ=Asia/Taipei\n' >> "$ENV_FILE"
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

N8N_LOCAL_PORT="$(grep '^N8N_LOCAL_PORT=' "$ENV_FILE" | tail -1 | cut -d= -f2-)"
echo "n8n local URL: http://127.0.0.1:${N8N_LOCAL_PORT:-5679}"
echo "Secrets are stored in $ENV_FILE and were not printed."
