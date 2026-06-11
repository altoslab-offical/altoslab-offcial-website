#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="/Users/asdc163/Documents/官方網站"
ENV_FILE="$HOME/.altoslab-n8n.env"
COMPOSE_FILE="$ROOT_DIR/ops/n8n-local/docker-compose.yml"
N8N_PORT="${N8N_LOCAL_PORT:-}"
FULL=false

if [[ "${1:-}" == "--full" ]]; then
  FULL=true
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
  out="$(curl -fsS -X POST -H "content-type: application/json" --data "{\"source\":\"${label}\"}" "$url")"
  printf '%s' "$out" | expect_json_true ok >/dev/null
  local job
  job="$(printf '%s' "$out" | extract_json_field job)"
  local code
  code="$(printf '%s' "$out" | extract_json_field code)"
  echo "$label ok: job=$job code=$code"
}

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
for workflow_id in altos-health-watch altos-market-scan altos-scheduled-gate altos-seo-geo altos-manual-control; do
  if ! grep -q "$workflow_id" <<<"$workflow_list"; then
    echo "missing workflow: $workflow_id" >&2
    exit 1
  fi
done
echo "workflow inventory ok"

echo "Checking n8n manual health webhook"
json_smoke "manual-health" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/health"

if [[ "$FULL" == true ]]; then
  echo "Checking n8n manual column prep webhook"
  json_smoke "manual-column-prep" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/column-prep"

  echo "Checking n8n manual market validate webhook"
  json_smoke "manual-market-validate" "http://127.0.0.1:${N8N_PORT}/webhook/altos-blog/manual/market-validate"
fi

echo "n8n local control plane verification passed"
