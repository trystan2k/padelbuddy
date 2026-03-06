## Task Analysis
- Main objective: Move vibration preference UI out of Settings inline row into a dedicated Game Settings page, while keeping app-wide persisted haptic preference (default `true`) and ensuring existing game + summary haptic behaviors honor that preference.
- Identified dependencies: Existing haptic persistence utility `utils/haptic-feedback-settings.js` and haptic gating paths in `page/game.js` and `page/summary.js` are already in place; `page/settings.js` currently contains inline `SLIDE_SWITCH` logic that must be reverted; routing is controlled by `app.json` page registration per target (`gtr-3` and `gts-3`).
- System impact: Medium, affecting Settings navigation UX, one new page module, target page registration, i18n labels, and regression coverage; no scoring engine, match-state schema, or permission model changes.

## Chosen Approach
- Proposed solution: Revert inline switch rendering from `page/settings.js`, add a new chevron-style list item `Game Settings` above version, navigate to new `page/game-settings.js`, and host the vibration switch there (text + `SLIDE_SWITCH`) backed by existing persisted preference helpers.
- Justification for simplicity: This preserves current architecture (settings list as navigational hub), reuses existing persistence + haptic gating code, avoids introducing new storage contracts, and keeps version-row behavior deterministic (always last).
- Components to be modified/created:
  - `page/settings.js` (modify): remove inline switch widget/state handling; add clickable `Game Settings` row with chevron icon; update list indices and click routing; keep version as last row.
  - `page/game-settings.js` (new): new page with title, vibration label text, and `SLIDE_SWITCH`; load persisted default (`true`) and persist on switch changes.
  - `app.json` (modify): register `page/game-settings` in both target page arrays (`gtr-3` and `gts-3`) so navigation works on all devices.
  - `utils/haptic-feedback-settings.js` (reuse; adjust only if needed): keep canonical key + parse defaults; no migration required.
  - `page/game.js` (verify/adjust): ensure score haptic trigger path checks persisted preference before vibration start.
  - `page/summary.js` (verify/adjust): ensure summary 3 long pulses (`scene=25`) are fully skipped when preference is disabled.
  - `utils/app-data-clear.js` (verify/adjust): ensure clear-app-data removes haptic preference key so behavior resets to default enabled.
  - `page/i18n/en-US.po`, `page/i18n/pt-BR.po`, `page/i18n/es-ES.po` (modify): add strings for `settings.gameSettings`, `gameSettings.title`, and page-level vibration label (reuse existing `settings.vibrationFeedback` only if semantically correct).
  - Tests (modify/create): add/update coverage for settings row order/navigation, game-settings switch persistence, and end-to-end haptic gating.

## Implementation Steps
1. Rebaseline current state and define row-order contract
   - Confirm current `page/settings.js` inline-switch implementation points to remove.
   - Lock required Settings row order: `Previous Matches`, `Clear App Data`, `Game Settings`, `Version` (version must remain final item).
2. Revert inline switch behavior from Settings page
   - Remove inline switch widget creation/state (`renderHapticFeedbackSwitch`, switch change handlers, non-clickable switch row behavior).
   - Restore Settings list as navigation-focused rows and keep clear-data confirm logic intact at stable index.
3. Add `Game Settings` list item and navigation path
   - Add new chevron-style `Game Settings` row in `page/settings.js` data array/type config.
   - Add click handler route (`hmApp.gotoPage({ url: 'page/game-settings' })`) for the new row.
4. Create dedicated Game Settings page UI
   - Implement `page/game-settings.js` with simple layout: title + vibration label + `SLIDE_SWITCH` + back/home affordance matching project patterns.
   - Initialize switch from `loadHapticFeedbackEnabled()` (default true), persist via `saveHapticFeedbackEnabled()` on toggle.
5. Register route/page for both device targets
   - Update `app.json` to include `page/game-settings` in both `gtr-3` and `gts-3` page module arrays.
   - Verify no permission changes and no unrelated target/module drift.
6. Preserve/verify persistence + app-wide gating flow
   - Keep persisted key contract unchanged; missing/invalid value resolves to `true` (implicit migration behavior).
   - Verify `page/game.js` and `page/summary.js` continue to gate vibration start by preference.
   - Verify clear-app-data resets preference by clearing key in `utils/app-data-clear.js`.
7. Update localization and tests
   - Add/adjust i18n keys for new Settings row and Game Settings page labels across all supported locales.
   - Add or update tests for row order/version-last, navigation, switch persistence defaults, enabled/disabled haptic gating for game and summary.
8. Run QA and regression checks
   - Execute `npm run complete-check`.
   - Perform real-device validation for navigation and haptic behavior under both toggle states.

## Validation
- Success criteria:
  - Settings page no longer shows inline vibration switch.
  - Settings page includes `Game Settings` chevron row, and version remains the last list item.
  - Tapping `Game Settings` opens dedicated game settings page on both targets.
  - Game Settings page shows vibration text + switch, default ON when preference key is missing.
  - Preference persists across page/app restarts and controls haptics app-wide (game score + summary 3 long pulses).
  - Clear App Data resets preference to default ON (key removed), and app manifest permissions remain unchanged.
- Checkpoints:
  - Pre-implementation assumptions check:
    - Keep existing storage key and default contract (no schema migration file).
    - Preserve summary pulse behavior spec: 3 long pulses (`scene=25`) only when enabled.
  - During implementation correctness checks:
    - Settings row indexes remapped correctly after inline-switch removal.
    - New route `page/game-settings` is registered in both `gtr-3` and `gts-3` targets.
    - Game Settings switch reads/writes persisted boolean safely on device and fallback runtimes.
    - Game and summary haptic helpers short-circuit before vibration start when disabled.
  - Post-implementation QA verification matrix:

    | Check | Method | Expected Outcome |
    | --- | --- | --- |
    | Settings row layout | Open `page/settings` | Rows appear as Previous Matches, Clear App Data, Game Settings, Version |
    | Version position integrity | Inspect settings scroll list bottom item | Version remains final list item |
    | Game Settings navigation | Tap Game Settings row | Navigates to `page/game-settings` without errors |
    | Default preference behavior | Remove preference key / fresh state then open Game Settings | Switch loads as ON (`true`) |
    | Persistence OFF | Toggle switch OFF, leave/reopen page/app | Switch remains OFF and persisted value is reused |
    | Persistence ON | Toggle switch ON, leave/reopen page/app | Switch remains ON and persisted value is reused |
    | Game haptic gating ON | With switch ON, tap `+`/`-` in game | Score updates and haptic feedback runs |
    | Game haptic gating OFF | With switch OFF, tap `+`/`-` in game | Score updates but no vibration occurs |
    | Summary haptic gating ON | With switch ON, finish match to summary | 3 long pulses (`scene=25`) on summary load |
    | Summary haptic gating OFF | With switch OFF, finish match to summary | No summary-load pulses occur |
    | Clear-data reset behavior | Set OFF, run Clear App Data, reopen Game Settings | Preference key cleared; switch returns to ON default |
    | Routing config regression | Validate `app.json` target page arrays | `page/game-settings` present in both targets; no permission additions |
    | Full QA regression | Run `npm run complete-check` | Quality checks pass with no unrelated regressions |
