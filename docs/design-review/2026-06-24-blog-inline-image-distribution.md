# Public UI Change Review Record

Change title: Blog inline images no longer stack after the same section
Date: 2026-06-24
Reviewer / approval source: Tommy production QA feedback in Codex session
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/blog/:slug`, `/:language/blog/:slug`

## Baseline Comparison

- What stays identical to the approved baseline: Blog index layout, article shell, header, navigation, typography, color tokens, card layout, AdSense slots, related articles, and image component styling stay unchanged.
- What changes intentionally: When multiple in-article images have the same `mid-article` placement and no explicit marker, the renderer distributes them across the article instead of stacking them after one section.
- Why this cannot be solved through data, API, caching, or automation logic: Existing published articles already contain repeated `mid-article` placements. Content markers help future articles, but the renderer also needs a stable fallback so older CMS data cannot create consecutive image blocks.

## Design Approval

- Approval source: Tommy reported consecutive images as a visible article-quality defect and asked for durable repair.
- Source-of-truth reference: Blog UI Stability Contract; article detail layout stays owned by `BlogArticle`.
- Product/design rationale: Inline images should pace a column's argument. Consecutive figures interrupt reading and make the article feel machine-assembled.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: yes, `scripts/blog-system-smoke.mjs`
- `npm test` result: pending in this change record; run before final release
- Desktop browser evidence: public readback verified updated title, 5 H2 sections, and image markers for `/blog/ai-multilingual-brand-consistency`
- Mobile browser evidence: pending Chrome extension QA if available
- Production smoke evidence after deploy: public API and page HTML readback verified after CMS patch

## Rollback Notes

- Files to revert: `components/BlogArticle.tsx`, `lib/blog-quality.ts`, `scripts/blog-system-smoke.mjs`
- Data or cache cleanup needed: restore prior CMS post copy if the editorial repair is rejected; refresh public blog cache.
