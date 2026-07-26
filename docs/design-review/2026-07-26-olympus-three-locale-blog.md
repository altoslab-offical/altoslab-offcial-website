# Public UI Change Review Record

Change title: Olympus three-locale Blog release parity
Date: 2026-07-26
Reviewer / approval source: Tommy requested the official website operate through OBX for company evaluation
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/blog`, `/zh-hans/blog`, `/en/blog`

## Baseline Comparison

- What stays identical to the approved baseline: shared `BlogIndex`, `BlogArticle`, header, layout, spacing, typography, cards, responsive behavior, and visual tokens.
- What changes intentionally: a simplified-Chinese route and native copy are added; new Olympus release sets are limited to `zh-Hant`, `zh-Hans`, and `en`.
- Why this cannot be solved through data, API, caching, or automation logic: a public canonical route and locale metadata are required for the `zh-Hans` member of a release set.

## Design Approval

- Approval source: current OBX product task and the workspace three-native-lane decision.
- Source-of-truth reference: existing approved Blog main shell and `blog-craft` components.
- Product/design rationale: locale parity without a forked design.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: `scripts/blog-ui-contract-smoke.mjs`
- `npm test` result: PASS on 2026-07-26 (design gate, typecheck, homepage, Blog, WonDa, and AdSense)
- Desktop browser evidence: same shared component contract; no visual token or layout change
- Mobile browser evidence: same shared component contract; no visual token or layout change
- Production smoke evidence after deploy: signed health readback and public route readback required

## Rollback Notes

- Files to revert: the `zh-hans` routes, locale-map entries, three-lane list, and Olympus integration routes in this change.
- Data or cache cleanup needed: none before the first `zh-Hans` publication; otherwise preserve published content and revert only after an explicit migration decision.
