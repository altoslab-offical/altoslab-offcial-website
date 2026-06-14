# ALTOS LAB Website Design Guide

This project uses Ken's central Design Brain as reference:

```txt
/Users/kenhuang/Desktop/DesignAI/DESIGN-BRAIN.md
```

## Project Settings

Project name: ALTOS LAB Official Website
Product type: Corporate AI studio website
Reference DNA: Altoslab + dark technical SaaS influence
Primary audience: Taiwan/APAC business owners, operators, and teams evaluating AI implementation partners
Primary color: Signal lime `#C8FF00`
Accent color: System orange `#FF5500`
Background: Deep black / near-black technical canvas
Typography: Inter + Noto Sans TC fallback
Component base: Static homepage bundle served by `app/route.ts`; Next admin/project surfaces use CSS design tokens

## Design Positioning

ALTOS LAB should feel like an AI implementation studio with real engineering depth. The current site already has a strong dark, kinetic, technical direction: oversized wordmark, neon signal color, 3D AI blocks, thin data-wave lines, and sharp section rhythm.

Keep that direction. Do not flatten the brand into a generic black-and-white corporate page. Instead, make the current visual language more systematic through tokens, spacing, contrast rules, and repeatable component patterns.

## Visual Principles

- Lead with dark technical confidence: black canvas, high contrast type, restrained surfaces.
- Use signal lime only for primary CTA, active markers, key metrics, and small kinetic details.
- Use orange as a secondary AI/system accent, not a second competing CTA color.
- Keep decorative linework subtle. It should create motion and depth without reducing text readability.
- Prefer direct product/work evidence over vague AI imagery. Portfolio cards should show actual product states where possible.
- Maintain a professional studio tone: bold, crisp, engineered, but not noisy.

## Color System

Canonical tokens live in [design/tokens.css](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/tokens.css), [design/tokens.json](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/tokens.json), and [design/visual-tokens.md](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/visual-tokens.md).

Core colors:

- Background: `#030403`
- Surface: `#0A0A0A`
- Elevated surface: `#111111`
- Primary text: `#F7F7F2`
- Secondary text: `rgba(247, 247, 242, 0.68)`
- Muted text: `rgba(247, 247, 242, 0.44)`
- Signal lime: `#C8FF00`
- Signal lime hover: `#D7FF3F`
- System orange: `#FF5500`
- Border: `rgba(247, 247, 242, 0.12)`
- Focus ring: `rgba(200, 255, 0, 0.72)`

Usage rules:

- Lime should stay below roughly 8% of the viewport. It works best as a signal, not a background theme.
- Orange is reserved for system/agent/process accents and should not appear beside lime unless both have separate jobs.
- Do not use pure white for large text blocks on pure black if it creates glare. Use `--al-text` instead.
- Borders should be visible but quiet. Prefer translucent borders over gray blocks.

## Logo System

Logo assets live in [design/logo](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo).

- Logo kit rules: [README.md](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/README.md)
- Full logo guidelines: [logo-guidelines.md](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/logo-guidelines.md)
- Visual logo specimen: [logo-specimen.html](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/logo-specimen.html)
- Primary standalone lockup: [altoslab-logo-transparent.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo-transparent.svg)
- Signal lockup: [altoslab-logo-signal.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo-signal.svg)
- Horizontal lockup: [altoslab-logo-horizontal.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo-horizontal.svg)
- Mono lockup: [altoslab-logo-mono.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo-mono.svg)
- Mono horizontal lockup: [altoslab-logo-horizontal-mono.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo-horizontal-mono.svg)
- Brand scene specimen: [altoslab-logo.svg](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/logo/altoslab-logo.svg)

Use the standalone transparent lockups for design specs and implementation handoff. Use the horizontal lockup for tight header or footer placements. Use the brand scene specimen only when showing the logo inside its dark technical canvas. Use the mono logo only on light surfaces or documents where the lime signal mark would lose contrast. Keep at least `--al-logo-clearspace` around the logo and do not place it over busy images. Treat the local lime signal direction as an override to the older black-and-white Altoslab profile in Design Brain.

## Typography

Use `Inter` for Latin and `Noto Sans TC` / `PingFang TC` for Traditional Chinese.

Type roles:

- Display wordmark: oversized brand expression, used only for first viewport hero.
- Hero headline: large section-defining message.
- Section title: major page sections such as Services, Portfolio, Team, Contact.
- Card title: portfolio and service item headings.
- Body: service descriptions and company positioning.
- Caption: labels, metadata, eyebrow text.
- Tag: chips and dense uppercase labels.

Rules:

