# ALTOS LAB Frontend Architecture

## Current Frontend Shape

The public homepage currently keeps the original static visual bundle:

- Public homepage route: `app/route.ts`
- Rendered source: root `index.html`
- SEO metadata wrapper: `app/route.ts`
- Main visual bundle mirrors: `altoslab-website.html`

Do not keep a `public/index.html` file. On Vercel it can take precedence over the
App Router root route and cause `/` to serve the stale static title instead of
the SEO metadata wrapper.

This is intentional. The homepage should not be replaced with a new React implementation unless the migration is explicitly approved and visually checked against the current page.

## Public UI Change Control

Non-design work must not change public UI. Content automation, n8n, SEO/GEO,
Cloudflare repair, direct-render optimization, contact form routing, chatbot
integration, cache repair, and backend/API work may change data and reliability
paths, but they must not change homepage layout, Blog index layout, article
layout, header/navigation, language switcher, sidebar, typography, spacing,
visual tokens, or public route/component ownership.

If a fix would touch protected UI surfaces, treat that as a separate UI/design
change and require explicit approval, docs, smoke-test updates, and browser
evidence before deploy.

Current approved public UI baseline: commit `1ae34d3c2f931836226a2bf1528ae408a335c5e0` is the source of truth for future protected UI work. The review flow lives in `docs/design-review/current-approved-baseline.md`; protected UI changes must add a new `docs/design-review/*.md` record and pass `npm run review:design`.

WonDa runtime ownership: `components/WonDaWidgetScript.tsx`, `app/route.ts`, `scripts/sync-cloudflare-homepage.mjs`, and `cloudflare/blog-html-direct-worker.js` must share one public Widget script/channel/API contract. `app/api/wonda/[...path]/route.ts` remains the same-origin browser proxy and multilingual response guard. A channel cutover may change only these runtime values and their smoke assertions; it must not change public Widget placement or surrounding page structure.

Runtime routing differs only at the API hop: AWS/custom-domain and Cloudflare builds use the same-origin `https://altoslab-ai.cc/api/wonda` guard, while Vercel deployments use the direct WonDa Vercel API because `altoslab-ai.cc` is still served by AWS. This branch is explicit through `process.env.VERCEL` and covered by the Widget smoke.

## Homepage UI Stability Contract

The homepage route is a wrapper, not a redesign surface.

- `/` -> `app/route.ts` -> root `index.html` locally, with metadata injected in Node runtime.
- Cloudflare `/` -> `app/route.ts` -> static asset `/altoslab-homepage`, returned directly without request-time HTML rewriting.
- `scripts/sync-cloudflare-homepage.mjs` keeps `public/altoslab-homepage.html` aligned with `index.html` and injects homepage metadata before Cloudflare builds.

Allowed homepage wrapper changes:

- SEO title and metadata.
- Search verification tags.
- JSON-LD.
- GA/GTM snippets.
- No-script SEO fallback.
- A quiet bottom trust-links strip for AdSense/site-review readiness, linking to About, Contact, Editorial Policy, Privacy and Terms. This strip must stay outside the homepage hero/header/content system and must not replace the approved homepage UI.

Forbidden homepage wrapper changes:

- Injecting a replacement header, nav, CTA bar, visible layout CSS, or visual JavaScript.
- Hiding the original `nav.fixed.top-0`.
- Serving `components/site/*` or `app/page.tsx` as `/`.
- Using Cloudflare `HTMLRewriter`, `response.text()`, or other request-time full-HTML rewriting to replace or stream-mutate homepage structure.

The protected markers are `<div id="root"></div>`, `fixed top-0`, `children:\`ALTOS\``, and `children:\`LAB\``. `scripts/homepage-ui-contract-smoke.mjs` enforces this contract, including the no request-time Cloudflare rewrite rule, and is part of `npm run test`.

Homepage CTA copy is also protected: the visible header/contact CTA must stay `合作洽談 ↗` in Traditional Chinese, the hero CTA must stay `開始合作 ↗`, and the React header English fallback must stay `Talk` unless a fresh designer-approved source changes it. Do not rewrite CTA copy as part of UI or automation cleanup.

## Active Next App Areas

These areas use the normal Next App Router surfaces and global CSS:

- Admin pages: `app/admin/*`
- Blog pages and APIs: `app/blog/*`, `app/en/blog/*`, `app/feed.xml/route.ts`, `app/llms.txt/route.ts`, `app/api/blog/*`
- Project pages and APIs: `app/projects/*`, `app/api/projects/*`
- Trust and policy pages: `app/about`, `app/contact`, `app/editorial-policy`, `app/privacy`, `app/terms`
- CMS/admin APIs: `app/api/admin/*`
- Contact API: `app/api/contact/route.ts`
- Blog AI automation: `app/api/admin/blog/generate/route.ts`, `app/api/cron/blog-drafts/route.ts`, `lib/blog-generation.ts`

`app/globals.css` imports `design/tokens.css`, so these pages can use the token contract immediately.

## Blog UI Stability Contract

