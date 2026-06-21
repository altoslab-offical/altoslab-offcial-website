# ALTOSLAB Cloudflare to AWS Migration Plan

Status: production is live on AWS ECS/Fargate behind the HTTPS ALB at
`https://altoslab-ai.cc`. Cloudflare remains DNS-only for apex, `www`,
preview, and ACM validation records; Cloudflare Workers/D1/KV no longer serve
production public traffic.

The migration moved runtime and storage to AWS without changing the protected
public UI baseline.

## Target Architecture

Phase 1, lowest-risk AWS cutover:

- Runtime: Dockerized Next.js standalone server on AWS ECS Fargate or an
  equivalent container runtime.
- Container image: Amazon ECR.
- HTTPS: AWS ALB + ACM. CloudFront can be added later as an optional CDN layer.
- CMS storage: private S3 object storage via `AWS_S3_BUCKET`.
- Generated blog media: private S3 object storage, served same-origin through
  `/api/blog/generated-media/:filename`.
- Secrets: AWS Secrets Manager or ECS task environment secrets.
- DNS: `altoslab-ai.cc` and `www.altoslab-ai.cc` are DNS-only CNAME records
  pointing at the AWS ALB.

## AWS Preview Created On 2026-06-18

The first AWS preview is running on ECS/Fargate because App Runner returned
`SubscriptionRequiredException` for this AWS account.

Resources:

```text
AWS account: 487316829524
Region: ap-northeast-1
S3 bucket: altoslab-official-cms-487316829524
ECR repo: 487316829524.dkr.ecr.ap-northeast-1.amazonaws.com/altoslab-official-website
ECS cluster: altoslab-web
ECS service: altoslab-web-service
Task family: altoslab-official-website
ALB: altoslab-web-alb
Target group: altoslab-web-tg
Preview URL: http://altoslab-web-alb-1062055193.ap-northeast-1.elb.amazonaws.com
```

Secrets are stored in AWS Secrets Manager under `altoslab/aws/*`. A local
operator copy was written to `~/.altoslab-aws.env`; do not commit or paste those
values into chat.

Verified preview smoke:

```bash
npm run verify:aws -- --base-url http://altoslab-web-alb-1062055193.ap-northeast-1.elb.amazonaws.com --expected-provider aws-s3
```

Last verified result on 2026-06-18:

```text
ok: true
cmsStorage.provider: aws-s3
home/blog/feed/rss/sitemap/llms/admin/health: pass
```

AWS HTTPS preview was validated before production cutover.

## AWS HTTPS Preview Completed On 2026-06-18

Preview custom domain:

```text
aws-preview.altoslab-ai.cc
```

ACM certificate requested in the ALB region:

```text
arn:aws:acm:ap-northeast-1:487316829524:certificate/f83a5378-4516-48ab-aac5-aefe07a18063
```

ALB security group `sg-0f928ce007cf5d726` now allows public inbound `443`
with description `HTTPS preview`. Port `80` remains open and still forwards to
the existing target group, so the HTTP preview remains available.

Cloudflare DNS-only records added for preview and ACM validation:

```text
Type: CNAME
Name: _3acdfb7fd07b85ccbae1cb2d0757486f.aws-preview.altoslab-ai.cc
Target: _59abadc8c16c797f04f104b2cebcd541.jkddzztszm.acm-validations.aws
Proxy: DNS only
TTL: Auto or 60

Type: CNAME
Name: aws-preview.altoslab-ai.cc
Target: altoslab-web-alb-1062055193.ap-northeast-1.elb.amazonaws.com
Proxy: DNS only
TTL: Auto or 60
```

At preview completion, the production apex and `www` records were not yet cut
over:

```text
altoslab-ai.cc: A 192.0.2.1, Proxied
www.altoslab-ai.cc: CNAME altoslab-ai.cc, Proxied
```

ACM validation completed:

```text
Certificate status: ISSUED
Validation status: SUCCESS
```

HTTPS listener created on `altoslab-web-alb`:

```text
Port: 443
Protocol: HTTPS
Certificate: arn:aws:acm:ap-northeast-1:487316829524:certificate/f83a5378-4516-48ab-aac5-aefe07a18063
Default action: forward to altoslab-web-tg
SSL policy: ELBSecurityPolicy-TLS13-1-2-2021-06
```

AWS ECS service updated to task definition revision 2:

```text
Task definition: arn:aws:ecs:ap-northeast-1:487316829524:task-definition/altoslab-official-website:2
NEXT_PUBLIC_SITE_URL=https://aws-preview.altoslab-ai.cc
Deployment: COMPLETED
Desired/running tasks: 1/1
```

Verified HTTPS preview smoke:

```bash
npm run verify:aws -- --base-url https://aws-preview.altoslab-ai.cc --expected-provider aws-s3
```

Last verified result on 2026-06-18:

```text
ok: true
cmsStorage.provider: aws-s3
home/blog all languages/feed/rss/sitemap/llms/admin/health: pass
admin: 307 to /admin/login?next=%2Fadmin
blogApi.publishedPosts: 24
```

## Production AWS Cutover Completed On 2026-06-18

Production custom domains:

```text
altoslab-ai.cc
www.altoslab-ai.cc
```