- Chinese body copy should not go below 14px.
- Use 16px body text for normal paragraphs.
- Keep uppercase tracking for labels only.
- Do not use negative letter spacing in this project; the existing geometric brand already creates enough tension.
- Avoid introducing decorative serif fonts. The brand should stay engineered and modern.

## Layout

- First viewport should immediately signal `ALTOS LAB`, AI studio positioning, primary CTA, and kinetic/3D visual identity.
- Keep section rhythm strong: hero, metrics, about, services, portfolio, why us, team, contact.
- Use full-width dark bands instead of nested cards.
- Portfolio items can be cards because they are repeated content units.
- Preserve generous vertical whitespace around major section headings.
- Mobile should prioritize readable copy and tap targets over maintaining desktop spectacle.

## Components

Buttons:

- Primary: lime fill, black text, compact arrow icon.
- Homepage header/contact CTA copy: Traditional Chinese `合作洽談 ↗`; React header English fallback `Talk`. The hero primary CTA remains `開始合作 ↗`.
- Secondary: transparent/dark surface with subtle border, light text.
- Hover: small brightness or border shift, 150-200ms.
- Focus: visible lime ring.

Cards:

- Portfolio cards may use image-first composition.
- Radius should stay at or below 8px unless preserving an existing pill CTA.
- Do not place cards inside cards.
- Use one clear title, one metadata tag, and one action affordance.

Product Detail:

- Product detail pages and product modals should be managed through backend data, not hard-coded page copy.
- Gallery media should support up to 15 photos per product.
- Product detail pages may include a full-width 16:9 YouTube embed row below the main overview/detail and metrics area.
- Overview and execution detail body copy should share one text color and align to the same left edge.
- Do not use gradients in product detail pages or product modals.
- Use solid black surfaces, translucent overlays, borders, dividers, image opacity, and spacing to create hierarchy.
- Text over imagery must use a solid or translucent overlay if needed; avoid gradient fades.

Navigation:

- Header should be quiet and functional.
- Primary CTA belongs on the right.
- Sticky/frosted nav is acceptable only if it does not obscure hero or section headings.

Metrics:

- Numeric values should be high contrast and large enough to scan quickly.
- Labels should remain compact and uppercase.

## Motion

- Micro-interactions: 150-200ms.
- Section reveals: 240-320ms.
- Hero kinetic background can move slowly, but text must remain stable.
- Respect `prefers-reduced-motion`.
- Avoid animation that delays CTA availability.

## Current Site Audit

Strengths:

- Strong first impression with a distinctive dark AI-studio identity.
- Clear CTA pair: project intro and cooperation/contact.
- Good section coverage for an agency/studio website.
- Portfolio has visual assets and concrete project names, which builds credibility.
- The lime signal color is memorable and already strongly associated with the brand.

Current architecture:

- The public homepage renders through `app/route.ts`, which reads the root `index.html` static bundle.
- `design/tokens.css` and `design/tokens.json` are the canonical token contract, but they should not force a visual rewrite of the current homepage.
- `app/globals.css` imports the tokens for admin, blog, project pages, and future component work.
- `components/site/*` exists as inactive prototype code and is not the public homepage route.

## Public UI Change Control

Public UI is locked by default. Automation, n8n, SEO/GEO, Cloudflare repair,
content publishing, contact form routing, chatbot integration, cache repair,
performance work, and backend/API optimization must not alter visible layout or
visual styling unless Tommy explicitly asks for a UI/design change.

Allowed non-design changes:

- Data correctness, content copy cleanup, validation gates, API behavior,
  health checks, caching, scheduling, and operational reliability.

Forbidden side effects:

- Replacing homepage or Blog layout.
- Changing header/navigation/language switcher behavior for visual reasons.
- Changing Blog sidebar, card grid, article hero/title rhythm, typography,
  spacing, images, visual tokens, or public component ownership.
- Rewriting `index.html`, `altoslab-website.html`, `app/globals.css`,
  `components/BlogIndex.tsx`, `components/site/*`, or
  `cloudflare/blog-html-direct-worker.js` as part of a non-design task.

Any intentional design change must cite the designer/source-of-truth reference,
update the relevant UI smoke guard, and include fresh desktop and mobile browser
evidence before deploy.

## Homepage UI Stability Contract

The homepage is a protected brand/design surface. Its canonical visual source is the original static bundle in `index.html`, mirrored to `public/altoslab-homepage.html` for Cloudflare assets by `scripts/sync-cloudflare-homepage.mjs`.

Route ownership:

