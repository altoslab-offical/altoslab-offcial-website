#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="${ALTOS_BLOG_WORKER_ENV_FILE:-$HOME/.altoslab-blog-worker.env}"
SCOPE="${VERCEL_SCOPE:-altoslaboffical-3015s-projects}"
PROJECT_NAME="${VERCEL_PROJECT_NAME:-altoslab-offcial-website}"

vercel_whoami() {
  local output_file pid code
  output_file="$(mktemp)"
  npx --yes vercel whoami --scope "$SCOPE" >"$output_file" 2>&1 &
  pid=$!
  for _ in {1..12}; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      wait "$pid"
      code=$?
      cat "$output_file" >&2
      rm -f "$output_file"
      return "$code"
    fi
    sleep 1
  done
  kill "$pid" >/dev/null 2>&1 || true
  wait "$pid" >/dev/null 2>&1 || true
  cat "$output_file" >&2
  rm -f "$output_file"
  return 124
}

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE. Create it from scripts/altoslab-blog-worker.env.example first." >&2
  exit 1
fi

SECRET="$(
  awk -F= '$1=="BLOG_INGEST_HMAC_SECRET" {print substr($0, index($0, "=") + 1)}' "$ENV_FILE"
)"

if [[ ${#SECRET} -lt 24 ]]; then
  echo "BLOG_INGEST_HMAC_SECRET in $ENV_FILE is missing or too short." >&2
  exit 1
fi

if [[ "$SECRET" =~ replace-with|test-secret ]]; then
  echo "$ENV_FILE still contains a placeholder/test secret. Refusing to sync." >&2
  exit 1
fi

if ! vercel_whoami; then
  echo "Vercel CLI is not authenticated for scope '$SCOPE'." >&2
  echo "Run: npx vercel login" >&2
  echo "Then re-run: VERCEL_SCOPE=$SCOPE scripts/sync-blog-ingest-secret-to-vercel.sh" >&2
  exit 1
fi

if ! npx --yes vercel projects ls --scope "$SCOPE" 2>/dev/null | grep -Fq "$PROJECT_NAME"; then
  echo "The Vercel scope '$SCOPE' is authenticated but does not expose project '$PROJECT_NAME'." >&2
  echo "This usually means the CLI is logged into the wrong Vercel account/team." >&2
  echo "Available teams for the current login:" >&2
  npx --yes vercel teams ls 2>/dev/null >&2 || true
  exit 1
fi

cd "$ROOT_DIR"

if [[ ! -f .vercel/project.json && ! -f .vercel/repo.json ]]; then
  npx --yes vercel link --repo --scope "$SCOPE" --yes
fi

for env in production preview development; do
  printf '%s' "$SECRET" | npx --yes vercel env add BLOG_INGEST_HMAC_SECRET "$env" --force --sensitive --yes --scope "$SCOPE"
done

npx --yes vercel deploy --prod --yes --scope "$SCOPE"

echo "Synced BLOG_INGEST_HMAC_SECRET to Vercel and triggered a production deploy."
