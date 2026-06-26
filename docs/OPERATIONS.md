# ALTOS LAB 官網維運手冊

## Production URLs

- Legacy Vercel alias: https://altoslab-offcial-website.vercel.app
- Legacy Cloudflare Workers target: `altoslab-official-website`
- Legacy Cloudflare Workers URL: https://altoslab-official-website.altoslab-ai.workers.dev
- Active custom domain: https://altoslab-ai.cc
- Future brand domain: https://altoslab.com
- Admin: `/admin`
- Blog: `/blog`
- Health check: `/api/health`

## AWS Active Lane

AWS ECS/Fargate is the active production runtime and AWS S3 is the active CMS/generated-media storage plane. Cloudflare is DNS/legacy context only, and GCP/Cloud Run/GCS is legacy recovery documentation only. Local automation, release doctors and public readback should use `https://altoslab-ai.cc` as the normal production base and require `/api/health` to report `cmsStorage.provider = aws-s3`.

- Next.js runs as the standalone Node server in the AWS ECS/Fargate service.
- CMS JSON is stored in the private AWS S3 bucket `altoslab-official-cms-487316829524`, region `ap-northeast-1`, path `cms/altoslab-cms-v1.json`.
- Generated covers and in-article visuals are uploaded through signed `/api/admin/blog/media` and served same-origin through `/api/blog/generated-media/:filename`, backed by AWS S3 in production.
- Gemini/Hermes writes and repairs article sets in the dedicated Blog QA workflow. Market-news covers use credited source/official images, while ChatGPT/GPT produces column/feature covers and in-article visuals. Codex validates, signs, releases, verifies, and writes exact blockers back to Hermes/OpenClaw.
- GCP repair scripts and Cloudflare Worker scripts remain for historical migration diagnostics; they must not be used by routine production automation.
- DeepSeek remains disabled for the formal daily blog workflow.

Run before any AWS production deploy:

```bash
npm run typecheck
npm run test:blog
npm run build:aws
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

Production deploy follows `docs/aws-login-and-deploy.md`: build the linux/amd64 image, push ECR, register a new ECS task definition, update `altoslab-web-service`, wait for stability, then run public readback, performance smoke, SEO/GEO report, and Chrome rendered QA.

Cloudflare Worker/D1/KV notes are legacy. Do not run `deploy:cloudflare`, `verify:cloudflare`, D1/KV seed, or Cloudflare direct-renderer diagnostics as the normal release path.

If a future migration intentionally reactivates Cloudflare or GCP, treat it as a new migration plan with preview, smoke, rollback, and explicit owner approval before any DNS or service cutover.

Legacy Cloudflare pinned smoke belongs only in a supervised migration/recovery note, not in daily production SOP.

## Legacy GCP Cloud Run Architecture

This path is retained as legacy recovery documentation only. Do not run blind GCP repair or deploy commands while `gcloud`/ADC credentials are invalid. If GCP is intentionally restored later, treat it as a new migration: preview first, verify the Cloud Run URL, then cut over DNS only after all public and admin checks pass.

## AWS Runtime Contract

The supported production storage adapter is `aws-s3`, documented in
`docs/aws-migration-plan.md`. Production must keep `AWS_S3_STORAGE_ENABLED=1`,
`AWS_REGION=ap-northeast-1`, `AWS_S3_BUCKET=altoslab-official-cms-487316829524`,
and `/api/health` must report `cmsStorage.provider = aws-s3`, then run:

```bash
npm test
npm run build:aws
npm run verify:aws -- --base-url <aws-preview-url> --expected-provider aws-s3
```

- Next.js builds as a standalone Node server in `Dockerfile` and runs in ECS/Fargate.
- CMS JSON and generated blog media are stored in private AWS S3; public access is through the website routes.
- Cloudflare D1/KV and GCS providers are legacy/migration adapters. They are not acceptable production truth for `altoslab-ai.cc`.
- GA/GTM stay on `GTM-WJ96VR7V` and `G-5VSLFNVD28` unless the analytics owner intentionally replaces them.
- Google operations now use `altoslab.offical@gmail.com` as the active operator account. Do not store this account's password in this repo or in Codex memory; use Google's sign-in session, MFA and `gcloud auth` on Tommy's machine.
- SEO/GEO daily insight should use `https://altoslab-ai.cc`. The daily email must be sent through the Gmail web UI from `altoslab.offical@gmail.com` to `altoslab.offical@gmail.com`; if the Gmail web session is not the official sender, hold the send instead of using a connector or another mailbox.
- Chrome browser work for Gemini, ChatGPT/GPT and Gmail must use the Chrome profile signed in as `john.wu0120@gmail.com`. Do not use or switch into `tm.studio`; if the required profile is not visible, hold browser work and report the blocker.

