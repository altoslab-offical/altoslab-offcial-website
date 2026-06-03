#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="${ALTOS_BLOG_WORKER_ENV_FILE:-$HOME/.altoslab-blog-worker.env}"
SCOPE="${VERCEL_SCOPE:-altoslaboffical-3015s-projects}"
PROJECT_NAME="${VERCEL_PROJECT_NAME:-altoslab-offcial-website}"
PROJECT_ID="${VERCEL_PROJECT_ID:-prj_KRN5DfbHeKEiksVhSTFc3ApZVYDe}"
TEAM_ID="${VERCEL_TEAM_ID:-team_nVIL3yKSHLYY7I7wdinJOn8e}"
SYNC_ENVIRONMENTS="${VERCEL_SYNC_ENVIRONMENTS:-production}"

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

cd "$ROOT_DIR"

if [[ ! -f .vercel/project.json && ! -f .vercel/repo.json ]]; then
  npx --yes vercel link --scope "$SCOPE" --project "$PROJECT_NAME" --yes
fi

if [[ -f .vercel/project.json ]]; then
  linked_project_id="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('.vercel/project.json','utf8')); console.log(j.projectId || '')")"
  linked_org_id="$(node -e "const fs=require('fs'); const j=JSON.parse(fs.readFileSync('.vercel/project.json','utf8')); console.log(j.orgId || '')")"
  if [[ "$linked_project_id" != "$PROJECT_ID" || "$linked_org_id" != "$TEAM_ID" ]]; then
    echo ".vercel/project.json is linked to the wrong Vercel project or team." >&2
    echo "Expected project/team: $PROJECT_ID / $TEAM_ID" >&2
    echo "Actual project/team:   $linked_project_id / $linked_org_id" >&2
    exit 1
  fi
elif ! npx --yes vercel projects ls --scope "$SCOPE" 2>&1 | grep -Fq "$PROJECT_NAME"; then
  echo "The Vercel scope '$SCOPE' is authenticated but does not expose project '$PROJECT_NAME'." >&2
  echo "This usually means the CLI is logged into the wrong Vercel account/team." >&2
  echo "Available teams for the current login:" >&2
  npx --yes vercel teams ls >&2 || true
  exit 1
fi

for env in $SYNC_ENVIRONMENTS; do
  npx --yes vercel env add BLOG_INGEST_HMAC_SECRET "$env" --value "$SECRET" --force --sensitive --yes --scope "$SCOPE"
done

npx --yes vercel deploy --prod --yes --scope "$SCOPE"

echo "Synced BLOG_INGEST_HMAC_SECRET to Vercel and triggered a production deploy."
