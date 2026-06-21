#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${ALTOS_GCP_ENV_FILE:-$HOME/.altoslab-blog-worker.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

PROJECT_ID="${GCP_PROJECT_ID:-project-e688c018-aec3-4815-891}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${GCP_CLOUD_RUN_SERVICE:-altoslab-official-website}"
REPOSITORY="${GCP_ARTIFACT_REPOSITORY:-altoslab-web}"
BUCKET="${GCS_BUCKET:-altoslab-official-cms-934551798702}"
GCLOUD_ACCOUNT="${ALTOS_PRODUCTION_GCLOUD_ACCOUNT:-${ALTOS_GOOGLE_OPERATOR_ACCOUNT:-altoslab.offical@gmail.com}}"
SERVICE_ACCOUNT_NAME="${GCP_CLOUD_RUN_SERVICE_ACCOUNT:-altoslab-runner}"
SERVICE_ACCOUNT="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://altoslab-ai.cc}"
GTM_ID="${NEXT_PUBLIC_GTM_ID:-GTM-WJ96VR7V}"
GA_ID="${NEXT_PUBLIC_GA_MEASUREMENT_ID:-G-5VSLFNVD28}"
GA4_PROPERTY_ID="${GA4_PROPERTY_ID:-}"
SEARCH_CONSOLE_SITE_URL="${SEARCH_CONSOLE_SITE_URL:-${SITE_URL}/}"
CANONICAL_REDIRECTS="${CANONICAL_REDIRECT_HOSTS:-www.altoslab-ai.cc,altoslab.com,www.altoslab.com,altoslab-offcial-website.vercel.app}"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:$(date -u +%Y%m%d%H%M%S)"

required_secret_names=(ADMIN_PASSWORD ADMIN_SESSION_TOKEN BLOG_INGEST_HMAC_SECRET CMS_ENCRYPTION_KEY)
missing=()
for key in "${required_secret_names[@]}"; do
  if [[ -z "${!key:-}" || "${!key:-}" == replace-with* || "${!key:-}" == change-this* ]]; then
    missing+=("$key")
  fi
done
if (( ${#missing[@]} > 0 )); then
  printf 'Missing required production secrets: %s\n' "${missing[*]}" >&2
  printf 'Set them in %s or the shell environment before deploying.\n' "$ENV_FILE" >&2
  exit 1
fi

export CLOUDSDK_CORE_ACCOUNT="${GCLOUD_ACCOUNT}"

echo "Using project ${PROJECT_ID}, region ${REGION}, service ${SERVICE}, gcloud account ${GCLOUD_ACCOUNT}."
gcloud config set project "$PROJECT_ID" >/dev/null

if ! gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  gcloud projects create "$PROJECT_ID" --name="ALTOS LAB Official Website"
fi

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  secretmanager.googleapis.com >/dev/null

if ! gcloud artifacts repositories describe "$REPOSITORY" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="ALTOS LAB official website images" >/dev/null
fi
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
CLOUD_BUILD_LEGACY_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
COMPUTE_DEFAULT_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
  --location="$REGION" \
  --member="serviceAccount:${CLOUD_BUILD_LEGACY_SA}" \
  --role="roles/artifactregistry.writer" >/dev/null || true
gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
  --location="$REGION" \
  --member="serviceAccount:${COMPUTE_DEFAULT_SA}" \
  --role="roles/artifactregistry.writer" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_DEFAULT_SA}" \
  --role="roles/storage.objectViewer" >/dev/null || true
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${COMPUTE_DEFAULT_SA}" \
  --role="roles/logging.logWriter" >/dev/null || true

ARTIFACT_POLICY_FILE="$(mktemp)"
cat > "$ARTIFACT_POLICY_FILE" <<'JSON'
[
  {
    "name": "delete-untagged-after-14-days",
    "action": { "type": "Delete" },
    "condition": {
      "tagState": "untagged",
      "olderThan": "1209600s"
    }
  },
  {
    "name": "keep-most-recent-10-tagged",
    "action": { "type": "Keep" },
    "mostRecentVersions": {
      "keepCount": 10
    }
  }
]
JSON
gcloud artifacts repositories set-cleanup-policies "$REPOSITORY" \
  --location="$REGION" \
  --policy="$ARTIFACT_POLICY_FILE" \
  --no-dry-run >/dev/null || true
rm -f "$ARTIFACT_POLICY_FILE"

if ! gcloud storage buckets describe "gs://${BUCKET}" >/dev/null 2>&1; then
  gcloud storage buckets create "gs://${BUCKET}" \
    --location="$REGION" \
    --uniform-bucket-level-access >/dev/null
fi

CMS_OBJECT="${GCS_CMS_PATH:-cms/altoslab-cms-v1.json}"
if [[ -f "data/cms.json" ]]; then
  if [[ "${GCP_OVERWRITE_CMS:-0}" == "1" ]] || ! gcloud storage objects describe "gs://${BUCKET}/${CMS_OBJECT}" >/dev/null 2>&1; then
    echo "Seeding CMS JSON into gs://${BUCKET}/${CMS_OBJECT}."
    gcloud storage cp data/cms.json "gs://${BUCKET}/${CMS_OBJECT}" >/dev/null
  else
    echo "CMS JSON already exists in GCS; keeping remote object. Set GCP_OVERWRITE_CMS=1 to replace it."
  fi
fi

if [[ -d "data/generated-blog-media" ]]; then
  echo "Syncing generated media into gs://${BUCKET}/${GCS_MEDIA_PREFIX:-blog-generated}/."
  gcloud storage rsync -r data/generated-blog-media "gs://${BUCKET}/${GCS_MEDIA_PREFIX:-blog-generated}" >/dev/null
fi

LIFECYCLE_FILE="$(mktemp)"
cat > "$LIFECYCLE_FILE" <<'JSON'
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": {
        "age": 180,
        "matchesPrefix": ["cms/altoslab-cms-v1.versions/"]
      }
    }
  ]
}
JSON
gcloud storage buckets update "gs://${BUCKET}" --lifecycle-file="$LIFECYCLE_FILE" >/dev/null || true
rm -f "$LIFECYCLE_FILE"

if ! gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$SERVICE_ACCOUNT_NAME" \
    --display-name="ALTOS LAB Cloud Run runtime" >/dev/null
fi

for attempt in {1..12}; do
  if gcloud iam service-accounts describe "$SERVICE_ACCOUNT" >/dev/null 2>&1; then
    break
  fi
  if [[ "$attempt" == "12" ]]; then
    echo "Service account ${SERVICE_ACCOUNT} was created but is not yet visible to IAM." >&2
    exit 1
  fi
  sleep 5
done

gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin" >/dev/null

secret_args=()
ensure_secret() {
  local env_key="$1"
  local secret_name="$2"
  local value="${!env_key:-}"
  [[ -z "$value" ]] && return 0
  if ! gcloud secrets describe "$secret_name" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets create "$secret_name" --data-file=- >/dev/null
  else
    printf '%s' "$value" | gcloud secrets versions add "$secret_name" --data-file=- >/dev/null
  fi
  enabled_versions=()
  while IFS= read -r version; do
    [[ -n "$version" ]] && enabled_versions+=("$version")
  done < <(gcloud secrets versions list "$secret_name" --filter="state=enabled" --sort-by="~createTime" --format="value(name)")
  index=0
  for version in "${enabled_versions[@]}"; do
    if [[ "$index" == "0" ]]; then
      index=$((index + 1))
      continue
    fi
    gcloud secrets versions destroy "$version" --secret="$secret_name" --quiet >/dev/null || true
    index=$((index + 1))
  done
  gcloud secrets add-iam-policy-binding "$secret_name" \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
  secret_args+=("${env_key}=${secret_name}:latest")
}

ensure_secret ADMIN_PASSWORD altos-admin-password
ensure_secret ADMIN_SESSION_TOKEN altos-admin-session-token
ensure_secret BLOG_INGEST_HMAC_SECRET altos-blog-ingest-hmac-secret
ensure_secret CMS_ENCRYPTION_KEY altos-cms-encryption-key
ensure_secret CRON_SECRET altos-cron-secret

gcloud builds submit \
  --config=cloudbuild.yaml \
  --substitutions="^|^_IMAGE=${IMAGE}|_NEXT_PUBLIC_SITE_URL=${SITE_URL}|_NEXT_PUBLIC_GTM_ID=${GTM_ID}|_NEXT_PUBLIC_GA_MEASUREMENT_ID=${GA_ID}|_CANONICAL_REDIRECT_HOSTS=${CANONICAL_REDIRECTS}" \
  .

