# Public UI Change Review Record

Change title: WonDa ALTOS LAB demo channel runtime cutover
Date: 2026-07-29
Reviewer / approval source: Tommy explicitly requested the official website use the newly created demo account and pass end-to-end testing before release.
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/`, `/blog`, localized public blog pages, public App Router pages

## Baseline Comparison

- What stays identical to the approved baseline: homepage and Blog layout, shared header, Widget placement, launcher interaction, typography, spacing, visual tokens, mobile full-screen behavior, and all surrounding protected copy.
- What changes intentionally: the public Widget script origin, channel ID, and upstream API move from the retired Cloud Run runtime to the ALTOS LAB demo tenant on Cloudflare Workers plus the WonDa Vercel API. The launcher receives the ALTOS LAB accessible title and existing signal-lime brand color explicitly so it is correct before tenant configuration loads.
- Why this cannot be solved through data, API, caching, or automation logic: the homepage and direct Cloudflare blog renderer compile the public Widget source and channel into generated HTML, while the same-origin proxy compiles its upstream API target.

## Design Approval

- Approval source: Tommy's 2026-07-29 production integration request.
- Source-of-truth reference: `docs/design-review/current-approved-baseline.md` and `docs/wonda/web-widget-integration.md`.
- Product/design rationale: connect the requested tenant without altering the approved public presentation or adding a second launcher.

## Required Evidence

- `SPEC.md` updated: yes, runtime and public-secret boundary recorded.
- `DESIGN.md` updated: yes, visual invariants recorded.
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes, shared runtime ownership recorded.
- Smoke guard updated: `scripts/homepage-ui-contract-smoke.mjs` and `scripts/wonda-widget-smoke.mjs` assert the new public channel and runtime.
- `npm test` result: PASS on 2026-07-29, including design review, typecheck, homepage, Blog, Widget, and AdSense guards; `npm run build:aws` also passed. The release also pins Next.js 16.2.12, aligns `@next/third-parties`, updates Wrangler, and overrides the audited vulnerable transitive packages; `npm audit --omit=dev` reports zero vulnerabilities.
- Desktop browser evidence: `2026-07-29-wonda-desktop-local.png` and `2026-07-29-wonda-desktop-production.png`; the skeptical price/three-day-promise flow used grounded ALTOS LAB policy and did not leak WonDa plans.
- Mobile browser evidence: `2026-07-29-wonda-mobile-local.png` and `2026-07-29-wonda-mobile-production.png`; the Widget measured 390 × 844 after its entrance animation.
- Production smoke evidence after deploy: PASS on `https://altoslab-ai-wonda.vercel.app` for homepage, Blog presence, admin exclusion, grounded answer, handoff, feedback, close/reopen, mobile, and network-error recovery. The AWS ECS custom-domain release remains blocked until the correct account `487316829524` has an authenticated `altoslab` AWS CLI v2 profile; the only current local AWS credentials belong to account `108964701175` and were not used.

The nine-language live smoke passed through the website proxy after two false-positive QA gaps were fixed: English `website` questions no longer classify as Indonesian, and Filipino requires Filipino-specific language markers rather than generic `website/support` words.

## Rollback Notes

- Files to revert: the runtime constants, proxy upstream, smoke assertions, integration doc, and this review record in the release commit.
- Data or cache cleanup needed: purge/rebuild the generated Cloudflare homepage asset if that runtime is promoted; AWS rollback uses the preceding ECS task definition.
