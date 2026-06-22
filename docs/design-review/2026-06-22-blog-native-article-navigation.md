# Public UI Change Review Record

Change title: Blog native article navigation
Date: 2026-06-22
Reviewer / approval source: Tommy request to repair slow `/blog` to article click path
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/blog`, localized blog indexes, `/blog/:slug`

## Baseline Comparison

- What stays identical to the approved baseline: Blog index layout, sidebar,
  search, card grid, typography, image treatment, pagination, article shell and
  visual tokens.
- What changes intentionally: Article card image, title and read-more links use
  native `<a href>` document navigation instead of App Router `Link`.
- Why this cannot be solved through data, API, caching, or automation logic:
  API and direct detail loads are fast, but Chrome user-path evidence showed the
  list-to-detail client transition could stall. The interaction contract must be
  stable at the UI link layer.

## Design Approval

- Approval source: Tommy explicitly prioritized real user click speed and asked
  for a durable product fix.
- Source-of-truth reference: `SPEC.md`, `DESIGN.md`,
  `docs/FRONTEND_ARCHITECTURE.md`.
- Product/design rationale: Blog behaves like a publication archive. Readers
  expect article entry points to open predictably; document navigation is the
  lowest-risk interaction for content-heavy public pages.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: `scripts/blog-ui-contract-smoke.mjs`
- `npm test` result: passed on 2026-06-22 after native navigation and fallback
  cover gate repair
- Desktop browser evidence: Chrome extension DOM-CUA verified local click path
  before deploy; production readback must stay in the existing Chrome group
- Mobile browser evidence: pending a separate mobile sweep
- Production smoke evidence after deploy: `verify:aws` passed on AWS S3 runtime;
  `blog:performance-smoke` passed on warmed public projection/detail cache

## Rollback Notes

- Files to revert: `components/BlogIndex.tsx`,
  `components/BlogIndexLite.tsx`, `scripts/blog-ui-contract-smoke.mjs`, this
  review record and the related docs lines.
- Data or cache cleanup needed: none.
