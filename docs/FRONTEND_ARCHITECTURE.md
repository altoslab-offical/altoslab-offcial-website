# ALTOS LAB Frontend Architecture

## Current Frontend Shape

The public homepage currently keeps the original static visual bundle:

- Public homepage route: `app/route.ts`
- Rendered source: root `index.html`
- SEO metadata wrapper: `app/route.ts`
- Main visual bundle mirrors: `altoslab-website.html` and `public/index.html`

This is intentional. The homepage should not be replaced with a new React implementation unless the migration is explicitly approved and visually checked against the current page.

## Active Next App Areas

These areas use the normal Next App Router surfaces and global CSS:

- Admin pages: `app/admin/*`
- Blog pages and APIs: `app/blog/*`, `app/api/blog/*`
- Project pages and APIs: `app/projects/*`, `app/api/projects/*`
- CMS/admin APIs: `app/api/admin/*`
- Contact API: `app/api/contact/route.ts`

`app/globals.css` imports `design/tokens.css`, so these pages can use the token contract immediately.

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
