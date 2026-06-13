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

Forbidden homepage wrapper changes:

- Injecting a replacement header, nav, CTA bar, visible layout CSS, or visual JavaScript.
- Hiding the original `nav.fixed.top-0`.
- Serving `components/site/*` or `app/page.tsx` as `/`.
- Using Cloudflare `HTMLRewriter`, `response.text()`, or other request-time full-HTML rewriting to replace or stream-mutate homepage structure.

The protected markers are `<div id="root"></div>`, `fixed top-0`, `children:\`ALTOS\``, and `children:\`LAB\``. `scripts/homepage-ui-contract-smoke.mjs` enforces this contract, including the no request-time Cloudflare rewrite rule, and is part of `npm run test`.

## Active Next App Areas

These areas use the normal Next App Router surfaces and global CSS:

- Admin pages: `app/admin/*`
- Blog pages and APIs: `app/blog/*`, `app/en/blog/*`, `app/feed.xml/route.ts`, `app/llms.txt/route.ts`, `app/api/blog/*`
- Project pages and APIs: `app/projects/*`, `app/api/projects/*`
- CMS/admin APIs: `app/api/admin/*`
- Contact API: `app/api/contact/route.ts`
- Blog AI automation: `app/api/admin/blog/generate/route.ts`, `app/api/cron/blog-drafts/route.ts`, `lib/blog-generation.ts`

`app/globals.css` imports `design/tokens.css`, so these pages can use the token contract immediately.

## Blog UI Stability Contract

The blog index routes are protected user-facing editorial surfaces. They are owned by the canonical `BlogIndex` component and must keep the no-sidebar ALTOS LAB Journal layout:

- `/blog` -> `app/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/en/blog` -> `app/en/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/ja/blog`, `/ko/blog`, `/id/blog`, `/vi/blog`, `/th/blog`, `/ms/blog`, `/fil/blog` -> localized route pages -> `components/BlogIndex.tsx`

Cloudflare direct HTML rendering may serve article detail routes:

- `/blog/:slug`
- `/:language/blog/:slug`

It may also serve a Worker-safe D1 index for `/blog` and `/:language/blog`, but that direct HTML must preserve the same canonical Journal markers: `blog-journal-index`, `blog-index-hero`, `blog-lane-strip`, `blog-index-toolbar`, `blog-index-grid`, and `blog-card`. It must not render `blog-craft-sidebar`, `blog-craft-layout`, visible `AI & Craft` sidebar copy, `BlogIndexLite`, or `blog-lite-*` emergency UI. This is enforced by `scripts/blog-ui-contract-smoke.mjs`, which is part of `npm run test:blog`.

Do not use `BlogIndexLite`, direct `list_json` Worker queries, the old `AI & Craft` sidebar, or a replacement static index to solve Worker CPU issues. The accepted approach is to optimize the canonical `BlogIndex` path, keep pagination bounded, and keep the Cloudflare direct index visually equivalent to the canonical Journal surface.

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

Blog posts now include bilingual and AI-review fields:

- `language`: `zh-Hant` or `en`
- `translationGroupId`: connects bilingual pairs for hreflang
- `sourceLinks`: visible sources for SEO/GEO and AI-generated drafts
- `reviewStatus`, `qualityChecks`, `aiDisclosure`: human review and trust controls
- `generationDate`: Taiwan-date idempotency for daily cron drafts

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
