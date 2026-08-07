# Hermes Ops Control Room UI Handoff

This folder is a static designer handoff for the Hermes CMO control-room UI.

## Entry Point

- `index.html` is the editable UI prototype.
- `hermes-ops-control-room-data.json` is the generated live-data snapshot used by the page.
- `ui-match-artifacts/` contains the pixel-art assets referenced by `index.html`.
- `design-evidence/` contains the target reference, latest screenshots, comparison strip, and QA notes.

## Designer Notes

- The moving elements should remain the `.live-agent` people sprites.
- Header/status icons should stay visually still; only time text can update.
- Do not change fail or incomplete states into green/completed states for visual parity.
- Current truthful values intentionally differ from the reference image:
  - system status: `需檢查`
  - health: `42%`
  - blog progress: `專欄群組 2/3`
  - social progress: `發文6｜回覆0｜互動0`
- If visual edits need different copy, keep the same truth meaning and update the data snapshot or renderer later.

## Evidence

- Target image: `design-evidence/reference-target.jpg`
- Latest desktop capture: `design-evidence/current-status-rest-fix-1280x853.png`
- Latest mobile capture: `design-evidence/current-status-rest-fix-mobile-390x844.png`
- GitHub handoff smoke capture: `design-evidence/github-handoff-smoke-1280x853.png`
- Side-by-side comparison: `design-evidence/comparison-strip.png`
- QA notes: `design-evidence/design-qa.md`
