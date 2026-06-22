# Public UI Change Review Record

Change title: Blog article visual stability for performance repair
Date: 2026-06-22
Reviewer / approval source: Tommy requested full production repair for slow Blog article click path and poor cover/article spacing
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Affected URL(s): `/blog`, `/blog/openai-s-codex-can-now-watch-you-work-once-and-repeat-the-task-forever`

## Baseline Comparison

- What stays identical to the approved baseline: Blog route ownership, header, navigation, sidebar, card grid, article shell, typography scale, signal-lime article accent, language menu, WonDa placement.
- What changes intentionally: article cover box uses stable 1200:630 crop with centered `object-fit`; article cover and H2 spacing are tightened to remove large blank gaps.
- Why this cannot be solved through data, API, caching, or automation logic: the production issue included visible article spacing and image crop behavior, so the protected CSS surface needs a narrow visual-stability correction.

## Design Approval

- Approval source: Tommy's 2026-06-21 Chrome screenshots and follow-up request.
- Source-of-truth reference: `SPEC.md`, `DESIGN.md`, `docs/FRONTEND_ARCHITECTURE.md`.
- Product/design rationale: covers should look like editorial media, not distorted generated posters; article sections should remain readable without excessive gaps.

## Required Evidence

- `SPEC.md` updated: yes
- `DESIGN.md` updated: yes
- `docs/FRONTEND_ARCHITECTURE.md` updated: yes
- Smoke guard updated: existing `scripts/homepage-ui-contract-smoke.mjs` / Blog UI contract remains in the changed set
- `npm run typecheck`: passed on 2026-06-22
- `npm run test:blog`: passed on 2026-06-22
- `npm run build:aws`: passed on 2026-06-22
- `npm run verify:aws -- --base-url https://altoslab-ai.cc --expected-provider aws-s3`: passed on 2026-06-22, ECS task definition `altoslab-official-website:38`
- `node scripts/blog-performance-smoke.mjs --base-url https://altoslab-ai.cc`: passed after cache warmup; `/blog` TTFB 81ms, article detail TTFB 96ms, `/api/blog` TTFB 67ms
- Production HTML evidence: target article renders `codex-record-replay-governance-cover.png`; old `codex-record-replay-source-cover.png` and `large cursor shape` are absent
- Desktop Chrome extension evidence: extension can list the existing `Official site Chrome review` tab group and confirms Codex extension/native host installed, but `claimTab` / `selected()` intermittently closes the native pipe. Treat this as Chrome-extension tooling instability, not website production evidence.
- Mobile browser evidence: not completed in this repair pass because the Chrome extension runtime was unstable; repeat once extension tab control is stable.

## Rollback Notes

- Files to revert: public-cache/image-quality validation changes in `lib/cms.ts`, `lib/blog-quality.ts`, `lib/blog-image-quality.ts`, `components/SafeBlogImage.tsx`, release verifier/SOP/local-worker checks, and docs.
- Data rollback: use signed bulk-patch to restore the previous cover metadata if needed, or rollback ECS to the previous task definition revision.
