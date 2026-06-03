#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ALTOS_CLOUDFLARE_ENV_FILE:-$HOME/.altoslab-blog-worker.env}"
KV_NAMESPACE_NAME="${ALTOS_CLOUDFLARE_KV_NAMESPACE:-ALTOS_BLOG_KV}"

cd "$ROOT_DIR"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

echo "Checking Cloudflare account..."
npx wrangler whoami

echo "Checking Workers KV namespace: $KV_NAMESPACE_NAME"
if ! npx wrangler kv namespace list | grep -q "\"title\": \"$KV_NAMESPACE_NAME\""; then
  echo "KV namespace $KV_NAMESPACE_NAME was not found. Create it with: npx wrangler kv namespace create $KV_NAMESPACE_NAME"
  exit 1
fi

put_secret() {
  local name="$1"
  local value="${!name:-}"

  if [[ -z "$value" || "$value" == replace-* || "$value" == change-this* || "$value" == *test-secret* ]]; then
    echo "Skipping $name: value is missing or placeholder."
    return
  fi

  echo "Syncing secret: $name"
  printf "%s" "$value" | npx wrangler secret put "$name"
}

put_secret BLOG_INGEST_HMAC_SECRET
put_secret ADMIN_PASSWORD
put_secret ADMIN_SESSION_TOKEN
put_secret CMS_ENCRYPTION_KEY
put_secret CRON_SECRET
put_secret NEXT_PUBLIC_GTM_ID
put_secret NEXT_PUBLIC_GA_MEASUREMENT_ID

echo "Cloudflare free-first setup finished. Deploy with: npm run deploy:cloudflare"