The blog index routes are not emergency Worker-rendered pages. They are owned by the Next App Router and the canonical `BlogIndex` component:

- `/blog` -> `app/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/en/blog` -> `app/en/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/ja/blog`, `/ko/blog`, `/id/blog`, `/vi/blog`, `/th/blog`, `/ms/blog`, `/fil/blog` -> localized route pages -> `components/BlogIndex.tsx`

Cloudflare direct HTML rendering may serve article detail routes only:

- `/blog/:slug`
- `/:language/blog/:slug`

It must return `null` for `/blog` and `/:language/blog` so the original `BlogIndex` UI remains in control. Production builds also do not inject direct article HTML by default; article detail pages normally render through the Next `BlogArticle` / shared `SiteHeader` path. The direct article renderer is copied into the Cloudflare build only as an explicit emergency fallback when `ALTOS_ENABLE_DIRECT_BLOG_HTML=1`. This is enforced by `scripts/blog-ui-contract-smoke.mjs`, which is part of `npm run test:blog`.

2026-06-14 New baseline note: the blog index/header and article detail shell were restored from the original `ALTOSLAB_WEB_MAIN` implementation. Direct Cloudflare rendering keeps article detail resilience and must not become a blog index renderer.

The production blog index reads compact D1 inventory projections in bounded chunks, because the Worker/D1 path can otherwise behave like a 20-row page. `/blog` and localized blog indexes should surface the full published archive through `BlogIndex` pagination, with 24 cards on each page by default.

On Cloudflare, the default unfiltered blog index must use a count + paged read: D1 `COUNT(*)` supplies the total archive count, while the card grid fetches only the current 24-post page. Feed, LLM metadata, public API smoke checks, and sitemap generation should also avoid full inventory JSON scans; sitemap generation uses lightweight slug/language/update columns.

Blog index article entry points are publication links, not app-shell controls.
`BlogIndex` and `BlogIndexLite` use native `<a href>` links for article image,
title, and read-more targets so `/blog -> /blog/:slug` follows a predictable
document navigation path. Tag filters, search, pagination, and language menus
may remain App Router interactions, but article opening must not depend on a
client-side transition when production user-path evidence shows stalls.

Article detail rendering has a shared visual contract across Next and the direct Worker renderer:

- The direct Worker article header must mirror the Blog shell `SiteHeader` structure: `site-nav`, centered main navigation, `site-nav-actions`, `site-language-toggle`, language trigger, mobile menu trigger, and labeled CTA.
- The Cloudflare direct renderer and `/api/blog-html` renderer both use a Blog-main-style `siteHeaderHtml(...)` helper. The older standalone `.nav` / `.langs` article header is retired.
- Default production article routes should not include `x-altos-direct-blog-render`; that header means the emergency direct renderer is active.
- Hero/title/meta stays left aligned with compact top spacing.
- Article cover media must keep a stable 1200:630 box with centered crop. This
  protects source and generated covers from causing distorted hero imagery or
  large blank gaps between hero, summary, ads and body content.
- In-article images are pacing devices, not a gallery block. Article bodies
  should use explicit `[IMAGE:opening]`, `[IMAGE:mechanism]`, or
  `[IMAGE:synthesis]` markers when possible. If legacy CMS content supplies
  repeated `mid-article` placements without markers, `BlogArticle` distributes
  the figures across the article instead of stacking consecutive images after
  one section.
- Legacy marker names from older production writers, including
  `[IMAGE:evidence-desk]`, `[IMAGE:source-desk]`, `[IMAGE:operating-loop]`,
  and `[IMAGE:repair-scene]`, are renderer aliases for the current opening and
  mechanism figure slots. Quality repair must normalize those markers back to
  `[IMAGE:opening]` and `[IMAGE:mechanism]` before release.
- `geo-summary`, `article-takeaways`, `strong`, and `blockquote` use black text plus restrained signal-lime `#c8ff00` underline or side-marker styling. Takeaway highlights should fit the text, not fill the row.
- Cloudflare builds must clean stale Next artifacts before generating OpenNext output, and deploy preflight must inspect the built CSS chunks so the reduced article title scale and inline signal-lime takeaway treatment cannot regress during publish.
- The retired purple article accent must not appear in direct-rendered article pages.
- Data cleanup and market-news automation must fix content/source correctness without changing article layout or visual tokens.

Do not use `BlogIndexLite`, `renderIndex`, direct `list_json` Worker queries, or a replacement static index to solve Worker CPU issues. The accepted approach is to optimize the canonical `BlogIndex` path, paginate inventory, or improve Cloudflare data access without changing route ownership.

## Blog AdSense Architecture

AdSense support for Blog is intentionally split into a global head script and opt-in manual ad unit slots.

Ownership:

