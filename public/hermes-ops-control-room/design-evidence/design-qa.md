# Hermes CMO 工作室 Dashboard QA

## Current Verdict

final result: in_progress

This dashboard is not ready to call finished yet. The latest build is a real
interactive dashboard shell with live DOM room cards, reference-cropped animated
agents, data-backed labels, clean Playwright console, and working controls. The
remaining product-quality gap is final visual parity and a true mobile-specific
layout, not basic functionality.

## Tested

- Environment: `http://127.0.0.1:9120/hermes-ops-control-room.html`
- Runtime source:
  `/Users/asdc163/.hermes/profiles/ops/scripts/hermes_ops_control_room.py`
- Runtime HTML:
  `/Users/asdc163/Documents/Marketing Operation/data/social-cmo/dashboard/hermes-ops-control-room.html`
- Runtime data:
  `/Users/asdc163/Documents/Marketing Operation/data/social-cmo/dashboard/hermes-ops-control-room-data.json`
- Reference image:
  `/Users/asdc163/LocalProjects/Hermes/03_狀態與看板/ui-match-artifacts/reference.jpg`
- Latest desktop screenshot:
  `/Users/asdc163/LocalProjects/Hermes/03_狀態與看板/ui-match-artifacts/current-status-rest-fix-1280x853.png`
- Latest motion evidence:
  `/Users/asdc163/LocalProjects/Hermes/03_狀態與看板/ui-match-artifacts/agent-motion-final2-motion.json`
- Latest mobile screenshot:
  `/Users/asdc163/LocalProjects/Hermes/03_狀態與看板/ui-match-artifacts/current-status-rest-fix-mobile-390x844.png`

## Evidence

- `python3 -m py_compile /Users/asdc163/.hermes/profiles/ops/scripts/hermes_ops_control_room.py` passes.
- Generator successfully writes `hermes-ops-control-room.html` and
  `hermes-ops-control-room-data.json`.
- Playwright opened the dashboard with 0 console errors and 0 warnings.
- Browser DOM check:
  - resource mascot alert is `需清理！`, matching current disk/memory pressure.
  - footer training status is `Hermes 訓練中 16%`, matching `quality_count`.
  - system status now follows `overall_status=fail` and renders `需檢查`
    instead of incorrectly showing `運行中` just because the CLI/cron checks are alive.
  - the `需檢查` badge now uses fail coloring (`#ffd1c8` background and
    red-brown text/border) instead of looking like a green pass badge.
  - health now renders the live value `42%`; the footer training bar remains
    live at `16%` and is not overridden by the reference's static `12%`.
  - top lane cards now display truthful compact labels:
    `已發 1 篇`, `專欄群組 2/3`, and `發文6｜回覆0｜互動0`.
    They no longer wash fail conditions into `今日專欄已產出` or `互動已執行`.
  - bottom pulse panel shows 6 real work events instead of hiding most of the
    activity behind a summary row.
  - `.live-agent::after` is hidden, so room status is represented by the card
    dot only; the moving people no longer carry duplicate marker dots.
  - room cards now use reference-like pastel note colors by room while keeping
    status semantics in the top-right dot.
  - dock visuals now use a reference-matched crop while retaining live DOM click
    targets and accessibility text; dock item text is visually supplied by the
    crop, not duplicated by a second DOM text layer.
  - room cards now show concise dashboard labels while full truthful status and
    next-action copy remain in `data-full-status` / `data-full-copy` and the
    room detail drawer.
  - default dashboard screenshot has `0` active room outlines; large hover
    outlines are no longer present in the resting dashboard state.
  - brand/header identity area now uses a reference-matched visual crop while
    preserving DOM text for accessibility; dynamic status/health/time remain
    live values and are not copied from the reference.
  - status bar icons now use reference-cropped pixel assets for system, health,
    and clock while the adjacent status, health percentage, and refresh time
    remain live DOM values.
  - status icon animation is disabled, so the visible motion focus stays on the
    `.live-agent` people sprites rather than header chrome.
  - the system status text is rendered as a clear `需檢查` badge; health
    remains the live DOM value `42%` with the status affordance.
  - footer `今日提示` now uses the supplied reference star segment while the
    tip copy and `Hermes 訓練中 16%` remain live DOM text.
  - right-rail title icons now use reference-cropped pixel assets for notes,
    data gaps, repair tasks, and daily output.
  - right-rail auth/repair rows now use a compact reference-like list treatment
    instead of oversized stacked task cards; full task truth remains in JSON.
  - the long `Social automation readiness audit` display label is localized to
    `社群自動化體檢` to avoid unreadable truncation.
  - lower-row room cards were tightened toward the reference dimensions while
    preserving full truth in the room detail drawer.
  - room-card title rows now include the reference-like left dot and
    room-specific accent title colors while right-side status dots keep the
    live pass/warn/fail semantics.
  - the rest-room live note was enlarged to cover stale embedded background
    text while keeping the rest agent inside its room.
