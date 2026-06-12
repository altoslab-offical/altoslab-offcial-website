#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"
N8N_PORT="${N8N_LOCAL_PORT:-}"
FULL=false
VERIFY_DATE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --full)
      FULL=true
      shift
      ;;
    --date)
      VERIFY_DATE="${2:-}"
      shift 2
      ;;
    --date=*)
      VERIFY_DATE="${1#--date=}"
      shift
      ;;
    *)
      echo "unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$VERIFY_DATE" ]]; then
  VERIFY_DATE="$(TZ=Asia/Taipei date +%Y-%m-%d)"
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "n8n env file missing: $ENV_FILE" >&2
  exit 1
fi

cd "$ROOT_DIR"

extract_json_field() {
  node -e '
const fs = require("fs");
const key = process.argv[1];
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
const value = key.split(".").reduce((acc, part) => acc && acc[part], payload);
if (typeof value === "object") console.log(JSON.stringify(value));
else if (value !== undefined && value !== null) console.log(String(value));
' "$1"
}

expect_json_true() {
  local key="$1"
  node -e '
const fs = require("fs");
const key = process.argv[1];
const payload = JSON.parse(fs.readFileSync(0, "utf8"));
const value = key.split(".").reduce((acc, part) => acc && acc[part], payload);
if (value !== true) {
  console.error(`${key} expected true, got ${JSON.stringify(value)}`);
  process.exit(1);
}
' "$key"
}

json_smoke() {
  local label="$1"
  local url="$2"
  local out
  local attempt
  local last_error=""
  for attempt in 1 2 3; do
    if out="$(curl -fsS -X POST -H "content-type: application/json" --data "{\"source\":\"${label}\",\"date\":\"${VERIFY_DATE}\"}" "$url" 2>&1)"; then
      break
    fi
    last_error="$out"
    if [[ "$attempt" == "3" ]]; then
      echo "$label failed after $attempt attempts: $last_error" >&2
      exit 1
    fi
    sleep "$attempt"
  done
  printf '%s' "$out" | expect_json_true ok >/dev/null
  local job
  job="$(printf '%s' "$out" | extract_json_field job)"
  local code
  code="$(printf '%s' "$out" | extract_json_field code)"
  echo "$label ok: job=$job code=$code"
}

COLUMN_INDEX_PATH=""
COLUMN_INDEX_BACKUP=""
COLUMN_INDEX_HAD_FILE=false

preserve_column_index() {
  COLUMN_INDEX_PATH="$ROOT_DIR/data/blog-prepared-candidates/${VERIFY_DATE}-morning-column.json"
  COLUMN_INDEX_BACKUP="$(mktemp -t altos-n8n-column-index.XXXXXX)"
  if [[ -f "$COLUMN_INDEX_PATH" ]]; then
    cp "$COLUMN_INDEX_PATH" "$COLUMN_INDEX_BACKUP"
    COLUMN_INDEX_HAD_FILE=true
  else
    COLUMN_INDEX_HAD_FILE=false
  fi
}

restore_column_index() {
  if [[ -z "$COLUMN_INDEX_PATH" || -z "$COLUMN_INDEX_BACKUP" ]]; then
    return 0
  fi
  if [[ "$COLUMN_INDEX_HAD_FILE" == true ]]; then
    mkdir -p "$(dirname "$COLUMN_INDEX_PATH")"
    cp "$COLUMN_INDEX_BACKUP" "$COLUMN_INDEX_PATH"
  else
    rm -f "$COLUMN_INDEX_PATH"
  fi
  rm -f "$COLUMN_INDEX_BACKUP"
  COLUMN_INDEX_PATH=""
  COLUMN_INDEX_BACKUP=""
  COLUMN_INDEX_HAD_FILE=false
}

trap restore_column_index EXIT

N8N_PORT="$(awk -F= '$1=="N8N_LOCAL_PORT"{print substr($0,index($0,"=")+1)}' "$ENV_FILE" | tail -1)"
N8N_PORT="${N8N_PORT:-5679}"

echo "Checking Docker services"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" ps

echo "Checking n8n version and env gate"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n --version
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n sh -lc '
  test "$N8N_BLOCK_ENV_ACCESS_IN_NODE" = false &&
  test -n "$ALTOS_N8N_BRIDGE_TOKEN" &&
  test -n "$WEBHOOK_URL" &&
  echo "n8n env gate ok"
'

echo "Checking bridge health"
bridge_health="$(curl -fsS http://127.0.0.1:8797/health)"
printf '%s' "$bridge_health" | expect_json_true ok >/dev/null
printf '%s' "$bridge_health" | expect_json_true tokenConfigured >/dev/null
echo "bridge health ok"

echo "Checking bridge unauthorized fail-closed"
unauth_code="$(curl -sS -o /tmp/altos-n8n-unauth.json -w '%{http_code}' -X POST http://127.0.0.1:8797/run/health)"
if [[ "$unauth_code" != "401" ]]; then
  echo "expected unauthorized bridge request to return 401, got $unauth_code" >&2
  exit 1
fi
echo "unauthorized bridge request returned 401"

echo "Checking workflow inventory"
workflow_list="$(docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T n8n n8n list:workflow)"
for workflow_id in altos-health-watch altos-market-scan altos-scheduled-gate altos-column-release-poll altos-daily-closeout-gate altos-seo-geo altos-manual-control; do
  if ! grep -q "$workflow_id" <<<"$workflow_list"; then
    echo "missing workflow: $workflow_id" >&2
    exit 1
  fi
done
echo "workflow inventory ok"

echo "Checking bridge job inventory"
for job_name in health worker-smoke custom-domain-smoke doctor ops-audit seo-geo-report column-prep column-status column-validate column-release daily-closeout scheduled market-scan-validate market-scan; do
  if ! grep -q "\"${job_name}\"" <<<"$bridge_health"; then
    echo "bridge job missing: $job_name" >&2
    exit 1
  fi
done
echo "bridge job inventory ok"

echo "Checking n8n manual health webhook"
json_smoke "manual-health" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/health"

if [[ "$FULL" == true ]]; then
  echo "Checking n8n manual column prep webhook"
  preserve_column_index
  json_smoke "manual-column-prep" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/column-prep"
  restore_column_index

  echo "Checking n8n manual column status webhook"
  json_smoke "manual-column-status" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/column-status"

  echo "Checking n8n manual column validate webhook"
  json_smoke "manual-column-validate" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/column-validate"

  echo "Checking n8n manual column release webhook"
  json_smoke "manual-column-release" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/column-release"

  echo "Checking n8n manual market validate webhook"
  json_smoke "manual-market-validate" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/market-validate"

  echo "Checking n8n manual daily closeout webhook"
  json_smoke "manual-daily-closeout" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/daily-closeout"
fi

echo "n8n local control plane verification passed"