- AdSense client validation and head snippets live in `lib/analytics.ts`.
- Blog manual slot configuration lives in `lib/blog-adsense.ts`.
- React slot rendering and `adsbygoogle.push({})` initialization live in `components/BlogAdSlot.tsx`.
- Canonical Blog index placement is rendered by `components/BlogIndex.tsx`.
- Canonical Blog article placements are rendered by `components/BlogArticle.tsx`.
- `/api/blog-html` string rendering must use `blogAdSlotHtml(...)` from `lib/blog-adsense.ts`.
- Cloudflare emergency direct article rendering must keep a local equivalent of the same placement names.

Environment contract:

- `NEXT_PUBLIC_ADSENSE_CLIENT`: AdSense publisher client, e.g. `ca-pub-...`.
- `NEXT_PUBLIC_ADSENSE_BLOG_ADS_ENABLED`: optional manual-slot kill switch; false-like values disable all Blog manual units.
- `NEXT_PUBLIC_ADSENSE_BLOG_INDEX_SLOT`: feed-column unit for `/blog` and localized index routes.
- `NEXT_PUBLIC_ADSENSE_BLOG_AFTER_SUMMARY_SLOT`: article unit after the GEO summary.
- `NEXT_PUBLIC_ADSENSE_BLOG_MID_ARTICLE_SLOT`: article body unit.
- `NEXT_PUBLIC_ADSENSE_BLOG_BEFORE_RELATED_SLOT`: article unit before related posts.

Rules:

- Missing or invalid slot ids must render no ad container.
- Slot ids must be numeric AdSense ad unit ids; do not hard-code them into components.
- Manual slots may not change Blog route ownership, replace content sections, or introduce sticky/overlay formats.
- Keep `npm run test:adsense` in the default test chain so AdSense env, `ads.txt`, Blog slots, and direct renderer support remain covered.

## AdSense Review Trust Layer

AdSense site approval depends on more than the ad script. The public site must expose durable trust and policy surfaces:

- `components/site/TrustPage.tsx` owns the shared utility-page layout.
- `/about`, `/contact`, `/editorial-policy`, `/privacy`, and `/terms` are App Router pages using the shared layout.
- `components/site/SiteFooter.tsx` links to the trust pages across Blog, project and utility pages.
- `app/route.ts` injects a small static `altos-trust-links` strip into the homepage HTML response because `/` is served from the static bundle rather than `SiteFooter`.
- `app/sitemap.ts` includes the trust pages.
- `scripts/adsense-smoke.mjs` guards AdSense client, `ads.txt`, slot wiring, trust pages, footer links, sitemap entries and privacy cookie disclosures.

This layer should not become a marketing redesign. It exists to make ownership, editorial policy, contact path, privacy disclosures and content responsibility obvious to users, crawlers and AdSense reviewers.

## Inactive Prototype Components

The repo currently contains `components/site/*` from a previous homepage modularization attempt. They are not the public homepage route right now.

Rules:

- Do not wire `components/site/*` to `/` without explicit approval.
- Do not recreate `app/page.tsx` for the homepage as a shortcut.
- If a future migration happens, first recreate the exact current `index.html` layout and screenshot-compare desktop/mobile before shipping.

## Data Flow

The backend/database handoff should preserve the existing TypeScript models in `lib/types.ts`:

- `SitePage`
- `PageSection`
- `PageSectionItem`
- `Project`
- `BlogPost`
- `ContactLead`

The current CMS helpers remain useful for admin and future dynamic pages:

- `lib/cms.ts`
- `lib/cms-storage.ts`
- `lib/seed.ts`

Blog posts now include three native publishing lanes and AI-review fields:

- `language`: Olympus releases use `zh-Hant`, `zh-Hans`, or `en`; historical language values remain readable for compatibility
- `translationGroupId`: connects the three native variants for hreflang
- `sourceLinks`: visible sources for SEO/GEO and AI-generated drafts
- `reviewStatus`, `qualityChecks`, `aiDisclosure`: human review and trust controls
- `generationDate`: Taiwan-date idempotency for daily cron drafts

Route ownership stays on the shared Blog components: `/blog` is `zh-Hant`, `/zh-hans/blog` is `zh-Hans`, and `/en/blog` is `en`. No locale owns a separate layout.

## Design Tokens

Canonical token files:

- CSS variables: `design/tokens.css`
- DTCG-style exchange file: `design/tokens.json`
- Human-readable rules: `design/visual-tokens.md`

Token layers:

- Primitive: raw values like `--al-color-lime-500`.
- Semantic: UI roles like `--al-color-text-secondary`.
- Component: stable control choices like `--al-button-height-md`.
- Media: product image rules like `--al-project-gallery-max-images`.

Implementation rule:

- Components should use semantic tokens.
- Static `index.html` can keep hard-coded values until a controlled visual parity pass.
- Future replacements should be section-by-section, not a full homepage rewrite.

## Backend Handoff Notes

When connecting a database:

- Replace the storage implementation behind `lib/cms-storage.ts`.
- Keep `lib/cms.ts` as the public/admin data access boundary where possible.
- Keep `lib/types.ts` stable unless the backend schema truly changes.
- Gallery fields should support up to 15 images per project.
- Product detail fields should support cover image, gallery, metrics, tech tags, CTA URL, and YouTube URL.