- Playwright click test:
  - clicking `官網編輯室` opens the room detail drawer with that room data.
  - clicking `待補數據` collapses the side card and changes the accessible label
    to collapsed state.
  - clicking `設定中心` opens the settings drawer.
  - clicking the dock mascot opens the `Hermes 訓練中` drawer.
- Data consistency check: 38 visible/full-detail items were checked against
  `pixel_studio` data, with 0 failures. Room card text is intentionally
  concise, and the full generated status/copy is verified through DOM data
  attributes used by the drawer.
- Visible work-pulse check: dashboard text no longer exposes engineering
  ledger strings such as `facebook · publish`, `Codex coach scheduled`, or
  `Codex coach verified`; the raw evidence remains in JSON. The six visible
  pulse rows now have `overflowX=0` and `overflowY=0`.
- Motion check: final transform sampling over seven irregular intervals showed
  every live person has multiple transforms and the correct animation family:
  `BN agentSync`, `BG/CM/CR agentAlert`, `DT/FX agentWork`, and `ID agentIdle`.
  Header/status icons stayed static; visible motion is concentrated on the
  small people.
- Mobile readability check: the 390px viewport no longer scales the full
  control room into a tiny unreadable bitmap; it preserves the 1280px dashboard
  at full scale inside a scrollable viewport.
- Visual-diff guardrail: latest desktop comparison against the supplied
  reference improved across earlier passes from `changed_ratio 0.720228` to
  `0.706407` after the reference-matched dock, then to `0.699256` after the
  reference-brand/status-icon pass, `0.667716` after the compact right-rail
  list pass, and `0.666003` after the lower-room-card sizing pass. The latest
  truth-preserving copy pass was `0.674170`; the latest status/rest fix is
  `0.674909`. The small metric regression is a deliberate guardrail tradeoff
  because the live dashboard must show a fail-colored `需檢查`, `42%`, `2/3`,
  and `0` interaction gaps instead of the reference image's static green sample
  values. It still remains `in_progress` rather than passed.
  Some remaining diff is expected because this build renders current live
  values (`42%`, high resource pressure, current date/time, and 6 pulse rows)
  instead of matching the reference's static sample values.
- Static contract check:
  - 7 room buttons exist.
  - 7 `.live-agent` elements exist.
  - agent values are `BN, BG, CM, CR, DT, FX, ID`.
  - room DOM text maps back to `pixel_studio.rooms`.
  - clock and pulse intervals exist.
  - DOM no longer contains the reference image's fake status strings:
    `預計發布: 17:10`, `已分析: 368/400`, `今日互動: 126 則`,
    `互動已執行`, or `今日專欄已產出`.

## Fixed In This Iteration

- Replaced crude block markers with reference-cropped pixel-person sprites.
- Agents now sit inside their matching rooms and use state-specific CSS
  keyframes: `agentSync`, `agentAlert`, `agentWork`, `agentIdle`.
- Room cards are live DOM text sourced from generated Hermes data instead of
  relying on image text.
- Room cards now use status dots and state-colored borders to read closer to
  the supplied reference.
- Room status dots moved to the top-right of the cards, matching the supplied
  reference more closely and freeing the left text edge.
- Room cards now include a small pixel tail and enough opaque height to cover
  the embedded reference-card text underneath, reducing competing old/new room
  status text.
- Room cards now use room-specific pastel note colors closer to the supplied
  reference instead of relying on generic pass/warn/fail alert-card color.
- Removed duplicate status dots from the moving people sprites, so visible
  motion reads as character movement rather than marker movement.
- Dock now uses a reference-matched visual crop, reducing the dock region's
  measured diff from `0.7475` to `0.4802` while preserving click behavior.
- Top and rest room cards were realigned to the reference card coordinates and
  increased where needed to cover embedded background sample text.
