# Blog AdSense Architecture Review

Change title: Blog AdSense opt-in slot architecture
Date: 2026-06-19
Reviewer / approval source: Tommy requested AdSense architecture work and narrowed scope to Blog in the current Codex thread.
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/blog`, `/:language/blog`, `/blog/:slug`, `/:language/blog/:slug`, `/ads.txt`

## Baseline Comparison

- What stays identical to the approved baseline: Blog route ownership, `BlogIndex` / `blog-craft` layout, `SiteHeader`, language switcher, article hero/title rhythm, editorial images, source links, author card, related posts, and WonDa widget.
- What changes intentionally: Adds opt-in manual AdSense slot infrastructure for Blog index and article pages. Slots render only when valid numeric env slot ids are configured.
- Why this cannot be solved through data, API, caching, or automation logic: AdSense manual ad units require page markup with `adsbygoogle` slots plus client-side initialization. The markup must be present in each renderer that can serve Blog article HTML.

## Design Approval

- Approval source: Current task request from Tommy: "整體架構優化到可以配合我們的 adsense", clarified as "blog 部分".
- Source-of-truth reference: Existing approved Blog UI baseline plus Google AdSense implementation requirements for head script, `ads.txt`, and ad unit markup.
- Product/design rationale: Keep monetization controllable and reversible without redesigning the Blog surface. Empty slot env vars produce no visible UI change.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: yes, `scripts/adsense-smoke.mjs`, `scripts/blog-direct-renderer-smoke.mjs`, and `scripts/blog-ui-contract-smoke.mjs`
- `npm test` result: pass on 2026-06-19
- Desktop browser evidence: not required before slot ids are configured because no ad container renders by default
- Mobile browser evidence: not required before slot ids are configured because no ad container renders by default
- Production smoke evidence after deploy: pass on 2026-06-19 with `npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3`; ECS service `altoslab-web-service` completed task definition `altoslab-official-website:6`

## Rollback Notes

- Files to revert: `lib/blog-adsense.ts`, `components/BlogAdSlot.tsx`, Blog ad slot insertions in `components/BlogIndex.tsx`, `components/BlogArticle.tsx`, `lib/blog-html-render.ts`, `cloudflare/blog-html-direct-worker.js`, AdSense smoke updates, env slot placeholders, and this review record.
- Data or cache cleanup needed: remove any configured `NEXT_PUBLIC_ADSENSE_BLOG_*_SLOT` values from deployment environment vars.