Production ACM certificate in the ALB region:

```text
arn:aws:acm:ap-northeast-1:487316829524:certificate/c6233219-da20-40b4-b462-7bb6dc8c42c8
```

Cloudflare DNS-only records after cutover:

```text
Type: CNAME
Name: altoslab-ai.cc
Target: altoslab-web-alb-1062055193.ap-northeast-1.elb.amazonaws.com
Proxy: DNS only
TTL: Auto

Type: CNAME
Name: www.altoslab-ai.cc
Target: altoslab-web-alb-1062055193.ap-northeast-1.elb.amazonaws.com
Proxy: DNS only
TTL: Auto
```

Production ACM validation records remain DNS-only:

```text
Type: CNAME
Name: _edc02825518571e005bdc4c5eebdf163.altoslab-ai.cc
Target: _d5937cd0bd1d978fba04cc5f404e8110.jkddzztszm.acm-validations.aws

Type: CNAME
Name: _f68e32e65f0ef71a1e4aeec66142af75.www.altoslab-ai.cc
Target: _e756c71f273fbf838ee0d7443749ed17.jkddzztszm.acm-validations.aws
```

ALB HTTPS listener:

```text
Port: 443
Protocol: HTTPS
Default certificate: arn:aws:acm:ap-northeast-1:487316829524:certificate/c6233219-da20-40b4-b462-7bb6dc8c42c8
SNI preview certificate: arn:aws:acm:ap-northeast-1:487316829524:certificate/f83a5378-4516-48ab-aac5-aefe07a18063
Default action: forward to altoslab-web-tg
```

AWS ECS service updated to task definition revision 3:

```text
Task definition: arn:aws:ecs:ap-northeast-1:487316829524:task-definition/altoslab-official-website:3
NEXT_PUBLIC_SITE_URL=https://altoslab-ai.cc
Deployment: COMPLETED
Desired/running tasks: 1/1
```

Verified production smoke:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

Last verified result on 2026-06-18:

```text
ok: true
cmsStorage.provider: aws-s3
cmsStorage.bucket: altoslab-official-cms-487316829524
cmsStorage.region: ap-northeast-1
cmsStorage.durable: true
cmsStorage.writable: true
home/blog all languages/feed/rss/sitemap/llms/admin/health: pass
admin: 307 to /admin/login?next=%2Fadmin
blogApi.publishedPosts: 24
www.altoslab-ai.cc/blog: 308 to https://altoslab-ai.cc/blog
```

## AWS Article Body Hotfix Completed On 2026-06-18

After the production AWS cutover, article detail pages rendered metadata,
covers, summaries, and related articles, but the main `.rich-text` body was
empty. The CMS object in S3 still contained full `blogPosts[].body` values; the
bug was in the AWS-only public detail read path.

Root cause:

```text
getPublishedBlogPost()
-> no Cloudflare D1/KV detail cache on AWS
-> readPublishedBlogPostsForPublic()
-> publicBlogListPostsFromData()
-> compactPublicBlogListPost() intentionally clears body for list performance
-> article detail rendered the compact post instead of re-reading the full CMS post
```

Fix:

```text
If public detail cache/projection is unavailable and the matched public post has
no body, getPublishedBlogPost() now re-reads full CMS data from durable storage
and returns the full published post.
```

Deployment:

```text
ECR image: 487316829524.dkr.ecr.ap-northeast-1.amazonaws.com/altoslab-official-website:bodyfix-20260618-0915
Task definition: arn:aws:ecs:ap-northeast-1:487316829524:task-definition/altoslab-official-website:4
Deployment: COMPLETED
Desired/running tasks: 1/1
```

The AWS production smoke now includes an article detail guard that fetches one
public blog article and fails if `.rich-text` has no body content.

Verified result:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

```text
ok: true
blogArticleDetail.hasRichTextBody: true
cmsStorage.provider: aws-s3
```

Cloudflare remains authoritative DNS for the zone, but the public production
site now resolves directly to AWS rather than to the Cloudflare Worker.

## 2026-06-19 Blog AdSense AWS Deployment

Purpose:

- Publish the Blog AdSense opt-in slot architecture to AWS production.
- Keep slots inactive until valid numeric `NEXT_PUBLIC_ADSENSE_BLOG_*_SLOT`
  values are configured.
- Preserve the approved public Blog UI baseline.

Deployment:

```text
ECR image: 487316829524.dkr.ecr.ap-northeast-1.amazonaws.com/altoslab-official-website:adsense-amd64-20260619-154018
Task definition: arn:aws:ecs:ap-northeast-1:487316829524:task-definition/altoslab-official-website:6
ECS service: altoslab-web-service
Deployment: COMPLETED
Desired/running tasks: 1/1
```

Important deployment note:

```text
Use linux/amd64 for this ECS/Fargate service image. A linux/arm64-only image
cannot be pulled by the current task runtime and will fail with:
image Manifest does not contain descriptor matching platform 'linux/amd64'
```

Verified result:

```bash
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

```text
ok: true
cmsStorage.provider: aws-s3
blogArticleDetail.hasRichTextBody: true
```

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
ALTOS_BLOG_COLUMN_DAILY_LIMIT=3
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
