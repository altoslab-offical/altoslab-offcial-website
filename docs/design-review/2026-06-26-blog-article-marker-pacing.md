# Public UI Change Review Record

Change title: Blog article image marker compatibility and pacing repair
Date: 2026-06-26
Reviewer / approval source: Tommy production QA feedback, official Blog rendered-page review
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s):

- `/blog`
- `/blog/:slug`
- `/:language/blog/:slug`

## Baseline Comparison

- What stays identical to the approved baseline:
  - Blog index layout, article shell, header, sidebar, typography, visual tokens, card layout, and route ownership stay unchanged.
  - In-article images still render through the existing `BlogArticle` / direct HTML renderer path.
- What changes intentionally:
  - Legacy content markers such as `[IMAGE:evidence-desk]` and `[IMAGE:operating-loop]` now map to the current article figure slots.
  - Quality repair scripts normalize content-image marker placement so multiple article figures do not stack or appear as consecutive image blocks.
- Why this cannot be solved through data, API, caching, or automation logic:
  - Existing published posts include legacy marker names. Without renderer compatibility, images can fail to render in the intended body position and fall back to stacked output.
  - Content repair alone does not protect future legacy candidates; the renderer needs a compatibility layer and the quality gate needs an explicit pacing rule.

## Design Approval

- Approval source: Tommy reported consecutive/sticky article images and asked for a durable quality repair rather than a patch.
- Source-of-truth reference: `docs/FRONTEND_ARCHITECTURE.md` Blog UI Stability Contract.
- Product/design rationale:
  - In-article figures are reading aids, not a gallery block. Separating figures with substantial argument/evidence keeps long-form columns readable and reduces machine-generated feel.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: yes, `scripts/blog-system-smoke.mjs`
- `npm test` result: pending rerun after this record
- Desktop browser evidence: pending production QA
- Mobile browser evidence: pending production QA
- Production smoke evidence after deploy: pending deploy/readback

## Rollback Notes

- Files to revert:
  - `components/BlogArticle.tsx`
  - `lib/blog-html-render.ts`
  - `lib/blog-quality.ts`
  - `lib/cms.ts`
  - `scripts/blog-audit-ai-feeling.mjs`
  - `scripts/blog-codex-column-producer.mjs`
  - `scripts/blog-system-smoke.mjs`
  - `scripts/repair-column-image-spacing-audit-20260626.mjs`
  - `scripts/repair-market-metadata-audit-20260626.mjs`
  - `scripts/repair-zh-column-depth-20260626.mjs`
- Data or cache cleanup needed:
  - If rolled back, re-run public cache refresh so CMS projections and rendered article detail pages match the reverted renderer contract.