Run before any future GCP recovery deploy:

```bash
npm run typecheck
npm run test:blog
npm run build:gcp
npm run deploy:gcp
npm run verify:gcp -- --base-url <cloud-run-or-production-url>
```

`scripts/gcp-deploy-cloudrun.sh` reads `~/.altoslab-blog-worker.env` when present, creates/updates the Cloud Run service, GCS bucket, Artifact Registry repository, service account and Secret Manager entries, seeds `data/cms.json` into GCS only when the remote CMS object does not exist, syncs `data/generated-blog-media`, then runs `scripts/gcp-production-smoke.mjs` against the Cloud Run URL. It does not print secret values.

## Legacy Production CMS/GCS Drift Repair

This repair path is disabled for normal operation while AWS ECS/S3 is active. It is retained only for a future GCP recovery after credentials and domain mapping have been freshly revalidated. The scheduled blog runner must not repeat this GCP repair blindly.

```bash
npm run blog:repair-production -- --base-url https://altoslab-ai.cc --apply
```

`scripts/blog-production-repair.mjs` only updates Cloud Run runtime environment variables for the existing production service. It never generates, backfills, rewrites, or publishes articles. The repair scope is intentionally narrow:

- `GCS_STORAGE_ENABLED=1`
- `GCS_BUCKET=altoslab-official-cms-934551798702`
- `GCS_CMS_PATH=cms/altoslab-cms-v1.json`
- `GCS_MEDIA_PREFIX=blog-generated`
- `CLOUDFLARE_KV_ENABLED=0`
- `CLOUDFLARE_R2_ENABLED=0`

The script uses the production GCP account `altoslab.offical@gmail.com` by default without printing tokens or secret values, updates Cloud Run only when that account has permission, then polls `/api/health` and `/api/blog`. Use `--gcloud-account <account>` only for an explicit one-off operator override, and `--try-all-gcloud-accounts` only during a supervised credentials audit. Reports are written under `data/blog-repair/production-cms-gcs-repair-*.json`.

If repair is blocked by expired credentials or missing Cloud Run permission, run:

```bash
gcloud auth login altoslab.offical@gmail.com --force --brief
gcloud auth application-default login altoslab.offical@gmail.com
npm run blog:repair-production -- --base-url https://altoslab-ai.cc --apply
npm run verify:gcp -- --base-url https://altoslab-ai.cc
```

Keep `ALTOS_BLOG_LEGACY_GCP_REPAIR` unset for routine production. Set it only inside an explicit supervised legacy GCP recovery.

## Domain Cutover

目前 `altoslab-ai.cc` 是 canonical production domain and is served by the AWS ECS/S3 lane. Any future GCP or Cloudflare migration must be preview-first and cannot become production until `/`, `/blog`, `/admin`, `/api/health`, feed, sitemap, `llms.txt`, GA/GTM and image URLs pass.

Keep `~/.altoslab-blog-worker.env` on `ALTOS_BLOG_BASE_URL=https://altoslab-ai.cc`. Use legacy Worker or Cloud Run URLs only for isolated diagnostics, never as the acceptance truth.

## Required Production Environment Variables

