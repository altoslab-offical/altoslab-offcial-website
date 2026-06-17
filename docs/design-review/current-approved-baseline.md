# ALTOSLAB Current Approved Public UI Baseline

Approved baseline date: 2026-06-18
Approved by: Tommy
Baseline commit: `1ae34d3c2f931836226a2bf1528ae408a335c5e0`
Reference URL: `https://altoslab-ai.cc/blog/codex-for-every-role-tool-and-workflow`

This baseline is the source of truth for future public UI/design work. Any
homepage, Blog index, Blog article shell, shared header/chrome, visual token,
spacing, typography, language switcher, contact CTA, or WonDa placement change
must start by comparing against this version.

## Protected Baseline

- Blog article pages use the Blog main shell header, not the old standalone
  article header.
- Article hero/title stays left aligned with the reduced desktop title scale:
  `clamp(34px, 3.25vw, 44px)`.
- `重點摘要`, `本文重點`, inline `strong`, and `blockquote` use black text with
  restrained signal-lime `#c8ff00` underline, highlight, or side-marker
  treatment.
- Takeaway highlights fit the text content and must not stretch as full-row
  bars.
- The old purple article accent is retired and must not return.
- Blog index routes stay on the canonical `BlogIndex` / `blog-craft` layout and
  must not be replaced by an emergency Worker-rendered index.

Machine-readable review markers:

- reduced article title scale
- inline signal-lime takeaway emphasis
- Blog main shell header
- no legacy purple article accent

## Required Review Flow

Before changing any protected public UI surface:

1. Create a new review record from
   `docs/design-review/change-record-template.md`.
2. Cite this baseline commit and the affected production/local URL.
3. Explain why the change is necessary and what is intentionally different from
   the baseline.
4. Update `SPEC.md`, `DESIGN.md`, and `docs/FRONTEND_ARCHITECTURE.md`.
5. Update the relevant smoke guard:
   `scripts/homepage-ui-contract-smoke.mjs` or
   `scripts/blog-ui-contract-smoke.mjs`.
6. Run `npm test`.
7. Capture desktop and mobile browser evidence before deploy.

`npm run review:design` enforces this flow for protected public UI file changes.
