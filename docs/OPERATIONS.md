# ALTOS LAB 官網維運手冊

## Production URLs

- Vercel production alias: https://altoslab-offcial-website.vercel.app
- Target custom domain: https://altoslab.com
- Admin: `/admin`
- Blog: `/blog`
- Health check: `/api/health`

## Domain Cutover

目前 `altoslab.com` 和 `www.altoslab.com` 仍指向 Netlify。要讓正式網域吃到 Vercel 版本，DNS 需要切到 Vercel 專案顯示的值。

Typical Vercel values:

- Apex `altoslab.com`: A record `76.76.21.21`
- `www.altoslab.com`: CNAME `cname.vercel-dns-0.com` or the value shown in Vercel Domains

Always confirm the exact records in Vercel Project Settings -> Domains before changing DNS.

## Required Production Environment Variables

Set these in Vercel Project Settings -> Environment Variables -> Production, then redeploy:

```env
NEXT_PUBLIC_SITE_URL=https://altoslab.com
NEXT_PUBLIC_GTM_ID=GTM-WJ96VR7V
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
AUTO_GENERATE_BLOG_COVERS=true
BLOG_IMAGE_PROVIDER=openverse
OPENVERSE_API_BASE_URL=https://api.openverse.engineering/v1
PEXELS_API_KEY=<optional-pexels-key>
PIXABAY_API_KEY=<optional-pixabay-key>
BLOG_IMAGE_STORE_BLOB=true
CRON_SECRET=<long-random-cron-secret>
BLOG_DISABLE_DEEPSEEK_CRON=true
BLOG_INGEST_HMAC_SECRET=<long-random-external-ingest-secret>
AUTO_PUBLISH_BLOG=true
BLOG_ALLOW_LOCAL_FALLBACK_COVERS=0
```

Notes:

- Google Analytics is routed through the official GTM container. Current official tracking IDs:
  - GTM account: `ALTOS LAB` (`6358339921`)
  - GTM container: `altoslab-ai.cc` / `GTM-WJ96VR7V` (`254100713`)
  - GTM live version: `2` / `GA4 base tag`
  - GA4 property: `ALTOS LAB Official Website` (`539513224`)
  - GA4 web stream: `14979358723`
  - GA4 measurement ID: `G-5VSLFNVD28`