Set these in the AWS ECS task definition / local worker env for the active production path. Cloudflare and GCP values are legacy recovery only and should stay inactive unless a new migration is explicitly verified.

```env
NEXT_PUBLIC_SITE_URL=https://altoslab-ai.cc
NEXT_PUBLIC_GTM_ID=GTM-WJ96VR7V
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-5VSLFNVD28
GA4_PROPERTY_ID=<numeric-ga4-property-id>
SEARCH_CONSOLE_SITE_URL=https://altoslab-ai.cc/
GOOGLE_SITE_VERIFICATION=<google-search-console-token>
BING_SITE_VERIFICATION=<bing-webmaster-tools-token>
YANDEX_SITE_VERIFICATION=<optional-yandex-token>
YAHOO_SITE_VERIFICATION=<optional-yahoo-token>
PINTEREST_SITE_VERIFICATION=<optional-pinterest-token>
FACEBOOK_DOMAIN_VERIFICATION=<optional-meta-domain-token>
ADMIN_PASSWORD=<strong-password>
ADMIN_SESSION_TOKEN=<long-random-token>
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
BLOB_READ_WRITE_TOKEN=<vercel-blob-token>
BLOB_ACCESS=public
CMS_ENCRYPTION_KEY=<64-hex-random-secret>
CMS_STORAGE_KEY=altoslab:cms:v1
BLOG_TREND_SOURCES=<optional-comma-separated-rss-override>
AUTO_GENERATE_BLOG_COVERS=false
BLOG_IMAGE_PROVIDER=none
BLOG_IMAGE_STORE_BLOB=false
CRON_SECRET=<long-random-cron-secret>
BLOG_DISABLE_DEEPSEEK_CRON=true
BLOG_INGEST_HMAC_SECRET=<long-random-external-ingest-secret>
AUTO_PUBLISH_BLOG=true
CLOUDFLARE_D1_ENABLED=0
CLOUDFLARE_D1_BINDING=ALTOS_BLOG_D1
CLOUDFLARE_KV_ENABLED=0
CLOUDFLARE_KV_BINDING=ALTOS_BLOG_KV
CLOUDFLARE_R2_ENABLED=0
CLOUDFLARE_R2_BINDING=ALTOS_BLOG_R2
AWS_S3_STORAGE_ENABLED=1
AWS_REGION=ap-northeast-1
AWS_S3_BUCKET=altoslab-official-cms-487316829524
AWS_S3_CMS_KEY=cms/altoslab-cms-v1.json
GCS_STORAGE_ENABLED=0
GCS_BUCKET=
GCS_CMS_PATH=cms/altoslab-cms-v1.json
GCS_MEDIA_PREFIX=blog-generated
```

Notes:

