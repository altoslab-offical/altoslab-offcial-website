# AWS Free-First Migration Contract

Last updated: 2026-06-02

## Current Production Incident Status

- `https://altoslab-ai.cc/` is restored on Cloudflare Workers.
- The 2026-06-02 homepage outage was caused by the homepage route falling back to `readFile(process.cwd() + "/index.html")` in the Worker bundle. The Worker has no `/bundle/index.html`, so `/` returned 500.
- The route now reads the deployed static homepage asset at `/altoslab-homepage` in Cloudflare and only uses local filesystem reads outside the Cloudflare runtime.

## Free-First Rule

Do not cut over DNS to AWS until all of these are true:

1. AWS account is confirmed under `altoslab.offical@gmail.com`.
2. Billing preferences, Free Tier usage alerts, and a zero-spend or near-zero monthly AWS Budget are active.
3. A preview AWS deployment passes homepage, blog indexes, four-language article pages, admin login, admin blog edit, media replacement, RSS, sitemap, `llms.txt`, and release verification.
4. CMS and media data are backed up from production and can be restored without Cloudflare KV.
5. DNS rollback is documented and tested with low TTL before cutover.

## Platform Decision

Preferred first AWS target: **AWS Amplify Hosting preview**, not EC2.

Reason:

- The app is a Next.js app with SSR pages, API routes, dynamic blog routes, middleware/proxy, and environment variables.
- Amplify Hosting is the closest AWS-managed fit for that shape.
- EC2 free tier is not a durable free plan and adds server patching, TLS, process supervision, backup, and monitoring work.

Important risk:

- AWS Amplify documentation currently lists Next.js SSR support up through Next.js 15.
- This repo currently uses Next.js 16.2.6.
- Therefore Amplify must be tested in a preview branch before any production migration. Do not downgrade Next.js in production just to fit Amplify without a regression pass.

## Data Dependencies To Migrate

Current production depends on:

- Cloudflare KV for CMS metadata according to `/api/health`.
- Cloudflare KV/R2 or Vercel Blob paths for generated blog media depending on environment flags.
- Signed HMAC external blog ingest/release routes.
- Local scheduled worker on Tommy's Mac for Gemini/GPT article production.
- Admin password/session env vars.
- GA/GTM env vars.

AWS replacement target:

- Hosting: AWS Amplify Hosting preview first.
- CMS payload: S3 JSON object with versioned backups or DynamoDB item store.
- Blog media: S3 bucket with CloudFront delivery.
- Scheduled release controller: keep local LaunchAgent first; only later consider EventBridge if content generation is no longer Chrome/Gemini/GPT-tab dependent.
- Secrets: Amplify environment variables or AWS Secrets Manager after cost review.

## Migration Stages

### Stage 0: Cost Guardrail

- Confirm AWS console login for `altoslab.offical@gmail.com`.
- Enable Free Tier usage alerts.
- Create a budget alert before creating any hosting/storage resources.
- Record account creation date, free plan/credit state, and the alert recipient.

### Stage 1: Parallel Preview

- Connect GitHub repo `altoslab-offical/altoslab-offcial-website`.
- Deploy a non-production AWS preview branch.
- Set `NEXT_PUBLIC_SITE_URL` to the AWS preview URL for preview only.
- Keep canonical production on `https://altoslab-ai.cc` until cutover.
- Do not point GoDaddy/DNS to AWS during preview.

### Stage 2: Storage Independence

- Export production blog/public API data before migration.
- Add AWS S3/DynamoDB CMS adapter behind an env-selected provider.
- Add S3 media upload/read adapter.
- Run admin edit and image replacement tests against AWS preview.

### Stage 3: Release Pipeline

- Run the formal Gemini/GPT blog release SOP against AWS preview with `validateOnly`.
- Publish one test set only after preview quality and image gates pass.
- Verify public URLs, admin readback, RSS, sitemap, `llms.txt`, cover URLs, and OG/Twitter tags.

### Stage 4: DNS Cutover

- Lower DNS TTL.
- Keep Cloudflare production as rollback target.
- Cut over only after AWS preview passes two fresh smoke runs.
- Verify Search Console, GA/GTM, canonical URLs, redirects, and social card previews.

## Current Blockers

- Local machine has no `aws` CLI configured.
- No AWS credentials are available in the terminal.
- AWS resource creation is blocked until the official account login and billing guardrails are confirmed.