- Room cards now use short, scan-friendly dashboard labels while the full
  generated values remain available in the drawer; this fixes the earlier
  pressure where long text made cards feel like generic web alerts.
- Hover no longer draws large yellow room outlines in the resting dashboard
  state; keyboard focus and clicked active state still have visible feedback.
- Header brand identity now uses the supplied reference pixels for stable logo
  and title text; live status cards are left as generated DOM because their
  values must remain current.
- Status bar icons now use reference-cropped pixel assets, reducing status
  region diff while keeping live status, health, and refresh time values.
- Header status text now matches the reference's readable badge treatment while
  preserving current live values.
- Removed the remaining non-person header animation so movement is concentrated
  on the little people.
- Increased the blog/social live room cards to cover stale sample text embedded
  in the reference office background, keeping visible dashboard text clearer and
  data-backed.
- Footer `今日提示` now restores the reference's left star segment and tighter
  control-row geometry while preserving current training progress.
- Right-rail title icons now come from reference-cropped pixel assets rather
  than CSS approximations.
- Right-rail task rows now use a compact list layout with small status dots and
  badges, closer to the supplied reference and less card-heavy.
- Localized `Social automation readiness audit` to `社群自動化體檢` in the
  dashboard display layer so the row remains readable without changing raw
  evidence.
- Tuned lower-row live room-card dimensions for creative, data, debug, and rest
  to sit closer to the reference cards while keeping concise labels plus full
  drawer detail.
- Reverted the attempted top-row shrink because it increased the top-room diff;
  top-row cards remain at the cleaner previous sizing.
- Added the reference-like title-left dot and room accent title color to the
  live room cards. The full generated status/copy is still only in drawer data,
  not copied from the reference image.
- Dock now includes a reference-logo mascot/training button, matching the
  reference's rightmost dock affordance while keeping it interactive.
- Side cards now include small pixel-style icons for notes, data gaps, repair
  tasks, and daily output, closer to the reference's right-rail dashboard cards.
- Work-pulse rows no longer fake a time by slicing `detail`; they show short
  Chinese dashboard labels such as `Facebook 發文`, `X 發文`, `Threads 發文`,
  and `更多`.
- Work-pulse density now shows all 6 current public-action events in the bottom
  panel, closer to the supplied dashboard reference.
- Resource mascot copy is no longer hardcoded to `運行順暢！`; it now follows
  real CPU/memory/disk meter state and currently shows `需清理！`.
- Footer training progress is no longer hardcoded to `12%`; it now follows the
  current `quality_count` and shows `16%`.
- Reduced right-panel crowding with compact rows and `more` rows.
- Fixed right-panel badges so `需授權`/`自修` remain readable.
- Added clock and work-pulse timers.
- Fixed Playwright console noise from missing favicon.
- Fixed the truth regression found by the security/regression subagent:
  the main status now binds to `overall_status`, not only `status_ok/cron_ok`.
- Replaced over-optimistic room card summaries with truthful compact Chinese
  labels derived from live lane output: Binance posts, Blog `2/3` column groups,
  and Social `6 publish / 0 replies / 0 engagement`.
- Fixed the blog room hitbox so the blog person's center is inside its room.
- Shortened pulse detail labels and added overflow wrapping for long drawer,
  task, and pulse text.
- Recolored the top system badge by live status so `需檢查` no longer looks like
  a successful green state.
- Enlarged the rest-room live note to hide stale embedded reference text while
  preserving the live rest status and animated person.

## Remaining Product Issues

- P2 visual fidelity: the people now come from the reference image and move,
  but final parity still needs another visual pass against the supplied target.
- P2 mobile: the 390px viewport is now readable and scrollable, but it is still
  not a purpose-built mobile dashboard layout.
- P3 polish: the large office background is still a visual substrate, so the
  old illustration remains behind the live DOM. The primary visible text is now
  live DOM, but a future pass should either remove old embedded text fully or
  rebuild the room art as native layers.

## Next Acceptance Gate

- Desktop: no visible competing old/new room status cards.
- Agents: movement must be visible on the people themselves, with state-specific
  CSS animation and no crude marker look.
- Data: every visible dashboard number must map to JSON/SQLite or be explicitly
  marked as missing/auth-required.
- Mobile: primary workflow must be readable without relying on tiny scaled
  desktop text.
- QA: only change `final result` to `passed` after fresh desktop, mobile,
  interaction, console, and data-consistency evidence all support it.
