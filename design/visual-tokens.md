# ALTOS LAB Visual Tokens

These files define the design-token contract for the ALTOS LAB website and Blog without changing the current public homepage layout.

## Current Integration Status

- Public homepage route: `app/route.ts`
- Public homepage visual source: `index.html`
- Token CSS source: `design/tokens.css`
- Token exchange source: `design/tokens.json`
- Active token consumer today: `app/globals.css` for admin, blog, project pages, APIs previews, and future React components.

Do not switch the homepage back to `app/page.tsx` or replace `index.html` with React components unless a visual parity migration is explicitly approved.

## Token Layers

- Blog canonical tokens: source-aligned runtime values such as `--paper`, `--ink-800`, `--font-display`, `--sp-5`, and `--tap-min`.
- Blog compatibility aliases: bridge variables such as `--al-blog-bg` and `--al-blog-body`; these must point back to canonical Blog tokens.
- Legacy website tokens: preserved official website/admin values such as `--al-color-lime-500`, `--al-button-height-md`, and `--al-project-gallery-ratio`.

## Usage Rules

- Use Blog canonical tokens or their compatibility aliases in Blog components.
- Use semantic tokens in official website/admin components.
- Use primitive tokens only when defining or extending semantic tokens.
- Keep Blog UI chrome pure greyscale; color may appear in actual article/project images, not in controls, badges, gradients, or accents.
- Keep signal lime under roughly 8% of a viewport.
- Use orange only for system/process accents, not as a second primary CTA.
- Keep radius at `8px` or lower for most cards and controls; pills are allowed for CTA and status badges.
- Body copy defaults to `16px` with `1.6` line height.
- Product galleries and modals use real screenshots with solid surfaces; avoid gradient fades.
- Static `index.html` still contains hard-coded bundle values. Replace them only section by section with screenshot parity checks.

## Core Token Sets

Blog core:

- `--paper`, `--paper-tint`: Blog page and elevated surfaces.
- `--ink-50` through `--ink-1000`: greyscale only; `--ink-1000` is reserved for display headings, logo, primary CTA, quote rules, and progress.
- `--font-body`: Geist plus CJK fallback for UI, headings, and body copy.
- `--font-display`: Newsreader plus CJK serif fallback for italic editorial display only.
- `--font-mono`: JetBrains Mono stack for dates, numbers, tokens, and code.
- `--fs-prose`, `--lh-relaxed`: article body reading rhythm.
- `--sp-*`, `--r-*`, `--shadow-*`, `--grid-*`, `--dur-*`: Blog spacing, shape, elevation, layout, and motion.

Legacy official website:

- `--al-color-bg-base`: deep black page background.
- `--al-color-bg-surface`: repeated object/card surface.
- `--al-color-text-primary`: main high-contrast text.
- `--al-color-text-secondary`: body copy and readable supporting text.
- `--al-color-action-primary`: lime CTA and active signal.
- `--al-color-accent-system`: orange system/process accent.

Typography:

- `--al-font-body`: Inter + Traditional Chinese fallback.
- `--al-font-mono`: compact metadata and technical labels.
- `--al-text-body`: normal body copy.
- `--al-leading-body`: readable CJK line height.

Components:

- `--al-button-height-*`: CTA sizing.
- `--al-input-*`: contact/admin form fields.
- `--al-portfolio-image-opacity-*`: homepage portfolio cover image brightness, currently `0.6` rest and `0.85` active.
- `--al-thumb-*`: product gallery thumbnail border and active spacing.
- `--al-project-*`: project cover, gallery, YouTube, and max image rules.

## Files

- CSS variables: `design/tokens.css`
- Design token exchange file: `design/tokens.json`
- Project design guide: `DESIGN.md`
- Frontend architecture notes: `docs/FRONTEND_ARCHITECTURE.md`
