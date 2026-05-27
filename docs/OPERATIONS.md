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
NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX
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
DEEPSEEK_API_KEY=<required-for-ai-blog-generation>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_CONTENT_MODEL=deepseek-v4-pro
DEEPSEEK_MAX_TOKENS=7600
DEEPSEEK_TIMEOUT_MS=90000
BLOG_TREND_SOURCES=https://openai.com/news/rss.xml,https://blog.google/innovation-and-ai/technology/ai/rss/,https://deepmind.google/blog/rss.xml,https://huggingface.co/blog/feed.xml,https://feeds.feedburner.com/blogspot/amDG,https://vercel.com/blog/rss.xml
CRON_SECRET=<long-random-cron-secret>
AUTO_PUBLISH_BLOG=true
```

Notes:

- `ADMIN_SESSION_TOKEN` should be at least 32 random bytes.
- Vercel Blob is the default durable CMS store. `BLOB_READ_WRITE_TOKEN` is created when the `altoslab-cms` Blob store is linked to the Vercel project.
- The current Vercel Blob store is public-access, so `BLOB_ACCESS=public` and `CMS_ENCRYPTION_KEY` are required in production. CMS JSON is encrypted server-side before it is written to Blob.
- Upstash Redis is also supported and takes priority when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are configured. The token must be the standard write token, not the read-only token.
- Without Vercel Blob or Upstash env vars, production can still render seed content, but admin edits and contact leads will not persist.
- `AUTO_PUBLISH_BLOG=true` allows cron-generated posts to publish automatically only after the deterministic quality reviewer approves the bilingual pair. Fallback template output, malformed model output, thin content, missing sources, missing images, invalid HTTPS links or failed bilingual pairing stay draft/needs-revision.
- `CRON_SECRET` protects `/api/cron/blog-drafts`, `/api/cron/blog-drafts/morning` and `/api/cron/blog-drafts/afternoon`.
- Vercel Cron runs once daily: `0 1 * * *` UTC = 09:00 Asia/Taipei. The scheduled job creates one bilingual zh/en article pair, publishes only if the quality gate passes, and is idempotent by `generationDate + generationSlot`. The afternoon endpoint remains available for authenticated manual QA, but it is not scheduled.
- `DEEPSEEK_CONTENT_MODEL=deepseek-v4-pro` is the recommended default when article quality is the priority. `deepseek-v4-flash` can be used for faster lower-cost drafting, but production auto-publishing should keep the quality gate enabled either way.
- `DEEPSEEK_MAX_TOKENS=7600` gives the model enough room to return valid JSON and complete 4-6 section bilingual-quality drafts. The generator retries once with a stricter format-repair prompt if JSON validation fails.
- `DEEPSEEK_TIMEOUT_MS=90000` gives `deepseek-v4-pro` enough time to return complete article JSON. If cron reliability becomes more important than model depth, switch the model back to `deepseek-v4-flash` and keep the same quality gate.
- `BLOG_TREND_SOURCES` should contain only live RSS/Atom feeds. The generator samples across feeds in round-robin order so a daily draft can reference multiple AI/search sources instead of overfitting to the first feed.
- Search verification env vars are optional until the matching Search Console/Webmaster account provides the token. Once set and redeployed, the homepage and App Router pages emit the required verification meta tags.

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
- `/api/health` reports `adminConfigured: true` and `cmsStorage.provider` as `vercel-blob` or `upstash-redis` in production.
- `/blog` returns 200 and remains indexable.
- `/feed.xml` returns RSS XML for published blog posts.
- `/llms.txt` returns a concise LLM-readable site map.
- `/llms-full.txt` returns expanded answer-engine context for services, projects and published articles.
- `/api/*` and `/admin/*` return `X-Robots-Tag: noindex, nofollow, noarchive`.
- `/api/cron/blog-drafts` returns 401 without `CRON_SECRET`; `/api/cron/blog-drafts/morning` creates the scheduled zh/en pair, publishes only when `qualityReview.approved=true`, and reruns for the same Taiwan date + slot skip. `/api/cron/blog-drafts/afternoon` is available for authenticated manual QA.
- Authenticated dry-run checks are available with `?dryRun=1`. Dry-run runs source collection, DeepSeek generation and quality review, but does not write to CMS or publish.

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
- GTM dataLayer events are present for `cta_clicked`, `contact_form_submitted`, `lead_created`, `blog_post_viewed`, `blog_post_published` and `ai_blog_draft_generated`.

## Content Operations

1. Log in at `/admin`.
2. Use the Blog CMS workbench to generate drafts, filter by language/status/review state, edit SEO/GEO fields, manage source links and run the publishing checklist.
3. Cron-generated posts publish automatically only when the quality reviewer approves the bilingual pair. If a post is held as `needs-revision`, review the listed quality issues before manual publishing.
4. Before manually publishing or overriding a held post, confirm:
   - SEO title and description are specific.
   - GEO summary directly answers the search intent.
   - Article body contains visible answer paragraphs, not only keywords.
   - Source links support trend claims.
   - FAQ answers are present in the article and mirrored in structured data.
   - Cover image is one of the approved ALTOS LAB assets and alt text describes the article context.
   - `qualityChecks.hasHumanReview=true` or `qualityChecks.hasQualityReviewerApproval=true`, and `reviewStatus=approved`.
5. Do not manually publish fallback template output without rewriting it into a real article.

## Rollback

If a deploy breaks production:

1. Use Vercel Deployments and promote the last known-good deployment.
2. Or revert the Git commit and push to `main`.
3. Verify `/api/health`, `/admin`, `/blog`, and the homepage immediately after rollback.
