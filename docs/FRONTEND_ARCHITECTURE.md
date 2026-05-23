# ALTOS LAB Frontend Architecture

## Current Frontend Shape

The public homepage is now a modular Next App Router page:

- Route: `app/page.tsx`
- Page composition: `components/site/HomePage.tsx`
- Section components: `components/site/*`
- CMS data source: `lib/cms.ts` and `lib/seed.ts`
- Design token source: `design/tokens.css` and `design/tokens.json`
- Global implementation CSS: `app/globals.css`

The previous static bundle files remain in the repo as legacy artifacts:

- `index.html`
- `altoslab-website.html`
- `public/index.html`

They are no longer the primary homepage route.

## Component Boundaries

- `SiteHeader`: primary navigation and cooperation CTA.
- `HeroSection`: first viewport, CTA pair, system signal panel.
- `StatsBand`: KPI strip from `PageSection.items`.
- `AboutSection`: studio positioning copy.
- `ServicesSection`: service rows from `PageSection.items`.
- `PortfolioSection`: project grid and project modal from `Project[]`.
- `ProofSections`: why-us and team modules.
- `InsightsSection`: latest blog/SEO-GEO entries.
- `ContactSection`: cooperation copy and lead form.

## Data Flow

`app/page.tsx` reads:

- `getPublishedHomePage()`
- `getPublishedProjects()`
- `getPublishedBlogPosts()`

Only `published` records render on the public homepage.

The backend/database handoff should preserve the existing TypeScript models in `lib/types.ts`:

- `SitePage`
- `PageSection`
- `PageSectionItem`
- `Project`
- `BlogPost`
- `ContactLead`

## Design Tokens

Token layers:

- Primitive: raw values like `--al-color-lime-500`.
- Semantic: UI roles like `--al-color-text-secondary`.
- Component: stable control choices like `--al-button-height-md`.

Implementation rule:

- Components should use semantic tokens.
- `app/globals.css` imports `design/tokens.css`.
- `design/tokens.json` is the exchange format for future Figma / backend / design handoff work.

## Backend Handoff Notes

When connecting a database:

- Replace the storage implementation behind `lib/cms-storage.ts`.
- Keep `lib/cms.ts` as the public/admin data access boundary where possible.
- Keep `lib/types.ts` stable unless the backend schema truly changes.
- Gallery fields should support up to 15 images per project.
- Product pages and modals already read project gallery, metrics, tech tags, CTA URL, and YouTube URL from `Project`.
