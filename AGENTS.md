# ALTOS LAB Official Website Guardrails

This repository has protected public UI surfaces. Automation, content, SEO/GEO,
Cloudflare, n8n, contact form, chatbot, performance, data, and backend
optimization work must not change public UI unless Tommy explicitly asks for a
UI/design change in the current task.

## Public UI Change Control

Treat these as protected design surfaces:

- Homepage: `index.html`, `altoslab-website.html`, `app/route.ts`,
  `public/altoslab-homepage.html`, and the Cloudflare homepage sync path.
- Blog index: `/blog`, `/:language/blog`, `components/BlogIndex.tsx`, the
  `blog-craft-*` classes, sidebar, topic nav, search, card grid, pagination,
  imagery, and preview rhythm.
- Blog article shell: header, language menu, article hero/title layout,
  rich-text styling, takeaways, inline images, and `cloudflare/blog-html-direct-worker.js`.
- Shared public chrome: header, navigation, language switcher, contact CTA,
  WonDa widget placement, spacing, typography, and visual tokens.

If a non-design task appears to require changing these files or selectors, stop
and record the blocker instead of guessing. The safe default is to fix data,
rendering logic, API contracts, validation, caching, or automation flow without
altering layout or visual style.

## Required UI Evidence

Any intentional public UI/design change must include all of the following in
the same change:

- A clear designer/source-of-truth reference or explicit Tommy approval.
- Updates to `SPEC.md`, `DESIGN.md`, and `docs/FRONTEND_ARCHITECTURE.md`.
- Updated smoke guards in `scripts/homepage-ui-contract-smoke.mjs` or
  `scripts/blog-ui-contract-smoke.mjs` when protected markers change.
- Fresh `npm test` evidence.
- Desktop and mobile browser evidence for the affected public URL before
  claiming completion or deploying.

Do not deploy UI-affecting changes when those checks are missing or failing.