- `/` is owned by `app/route.ts`, but only as a metadata and analytics wrapper around the existing static homepage HTML in local Node runtime.
- Cloudflare production must receive title, meta tags, JSON-LD, GA/GTM snippets, and no-script SEO fallback from the build-time `public/altoslab-homepage.html` asset, not request-time Worker string rewriting.
- `app/route.ts` must return the Cloudflare homepage asset directly in production to avoid Worker CPU 1102 errors.
- `app/route.ts` may inject title, meta tags, JSON-LD, GA/GTM snippets, and no-script SEO fallback only outside the Cloudflare asset path.
- `app/route.ts` must not inject visible header/nav DOM, CSS, layout scripts, replacement CTA bars, or any rule that hides `nav.fixed.top-0`.
- Cloudflare production must serve the same full homepage bundle from `/altoslab-homepage`; it must not use `HTMLRewriter` or `response.text()` to stream-replace homepage structure at request time.
- `components/site/*` remains inactive prototype code and must not be wired to `/` without explicit approval.

Protected homepage markers:

- `<div id="root"></div>`
- `fixed top-0`
- `children:\`ALTOS\``
- `children:\`LAB\``
- visible CTA copy `合作洽談 ↗` for header/contact and `開始合作 ↗` for the hero action

Any intentional homepage redesign requires Tommy approval, before/after desktop and mobile screenshots, updates to `SPEC.md`, `DESIGN.md`, `docs/FRONTEND_ARCHITECTURE.md`, and a same-change update to `scripts/homepage-ui-contract-smoke.mjs`.

## Blog UI Stability Contract

The blog index is a protected editorial surface. Its current design is the light `AI & Craft` / `blog-craft` experience with sidebar topic navigation, search, feed grid, card imagery, pagination, and the existing editorial rhythm. Do not replace it with a generic card wall, a direct Worker-rendered index, or a temporary emergency layout unless Tommy explicitly approves a visual redesign.

2026-06-14 New baseline note: the New repository was restored to the original blog header/index and article detail visual contract from `ALTOSLAB_WEB_MAIN`; future changes should treat that restored contract as the source of truth.

Design ownership:

- `components/BlogIndex.tsx` owns `/blog` and `/:language/blog` visual structure.
- `app/globals.css` owns the `blog-craft-*` style contract.
- Cloudflare direct HTML rendering is allowed for article detail resilience only, not for blog index replacement.
- n8n and content automation may change article data, but they must not change the public blog index layout, component ownership, spacing system, typography hierarchy, navigation, or visual tokens.

Protected index markers:

- `blog-craft-index`
- `blog-craft-layout`
- `blog-craft-sidebar`
- `blog-craft-feed`
- `blog-craft-card`

Protected article detail markers:

- Article hero/title stays left aligned with the restored original article shell rhythm.
- Desktop article titles should stay editorially strong but not oversized; do not enlarge them as a side effect of content or Worker fixes.
- Article top spacing should stay compact so the first paragraph and cover image arrive quickly.
- `重點摘要`, `本文重點`, inline `strong`, and `blockquote` use black text with signal-lime `#C8FF00` side marker, underline, or highlight treatment.
- The old purple article accent is retired and must not return in article metadata, takeaways, blockquotes, or direct-rendered Cloudflare pages.

Any intentional change to these markers or their visual behavior requires same-change screenshot evidence, product/design rationale, and updates to `SPEC.md`, `docs/FRONTEND_ARCHITECTURE.md`, and `scripts/blog-ui-contract-smoke.mjs`.

Remaining risks:

- `index.html`, `altoslab-website.html`, and `public/index.html` can drift from each other if edited separately.
- The homepage bundle still contains hard-coded values. Replace them only section by section with screenshot parity checks.
- Do not recreate `app/page.tsx` or wire `components/site/*` to `/` without explicit approval.
- Some admin/project subpages still use older global CSS class names; keep token aliases in `design/tokens.css` until those pages are migrated.

## Token Adoption Plan

1. Keep `design/tokens.css` and `design/tokens.json` as the source of truth.
2. Use semantic tokens in components and keep primitive tokens inside token files.
3. Keep `app/route.ts` + `index.html` as the public homepage entry until a visual parity migration is approved.
4. Keep `app/globals.css` as the implementation layer for admin/project/blog pages.
5. Replace remaining hard-coded `#C8FF00`, `#FF5500`, black, white, and translucent grays only during controlled section-level migration.
6. Keep `docs/FRONTEND_ARCHITECTURE.md` updated when changing route/component boundaries.

## Central References Used

- `/Users/kenhuang/Desktop/DesignAI/DESIGN-BRAIN.md`
- `/Users/kenhuang/Desktop/DesignAI/00-design-rule-hierarchy.md`
- `/Users/kenhuang/Desktop/DesignAI/17-web-design-system-playbook.md`
