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
- `npm test` result: pending in this run
- Desktop browser evidence: pending Chrome extension QA in `Official site Chrome review`
- Mobile browser evidence: pending Chrome extension/responsive QA in `Official site Chrome review`
- Production smoke evidence after deploy: pending AWS smoke + performance smoke

## Rollback Notes

- Files to revert: `app/globals.css`
- Data or cache cleanup needed: none