- Google Analytics is routed through the official GTM container. Current production source confirms `GTM-WJ96VR7V` and GA4 measurement ID `G-5VSLFNVD28` on `https://altoslab-ai.cc`.
- `ADMIN_SESSION_TOKEN` should be at least 32 random bytes.
- Active production must report `cmsStorage.provider = aws-s3`. `cloudflare-*` and `gcs` providers are legacy/migration fallbacks only.
- AWS S3 stores encrypted CMS JSON when `CMS_ENCRYPTION_KEY` is configured. Generated blog covers are public website assets but are served through the site, not a public bucket URL.
- Vercel Blob, Cloudflare KV/D1 and GCS remain legacy fallback/migration surfaces. They are not normal production persistence.
- Upstash Redis is also supported and takes priority when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured. The token must be the standard write token, not the read-only token.
- Without Vercel Blob or Upstash env vars, production can still render seed content, but admin edits and contact leads will not persist.
- `AUTO_PUBLISH_BLOG=true` allows external Gemini/source-image/GPT browser article sets to publish automatically only after deterministic article quality, multilingual parity, source, SEO/GEO and image QA gates approve the full configured-language set. Fallback template output, malformed model output, thin content, missing sources, missing images, invalid HTTPS links, repeated covers or failed multilingual pairing stay draft/held.
- `BLOG_INGEST_HMAC_SECRET` protects `POST /api/admin/blog/ingest-set`, `POST /api/admin/blog/release-set` and `POST /api/admin/blog/media`. The local worker must use the same secret in `~/.altoslab-blog-worker.env`.
- External publishing clients must follow `docs/content/blog-api-publishing-spec.md`: upload generated media if needed, validate with signed `ingest-set?validateOnly=true`, then publish the same reviewed article set through signed `release-set`. Do not use generic admin CRUD routes as a publishing API.
- `BLOG_DISABLE_DEEPSEEK_CRON=true` keeps the legacy DeepSeek cron path disabled. DeepSeek can remain configured for manual/admin fallback work, but it is not part of the formal daily publishing pipeline.
- `CRON_SECRET` protects the legacy `/api/cron/blog-drafts` routes if they are manually invoked. Active AWS production should not schedule those routes for the formal blog workflow.
- Daily generation/publishing is local-first and production release-gated. Gemini writes only original column/feature source drafts in the dedicated Chrome Blog QA tab; market-news fast lane uses Codex/source-worker source-translation from verified source articles and does not require Gemini by default. GPT/ChatGPT generates original column/feature covers and 2-3 shared in-article visuals in the matching Blog QA tab. Market-news covers use credited source or official announcement images shared by every language. Codex/main-brain records the relevant lane evidence and signs a `qualityManifest`, and production writes only through `POST /api/admin/blog/release-set` after HMAC, content digest, configured-language completeness, publish metadata and image QA all pass. The older full `ingest-set?validateOnly=true` route remains the required dry-run diagnostic before release; release-time jobs must never generate fresh content. After a successful release, `scripts/verify-blog-release.mjs --manifest <runDir>/prepared-candidate.json` verifies the live URLs across configured languages, public/API quality metadata, protected admin readback when admin credentials are available, cover/content images, OG/Twitter images, RSS, sitemap and `llms.txt`.
- Active local scheduling runs through n8n; see `docs/n8n-local-control-plane.md`. The old blog LaunchAgent installed by `scripts/install-blog-launch-agent.sh` is a rollback path only and should not run alongside n8n. If rollback is needed, the installer refuses placeholder or test secrets and the LaunchAgent runs `scripts/blog-scheduled-runner.mjs --scheduled` at `08:10`, `09:10`, `09:14`, `10:15`, `11:15`, `12:15`, `13:15`, `13:40`, `14:15`, `14:40`, `14:44`, `17:15`, `18:15`, `19:20`, `20:15`, `20:20`, `20:24`, and `21:15` Asia/Taipei.
- The `09:04` and `16:04` runs are post-release follow-up windows for verification or one in-window release-gate retry.
- `08:10`, `13:40`, and `19:20` are prep checkpoints; `09:10`/`14:40`/`20:20` are publish checkpoints; hourly market checkpoints plus `market-fill` keep source-backed market news at a minimum of 8 complete 9-language groups per day with no daily upper cap.
- Publish checkpoints only execute release when a preflight-passed `ready` manifest exists. Market-scan checkpoints only create or refresh `awaiting_source_translation_production` manifests and never publish.
- It creates/reads prepared candidate manifests and fails closed; it does not operate Chrome by itself.
- The source registry controls the market-news source pool, not a hard article-count cap. Breaking posts prioritize latest official/trusted longform news and preserve source style; columns are three Gemini-approved original ALTOS LAB arguments per Taipei day, each released only when the same Gemini/GPT visual and release gates pass. `feature` remains a supported schema type, but it is not part of the current routine production mix.
- Every scheduled prep/release starts with `scripts/blog-sop-doctor.mjs`. It checks the local worker env, LaunchAgent calendar triggers, production `/api/health`, durable CMS status (`aws-s3` for the active path), disabled legacy DeepSeek cron, and release candidate readiness before the runner can proceed.
- `scripts/blog-scheduled-runner.mjs` writes compact doctor evidence into `data/blog-worker-runs/scheduled-runner.log` and includes the same summary in its JSON output, so a skipped or failed release has a traceable preflight reason.
- The scheduled runner skips outside the exact configured windows, uses a single local lock under `data/blog-worker-runs/.locks/`, and checks Chrome Memory Kit before new column browser-production prep. Market-scan windows do not recompute the 40-post backfill queue unless `ALTOS_BLOG_BACKFILL_ON_MARKET_SCAN=true` is explicitly set.
- `scripts/blog-scheduled-runner.mjs --backfill --target-posts 40` is a recovery helper for bringing every configured language up to a baseline, not a production limit. The planner calculates complete 9-language article sets for missing baseline posts and writes a fail-closed queue under `data/blog-backfill/<date>/`. Routine market scans continue beyond that baseline when source-verifiable longform news passes the source/image/QA gates.
- `scripts/blog-copy-refresh.mjs --patch <patch.json>` is the controlled way to refresh already-published article titles, excerpts and metadata. It logs in through the admin API, rejects public copy that leaks internal production terms, PATCHes only the four copy fields, and verifies public readback after the update.
- `/api/blog` is intentionally served with `Cache-Control: no-store, no-cache, must-revalidate`; title/excerpt checks should hit this endpoint with a cache-busting query when validating live copy.
- `BLOG_TREND_SOURCES` is optional. If unset, the app uses `lib/blog-source-registry.ts`, which includes official AI/product/search sources and trusted media. If set, it should contain only live RSS/Atom feeds.
- The formal publishing workflow must not use Openverse, Pexels, Pixabay, Unsplash, local fallback art or generic stock images for market news. Market-news covers use credited source/official images only; column/feature visuals use the ChatGPT/GPT browser evidence workflow and same-origin generated media.
- Search verification env vars are optional until the matching Search Console/Webmaster account provides the token. Once set and redeployed, the homepage and App Router pages emit the required verification meta tags.
- `GA4_PROPERTY_ID` should point to the GA4 property used by `G-5VSLFNVD28` for read-only reporting.
- `SEARCH_CONSOLE_SITE_URL` should be the exact domain prefix configured in Search Console (for example `https://altoslab-ai.cc/`), used by SEO/GEO report Data API calls.

