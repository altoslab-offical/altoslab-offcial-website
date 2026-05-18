# ALTOS LAB Website Design Guide

This project uses Ken's central Design Brain as reference:

```txt
/Users/kenhuang/Desktop/CODEX/DesignAI/DESIGN-BRAIN.md
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
Component base: Static React export with Tailwind/shadcn-style tokens embedded in `index.html`

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

The one-page visual preview is [design/brand-preview.html](/Users/kenhuang/Desktop/CODEX/ALTOSLAB_WEB/altoslab-offcial-website/design/brand-preview.html).

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

Risks to fix next:

- `index.html`, `altoslab-website.html`, and `public/index.html` are duplicate built artifacts. This makes maintenance easy to drift.
- The HTML title is currently `altoslab-site2`, which should become a real brand/SEO title.
- `html lang` is `en`, but the site is primarily Traditional Chinese with English labels. Use `zh-Hant-TW` or `zh-TW`.
- There is no useful meta description in the static HTML.
- Brand colors are hard-coded in the bundle instead of exposed as semantic tokens.
- The source app is not present, only built output. Bigger edits will be safer if we recover or recreate the source structure.

## Token Adoption Plan

1. Keep `design/tokens.css` and `design/tokens.json` as the source of truth.
2. For small static edits, add a token override block near the existing CSS variables in `index.html`.
3. For larger redesign work, recreate the source app with these tokens in `globals.css` and Tailwind config.
4. Replace hard-coded `#C8FF00`, `#FF5500`, black, white, and translucent grays with semantic token usage.
5. Update metadata and language attributes before public launch.

## Central References Used

- `/Users/kenhuang/Desktop/CODEX/DesignAI/01-color-tokens.md`
- `/Users/kenhuang/Desktop/CODEX/DesignAI/02-typography.md`
- `/Users/kenhuang/Desktop/CODEX/DesignAI/06-project-profiles.md`
