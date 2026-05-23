# ALTOS LAB Visual Tokens

These tokens are the source of truth for the rebuilt Next homepage and the admin-ready CMS surface.

## Token Layers

- Primitive tokens: raw values such as `--al-color-lime-500`.
- Semantic tokens: UI roles such as `--al-color-text-secondary`.
- Component tokens: stable component decisions such as `--al-button-height-md`.

## Usage Rules

- Use semantic tokens in components.
- Use primitive tokens only when defining or extending semantic tokens.
- Keep signal lime under roughly 8% of a viewport.
- Use orange only for system/process accent, not as a second primary CTA.
- Keep radius at `8px` or lower for most cards and controls.
- Product galleries and modals use real screenshots with solid surfaces; avoid gradient fades.

## Files

- CSS variables: `design/tokens.css`
- Design token exchange file: `design/tokens.json`
- Project implementation CSS: `app/globals.css`