- `ADMIN_SESSION_TOKEN` should be at least 32 random bytes.
- Vercel Blob is the default durable CMS store. `BLOB_READ_WRITE_TOKEN` is created when the `altoslab-cms` Blob store is linked to the Vercel project.
- The current Vercel Blob store is public-access, so `BLOB_ACCESS=public` and `CMS_ENCRYPTION_KEY` are required in production. CMS JSON is encrypted server-side before it is written to Blob.
- Upstash Redis is also supported and takes priority when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured. The token must be the standard write token, not the read-only token.
- Without Vercel Blob or Upstash env vars, production can still render seed content, but admin edits and contact leads will not persist.
- `AUTO_PUBLISH_BLOG=true` allows external Gemini + GPT/Codex article sets to publish automatically only after deterministic article quality, multilingual parity, duplicate-topic, source and image QA gates approve the full four-language set. Fallback template output, malformed model output, thin content, repeated topics, missing sources, missing images, invalid HTTPS links or failed multilingual pairing stay draft/held.
- `BLOG_INGEST_HMAC_SECRET` protects `POST /api/admin/blog/ingest-set` and `POST /api/admin/blog/media`. The local worker must use the same secret in `~/.altoslab-blog-worker.env`.
- `BLOG_DISABLE_DEEPSEEK_CRON=true` keeps the legacy DeepSeek cron path disabled. DeepSeek can remain configured for manual/admin fallback work, but it is not part of the formal daily publishing pipeline.
- `CRON_SECRET` protects the legacy `/api/cron/blog-drafts` routes if they are manually invoked. Vercel production should not schedule those routes for the formal blog workflow.
- Daily generation/publishing is now browser-first and fail-closed: Gemini writes/revises the article set in the ALTOS Blog QA Chrome group; ChatGPT/GPT generates the covers; Codex/worker uploads covers, calls production `validateOnly`, checks duplicate topics, and publishes only if production returns `wouldPublish: true`.
- Browser tabs used for Gemini/GPT production are opened or claimed only while needed, then closed or released after the run to avoid Chrome memory pressure.
- `BLOG_ALLOW_LOCAL_FALLBACK_COVERS=0` keeps programmatic/local cover generation out of production. Set it to `1` only for local fixture tests, never for formal blog publishing.
- Install the local LaunchAgent with `scripts/install-blog-launch-agent.sh` after `~/.altoslab-blog-worker.env` contains the real production `BLOG_INGEST_HMAC_SECRET`. The installer refuses placeholder or test secrets.
- The source registry controls the default mix: 40% `breaking`, 35% `column`, 25% `feature`. Breaking posts prioritize latest official/trusted news; columns turn fresh signals into operator decisions; features turn recent sources into durable frameworks.
- `BLOG_TREND_SOURCES` is optional. If unset, the app uses `lib/blog-source-registry.ts`, which includes official AI/product/search sources and trusted media. If set, it should contain only live RSS/Atom feeds.
- `BLOG_IMAGE_STORE_BLOB=true` copies selected legal cover images into Vercel Blob when `BLOB_READ_WRITE_TOKEN` is available. If Blob copy fails, the original licensed image URL stays in place and the issue is recorded in cover generation metadata.
- Search verification env vars are optional until the matching Search Console/Webmaster account provides the token. Once set and redeployed, the homepage and App Router pages emit the required verification meta tags.
- Performance monitoring is part of the publishing loop. After release, check GA/GTM events, Search Console indexing/query data, RSS/sitemap visibility and live image URLs; do not treat a successful publish response as proof that the article is performing.

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
npm run build
```

After Vercel deploys:

```bash
curl -I https://altoslab-offcial-website.vercel.app
curl https://altoslab-offcial-website.vercel.app/api/health
curl -I https://altoslab-offcial-website.vercel.app/admin
curl -I https://altoslab-offcial-website.vercel.app/blog
curl -I https://altoslab-offcial-website.vercel.app/en/blog
curl -I https://altoslab-offcial-website.vercel.app/feed.xml
curl -I https://altoslab-offcial-website.vercel.app/llms.txt
curl -I https://altoslab-offcial-website.vercel.app/llms-full.txt
curl -I https://altoslab-offcial-website.vercel.app/api/health
```

Expected results:

- `/` returns 200 and preserves the original UI from `index.html`.
- `/admin` redirects to `/admin/login` when not signed in.
- `/api/health` reports `adminConfigured: true`, `integrations.externalBlogIngestConfigured: true`, `integrations.legacyDeepSeekCronDisabled: true`, and `cmsStorage.provider` as `vercel-blob` or `upstash-redis` in production.
- `/blog` returns 200 and remains indexable.
- `/feed.xml` returns RSS XML for published blog posts.
- `/llms.txt` returns a concise LLM-readable site map.
- `/llms-full.txt` returns expanded answer-engine context for services, projects and published articles.
- `/api/*` and `/admin/*` return `X-Robots-Tag: noindex, nofollow, noarchive`.
- `/api/admin/blog/ingest-set` returns 401 without signed ingest headers and supports `?validateOnly=true`.
- Production smoke must cover five routes: unsigned 401, validate-only success, image QA failure held, content quality failure held, and complete four-language publish success.
- `/api/cron/blog-drafts` returns 401 without `CRON_SECRET`; when `BLOG_DISABLE_DEEPSEEK_CRON=true`, authenticated calls return a skipped legacy response rather than generating official daily posts.

## SEO / GEO Release Checks

Before promoting a deployment, verify:

- Homepage source does not contain `altoslab-site2`.
- Canonical host checks are clean:
  - `https://altoslab-ai.cc/*` public pages return `200`.
  - `https://www.altoslab-ai.cc/*` public pages and metadata endpoints redirect to the apex host with `308`.
  - `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/llms.txt`, `/llms-full.txt` and `/manifest.webmanifest` do not serve duplicate `www` metadata.
  - In Search Console, "Page with redirect" is acceptable only for alternate host URLs such as `www`; canonical apex URLs should remain indexable.
- Homepage has canonical, OpenGraph/Twitter image, Organization and WebSite JSON-LD, RSS and LLM alternate links.
- Homepage and App Router pages expose Search Console/Webmaster verification meta tags when the corresponding verification env var is set.
- `/robots.txt` references `/sitemap.xml`, allows public pages and answer-engine crawlers, and disallows private admin/API surfaces.
- `/sitemap.xml` includes `/blog`, `/en/blog`, `/feed.xml`, `/llms.txt`, `/llms-full.txt`, projects and all published posts.
- Blog post `hreflang` clusters include the current language, the paired translation and `x-default` pointing to the zh-Hant article.
- FAQ JSON-LD appears only when the FAQ content is visible on the page.
- Published AI-assisted posts have visible source links, an approved quality review or human review, no fabricated claims, a direct GEO summary, bilingual parity, approved internal cover image and meaningful alt text.
- Blog pages include related-article internal links so topic clusters are crawlable.
- GTM dataLayer events are present for `cta_clicked`, `contact_form_submitted`, `lead_created`, `blog_post_viewed`, `blog_post_published`, `ai_blog_draft_generated` and `ai_referral_landing`.
- Vercel logs show `[altos-ai-crawler]` entries for recognized AI crawler user agents.

## Content Operations

1. Log in at `/admin`.
2. Use the Blog CMS workbench to generate drafts, filter by language/status/review state, edit SEO/GEO fields, manage source links and run the publishing checklist.
3. Gemini + GPT/Codex-generated posts publish automatically only when the production quality gate approves the full zh-Hant/en/ja/ko set and all generated covers pass image QA. If a post is held, review the listed quality issues before manual publishing.
4. Before manually publishing or overriding a held post, confirm:
   - SEO title and description are specific.
   - GEO summary directly answers the search intent.
   - Article body contains visible answer paragraphs, not only keywords.
   - Source links support trend claims.
   - FAQ answers are present in the article and mirrored in structured data.
   - Cover image is generated through ChatGPT/GPT, stored in Vercel Blob, visually safe, topic-matched, and has accurate alt text plus editorial credit.
   - `qualityChecks.hasHumanReview=true` or `qualityChecks.hasQualityReviewerApproval=true`, and `reviewStatus=approved`.
5. Do not manually publish fallback template output without rewriting it into a real article.

## Rollback

If a deploy breaks production:

1. Use Vercel Deployments and promote the last known-good deployment.
2. Or revert the Git commit and push to `main`.
3. Verify `/api/health`, `/admin`, `/blog`, and the homepage immediately after rollback.