env_vars=(
  "NEXT_PUBLIC_SITE_URL=${SITE_URL}"
  "NEXT_PUBLIC_GTM_ID=${GTM_ID}"
  "NEXT_PUBLIC_GA_MEASUREMENT_ID=${GA_ID}"
  "GA4_PROPERTY_ID=${GA4_PROPERTY_ID}"
  "SEARCH_CONSOLE_SITE_URL=${SEARCH_CONSOLE_SITE_URL}"
  "CANONICAL_REDIRECT_HOSTS=${CANONICAL_REDIRECTS}"
  "GCS_STORAGE_ENABLED=1"
  "GCS_BUCKET=${BUCKET}"
  "GCS_CMS_PATH=${GCS_CMS_PATH:-cms/altoslab-cms-v1.json}"
  "GCS_MEDIA_PREFIX=${GCS_MEDIA_PREFIX:-blog-generated}"
  "CLOUDFLARE_KV_ENABLED=0"
  "CLOUDFLARE_R2_ENABLED=0"
  "BLOG_DISABLE_DEEPSEEK_CRON=true"
  "AUTO_PUBLISH_BLOG=true"
  "BLOG_IMAGE_ALLOW_NON_BLOB=${BLOG_IMAGE_ALLOW_NON_BLOB:-0}"
  "BLOG_IMAGE_VERIFY_REMOTE=${BLOG_IMAGE_VERIFY_REMOTE:-true}"
  "BLOG_MEDIA_ALLOW_LOCAL_STORAGE=0"
  "BLOG_ALLOW_LOCAL_FALLBACK_COVERS=0"
  "BLOG_LLM_REVIEW=${BLOG_LLM_REVIEW:-false}"
  "ALTOS_BLOG_COLUMN_DAILY_LIMIT=${ALTOS_BLOG_COLUMN_DAILY_LIMIT:-3}"
  "ALTOS_BLOG_COLUMN_SLOTS=${ALTOS_BLOG_COLUMN_SLOTS:-morning,afternoon,evening}"
  "CMS_STORAGE_KEY=${CMS_STORAGE_KEY:-altoslab:cms:v1}"
  "GOOGLE_SITE_VERIFICATION=${GOOGLE_SITE_VERIFICATION:-}"
  "BING_SITE_VERIFICATION=${BING_SITE_VERIFICATION:-}"
  "PINTEREST_SITE_VERIFICATION=${PINTEREST_SITE_VERIFICATION:-}"
  "FACEBOOK_DOMAIN_VERIFICATION=${FACEBOOK_DOMAIN_VERIFICATION:-}"
)

RUN_ENV_FILE="$(mktemp)"
for item in "${env_vars[@]}"; do
  key="${item%%=*}"
  value="${item#*=}"
  quoted_value="$(node -e 'process.stdout.write(JSON.stringify(process.argv[1] || ""))' "$value")"
  printf '%s: %s\n' "$key" "$quoted_value" >> "$RUN_ENV_FILE"
done

deploy_args=(
  run deploy "$SERVICE"
  --image "$IMAGE"
  --region "$REGION"
  --platform managed
  --allow-unauthenticated
  --service-account "$SERVICE_ACCOUNT"
  --cpu 1
  --memory 512Mi
  --concurrency 80
  --min-instances 0
  --max-instances 3
  --port 8080
  --env-vars-file "$RUN_ENV_FILE"
)

if (( ${#secret_args[@]} > 0 )); then
  deploy_args+=(--set-secrets "$(IFS=,; echo "${secret_args[*]}")")
fi

gcloud "${deploy_args[@]}"
rm -f "$RUN_ENV_FILE"

service_url="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
node scripts/gcp-production-smoke.mjs --base-url "$service_url" >/tmp/altoslab-gcp-smoke.json

mkdir -p data/gcp
cat > data/gcp/latest-deployment.json <<JSON
{
  "projectId": "${PROJECT_ID}",
  "region": "${REGION}",
  "service": "${SERVICE}",
  "image": "${IMAGE}",
  "bucket": "${BUCKET}",
  "serviceUrl": "${service_url}",
  "siteUrl": "${SITE_URL}",
  "gtmId": "${GTM_ID}",
  "gaMeasurementId": "${GA_ID}",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
JSON

echo "Cloud Run service URL: ${service_url}"
echo "GCP deploy smoke passed."
