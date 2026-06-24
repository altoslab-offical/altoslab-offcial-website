# Public UI Change Review Record

Change title: AdSense trust and policy pages
Date: 2026-06-24
Reviewer / approval source: Tommy request to optimize ALTOS LAB for AdSense resubmission after low-value-content rejection
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/`, `/about`, `/contact`, `/editorial-policy`, `/privacy`, `/terms`, `/blog`

## Baseline Comparison

- What stays identical to the approved baseline:
  - Homepage hero, header, CTA wording, portfolio, team, contact section and visual composition stay owned by the existing static homepage bundle.
  - Blog index and article layout stay owned by the current Blog shell.
  - No homepage replacement component, no new top navigation redesign, no ad placement redesign.
- What changes intentionally:
  - Add standalone trust pages for About, Contact, Editorial Policy, Privacy and Terms.
  - Add footer links to those pages in the React site shell.
  - Inject one small bottom trust-links strip into the static homepage response so crawlers and AdSense reviewers can discover the pages from `/`.
  - Add the trust pages to `sitemap.xml`.
- Why this cannot be solved through data, API, caching, or automation logic:
  - AdSense rejected the site for low-value-content readiness. The missing surface is public accountability and policy context, which must be visible, crawlable and linkable.

## Design Approval

- Approval source: Tommy explicitly asked to fix the AdSense approval blocker and optimize the official site for review.
- Source-of-truth reference: Google AdSense site readiness guidance plus existing ALTOS LAB design contracts in `SPEC.md`, `DESIGN.md`, and `docs/FRONTEND_ARCHITECTURE.md`.
- Product/design rationale:
  - A publication-like AI journal needs visible ownership, correction path, editorial standards, privacy disclosures and terms.
  - The trust pages use a quiet editorial utility layout so they strengthen credibility without changing the main brand experience.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: `scripts/homepage-ui-contract-smoke.mjs` and `scripts/adsense-smoke.mjs`
- `npm test` result: pass locally on 2026-06-24
- Desktop browser evidence: pending after deploy
- Mobile browser evidence: pending after deploy
- Production smoke evidence after deploy: pending after deploy

## Rollback Notes

- Files to revert:
  - `app/about/page.tsx`
  - `app/contact/page.tsx`
  - `app/editorial-policy/page.tsx`
  - `app/privacy/page.tsx`
  - `app/terms/page.tsx`
  - `components/site/TrustPage.tsx`
  - `components/site/SiteFooter.tsx`
  - `app/route.ts`
  - `app/sitemap.ts`
  - `app/globals.css`
  - `scripts/adsense-smoke.mjs`
  - `scripts/homepage-ui-contract-smoke.mjs`
- Data or cache cleanup needed:
  - Redeploy the previous ECS task definition and allow public cache to refresh.
