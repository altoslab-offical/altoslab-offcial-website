# ALTOSLAB Cloudflare to AWS Migration Plan

Status: preparation only. Do not cut DNS until an AWS preview URL passes smoke.

Current production is Cloudflare Workers + Cloudflare D1 + Cloudflare KV. This
plan moves runtime and storage to AWS without changing the protected public UI
baseline.

## Target Architecture

Phase 1, lowest-risk AWS cutover:

- Runtime: Dockerized Next.js standalone server on AWS ECS Fargate or an
  equivalent container runtime.
- Container image: Amazon ECR.
- HTTPS/CDN: CloudFront + ACM.
- CMS storage: private S3 object storage via `AWS_S3_BUCKET`.
- Generated blog media: private S3 object storage, served same-origin through
  `/api/blog/generated-media/:filename`.
- Secrets: AWS Secrets Manager or ECS task environment secrets.
- DNS: cut `altoslab-ai.cc` only after the AWS preview URL passes smoke.

Phase 2, optional:

- Move Blog/CMS from JSON-on-S3 to RDS PostgreSQL.
- Keep `lib/cms.ts` as the application boundary while replacing storage behind
  `lib/cms-storage.ts`.

## Local AWS CLI

AWS CLI is installed on this Mac.

Recommended login path:

```bash
aws configure sso
aws sts get-caller-identity
```

For the ALTOSLAB account shown in AWS Console, the normalized account id is:

```text
487316829524
```

Do not paste AWS access keys or secret values into chat. Store local operator
settings in `~/.altoslab-aws.env` if needed.

## Required Runtime Environment

Use these names for the AWS preview service:

```bash
NEXT_PUBLIC_SITE_URL=https://<aws-preview-domain>
NEXT_PUBLIC_GTM_ID=GTM-WJ96VR7V
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-5VSLFNVD28
NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8663357592872896
SEARCH_CONSOLE_SITE_URL=https://altoslab-ai.cc/
CMS_STORAGE_KEY=altoslab:cms:v1

AWS_REGION=ap-northeast-1
AWS_S3_STORAGE_ENABLED=1
AWS_S3_BUCKET=altoslab-official-cms-487316829524
AWS_S3_CMS_PATH=cms/altoslab-cms-v1.json
AWS_S3_MEDIA_PREFIX=blog-generated

CLOUDFLARE_D1_ENABLED=0
CLOUDFLARE_KV_ENABLED=0
CLOUDFLARE_R2_ENABLED=0
GCS_STORAGE_ENABLED=0

AUTO_PUBLISH_BLOG=true
BLOG_DISABLE_DEEPSEEK_CRON=true
BLOG_IMAGE_ALLOW_NON_BLOB=0
BLOG_IMAGE_VERIFY_REMOTE=true
BLOG_MEDIA_ALLOW_LOCAL_STORAGE=0
ALTOS_BLOG_COLUMN_DAILY_LIMIT=1
```

Secrets required by the app:

```bash
ADMIN_PASSWORD=<secret>
ADMIN_SESSION_TOKEN=<secret>
BLOG_INGEST_HMAC_SECRET=<secret>
CMS_ENCRYPTION_KEY=<secret>
CRON_SECRET=<secret>
```

## Data Migration

Export Cloudflare D1 first:

```bash
mkdir -p data/migration
npx wrangler d1 export altos-blog-cms --remote --output data/migration/altos-blog-cms.sql
```

The app supports `aws-s3` as a CMS provider. Dry-run the D1 to S3 CMS migration
first:

```bash
npm run aws:migrate-cms -- --profile altoslab
```

Then write the current D1 CMS payload into S3:

```bash
npm run aws:migrate-cms -- --profile altoslab --write
```

The script resolves Cloudflare D1 chunk markers and copies the CMS payload
without decrypting it, so the AWS runtime must use the same `CMS_ENCRYPTION_KEY`
as production Cloudflare. It writes the primary object to:

```text
s3://altoslab-official-cms-487316829524/cms/altoslab-cms-v1.json
```

If the production `CMS_ENCRYPTION_KEY` is unavailable during emergency AWS
recovery, use the public D1 projection as a readable fallback so `/blog` and
article detail pages keep the full published inventory:

```bash
npm run aws:migrate-cms -- --profile altoslab --source public-projection --write
```

This fallback reconstructs published blog posts only. It intentionally omits
private admin-only CMS state and can be replaced later by rerunning the normal
CMS blob migration after the original encryption key is available.

Generated media should be copied into:

```text
s3://altoslab-official-cms-487316829524/blog-generated/
```

## Verification

Local build:

```bash
npm test
npm run build:aws
```

Preview smoke after an AWS URL exists:

```bash
npm run verify:aws -- --base-url https://<aws-preview-domain> --expected-provider aws-s3
```

Expected `/api/health`:

```json
{
  "cmsStorage": {
    "provider": "aws-s3",
    "durable": true,
    "writable": true,
    "configured": true
  },
  "integrations": {
    "imageAwsS3StorageConfigured": true
  }
}
```

## Cutover Gate

Do not change DNS until all pass:

- `npm test`
- `npm run build:aws`
- `npm run verify:aws -- --base-url <aws-preview-url>`
- `/blog` shows the full public inventory.
- A known article detail page renders with the approved Blog shell and reduced
  article title scale.
- Admin login redirects correctly.
- Generated media returns `200` from same-origin `/api/blog/generated-media`.
- No Cloudflare Worker 1102 page appears anywhere in the AWS preview.

After DNS cutover, run:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```