## Vercel Project Settings

The repo root is a Next.js app. In Vercel Project Settings:

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: leave empty
- Root Directory: `.`

Do not use the old `public/vercel.json` static build config. It bypasses App Router routes and can make `/` return the stale `<title>altoslab-site2</title>`.

## Verification Checklist

Run locally before pushing:

```bash
npm run typecheck
npm run test:blog
npm run build:aws
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

After AWS production deploys:

```bash
curl -I https://altoslab-ai.cc/api/health
curl -I https://altoslab-ai.cc/rss.xml
npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3
```

Expected results:

- `/` returns 200 and preserves the original UI from `index.html`.
- `/admin` redirects to `/admin/login` when not signed in.
- `/api/health` reports `adminConfigured: true`, `integrations.externalBlogIngestConfigured: true`, `integrations.legacyDeepSeekCronDisabled: true`, `integrations.imageAwsS3StorageConfigured: true`, and `cmsStorage.provider = aws-s3` on active AWS production.
- AWS production smoke expects `/api/health` to report `cmsStorage.provider = aws-s3`, `adminConfigured: true`, `integrations.externalBlogIngestConfigured: true`, `integrations.legacyDeepSeekCronDisabled: true`, `integrations.imageAwsS3StorageConfigured: true`, `GTM-WJ96VR7V`, `G-5VSLFNVD28`, all nine blog languages, at least five market-scan windows, and non-empty bounded public `/api/blog`.
- `/blog` returns 200 and remains indexable.
- `/feed.xml` returns RSS XML for published blog posts.
- `/rss.xml` aliases the canonical RSS feed and returns the same RSS XML shape.
- `/llms.txt` returns a concise LLM-readable site map.
- `/llms-full.txt` returns expanded answer-engine context for services, projects and published articles.
- `/api/*` and `/admin/*` return `X-Robots-Tag: noindex, nofollow, noarchive`.
- `/api/admin/blog/ingest-set` returns 401 without signed ingest headers and supports `?validateOnly=true`.
- `/api/admin/blog/release-set` returns 401 without signed ingest headers and only accepts an approved `qualityManifest`, matching content digests, configured-language completeness, valid publish metadata and a fresh production image QA pass.
- Production smoke must cover five routes: unsigned 401, validate-only success, image QA failure held, content quality failure held, and complete configured-language publish success.
- `/api/cron/blog-drafts` returns 401 without `CRON_SECRET`; when `BLOG_DISABLE_DEEPSEEK_CRON=true`, authenticated calls return a skipped legacy response rather than generating official daily posts.

## SEO / GEO Release Checks

Before promoting a deployment, verify:

- Homepage source does not contain `altoslab-site2`.
- Homepage has canonical, OpenGraph/Twitter image, Organization and WebSite JSON-LD, RSS and LLM alternate links.
- Homepage and App Router pages expose Search Console/Webmaster verification meta tags when the corresponding verification env var is set.
- `/robots.txt` references `/sitemap.xml`, allows public pages and answer-engine crawlers, and disallows private admin/API surfaces.
- `/sitemap.xml` includes `/blog`, `/en/blog`, `/feed.xml`, `/llms.txt`, `/llms-full.txt`, projects and all published posts.
- Blog post `hreflang` clusters include the current language, the paired translation and `x-default` pointing to the zh-Hant article.
- FAQ JSON-LD appears only when the FAQ content is visible on the page.
- Published AI-assisted posts have visible source links, an approved quality review or human review, no fabricated claims, a direct GEO summary, bilingual parity, approved internal cover image and meaningful alt text.
- Blog pages include related-article internal links so topic clusters are crawlable.
- GTM dataLayer events are present for `cta_clicked`, `contact_form_submitted`, `lead_created`, `blog_post_viewed`, `blog_post_published`, `ai_blog_draft_generated` and `ai_referral_landing`.
- Available production logs or request traces show `[altos-ai-crawler]` entries for recognized AI crawler user agents.

## Content Operations

1. Log in at `/admin`.
2. Use the Blog CMS workbench to generate drafts, filter by language/status/review state, edit SEO/GEO fields, manage source links and run the publishing checklist.
3. Gemini/source-image/GPT browser-produced posts publish automatically only when the production quality gate approves the full zh-Hant/en/ja/ko/id/vi/th/ms/fil set and all covers pass image QA. If a post is held, review the listed quality issues before manual publishing.
4. Before manually publishing or overriding a held post, confirm:
   - SEO title and description are specific.
   - GEO summary directly answers the search intent.
   - Article body contains visible answer paragraphs, not only keywords.
   - Source links support trend claims.
   - FAQ answers are present in the article and mirrored in structured data.
   - Market-news cover image uses a non-reused source image with public credit URL and source-rights metadata; column/feature cover and 2-3 in-article images are generated through ChatGPT/GPT, stored in same-origin generated media, visually safe, topic-matched, shared across all language versions, and have accurate alt text plus public `coverCredit: "ALTOS LAB editorial visual"` for generated covers.
   - Public author is `Tommy` or `Ken`; public review copy uses ALTOS LAB editorial responsibility wording rather than AI-generation disclosure copy.
   - `qualityChecks.hasHumanReview=true` or `qualityChecks.hasQualityReviewerApproval=true`, and `reviewStatus=approved`.
5. Do not manually publish fallback template output without rewriting it into a real article.

## Rollback

If a deploy breaks production:

1. Use Vercel Deployments and promote the last known-good deployment.
2. Or revert the Git commit and push to `main`.
3. Verify `/api/health`, `/admin`, `/blog`, and the homepage immediately after rollback.
