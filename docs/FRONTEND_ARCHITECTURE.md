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

- `/` -> `app/route.ts` -> root `index.html` locally.
- Cloudflare `/` -> `app/route.ts` -> static asset `/altoslab-homepage`.
- `scripts/sync-cloudflare-homepage.mjs` keeps `public/altoslab-homepage.html` aligned with `index.html` before Cloudflare builds.

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
- Using Cloudflare `HTMLRewriter` to replace or stream-mutate homepage structure.

The protected markers are `<div id="root"></div>`, `fixed top-0`, `children:\`ALTOS\``, and `children:\`LAB\``. `scripts/homepage-ui-contract-smoke.mjs` enforces this contract and is part of `npm run test`.

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

The blog index routes are not emergency Worker-rendered pages. They are owned by the Next App Router and the canonical `BlogIndex` component:

- `/blog` -> `app/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/en/blog` -> `app/en/blog/page.tsx` -> `components/BlogIndex.tsx`
- `/ja/blog`, `/ko/blog`, `/id/blog`, `/vi/blog`, `/th/blog`, `/ms/blog`, `/fil/blog` -> localized route pages -> `components/BlogIndex.tsx`

Cloudflare direct HTML rendering may serve article detail routes only:

- `/blog/:slug`
- `/:language/blog/:slug`

It must return `null` for `/blog` and `/:language/blog` so the original `BlogIndex` UI remains in control. This is enforced by `scripts/blog-ui-contract-smoke.mjs`, which is part of `npm run test:blog`.

Do not use `BlogIndexLite`, `renderIndex`, direct `list_json` Worker queries, or a replacement static index to solve Worker CPU issues. The accepted approach is to optimize the canonical `BlogIndex` path, paginate inventory, or improve Cloudflare data access without changing route ownership.

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
