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
ADMIN_PASSWORD=<strong-password>
ADMIN_SESSION_TOKEN=<long-random-token>
UPSTASH_REDIS_REST_URL=<upstash-rest-url>
UPSTASH_REDIS_REST_TOKEN=<upstash-rest-token>
CMS_STORAGE_KEY=altoslab:cms:v1
OPENAI_API_KEY=<optional-for-ai-blog-generation>
OPENAI_CONTENT_MODEL=gpt-5.2
```

Notes:

- `ADMIN_SESSION_TOKEN` should be at least 32 random bytes.
- `UPSTASH_REDIS_REST_TOKEN` must be the standard write token, not the read-only token.
- Without Upstash env vars, production can still render seed content, but admin edits and contact leads will not persist.

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
```

Expected results:

- `/` returns 200 and preserves the original UI from `index.html`.
- `/admin` redirects to `/admin/login` when not signed in.
- `/api/health` reports `adminConfigured: true` and `cmsStorage.provider: upstash-redis` in production.
- `/blog` returns 200 and remains indexable.

## Content Operations

1. Log in at `/admin`.
2. Keep generated blog posts as drafts until reviewed.
3. Before publishing a blog post, confirm:
   - SEO title and description are specific.
   - GEO summary directly answers the search intent.
   - Article body contains visible answer paragraphs, not only keywords.
   - FAQ answers are present in the article and mirrored in structured data.
4. Publish only after brand review.

## Rollback

If a deploy breaks production:

1. Use Vercel Deployments and promote the last known-good deployment.
2. Or revert the Git commit and push to `main`.
3. Verify `/api/health`, `/admin`, `/blog`, and the homepage immediately after rollback.
