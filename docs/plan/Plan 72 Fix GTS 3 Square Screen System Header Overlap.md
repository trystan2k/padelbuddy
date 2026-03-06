## Task Analysis
- Main objective: Add a global safe top area so square GTS 3 / GTS 3 Pro screens do not render app headers under the fixed system header, while keeping round-device behavior unchanged.
- Identified dependencies: Task #41 (`utils/screen-utils.js`), Task #63 (all pages consume centralized `getScreenMetrics()`), layout stack (`utils/layout-presets.js`, `utils/layout-engine.js`), and affected page renders (`page/index.js`, `page/setup.js`, `page/game/ui-binding.js`, `page/summary.js`, `page/history.js`, `page/history-detail.js`, `page/game-settings.js`, `page/settings.js`).
- System impact: Medium and cross-cutting; this changes core layout math used by all migrated pages, so regressions are possible in section positioning (`top`/`after`/`bottom`/`fill`) if safeTop is not applied consistently.

## Chosen Approach
- Proposed solution: Use a centralized metrics-driven approach (chosen) instead of per-page manual offsets. Deepthink options considered: (1) patch each page schema/widget y-position (rejected: high duplication and fragile), (2) add one global safeTop in `getScreenMetrics()` and propagate through presets + layout engine (chosen: minimal, reusable, non-breaking), (3) add device-specific page forks (rejected: overengineered). Implement `SYSTEM_HEADER_HEIGHT_SQUARE = 48` in `screen-utils`, detect GTS 3 family using deviceSource (224/225) plus 390x450 tolerance, add optional `getScreenMetrics` override for safeTop testing, then make layout engine resolve vertical math in a safe-top-aware coordinate space.
- Justification for simplicity: One source of truth (`getScreenMetrics`) plus one resolver path (`resolveLayout`) avoids touching every page layout by hand, preserves existing API defaults (`safeTop=0`), and naturally keeps round screens unchanged.
- Components to be modified/created: Modify `utils/screen-utils.js` (safeTop computation + override), `utils/layout-presets.js` (safeTop option plumbing with backward-compatible default), `utils/layout-engine.js` (safeTop-aware section placement for numeric and percentage values), and tests in `tests/screen-utils-consolidation.test.js`, `tests/layout-presets.test.js`, `tests/layout-engine.test.js` (or equivalent new focused test file if cleaner).

## Implementation Steps
1. Pre-implementation baseline and guardrails
   - Confirm current behavior on representative metrics: square (390x450), round (454x454/466x466), and existing fallback test runtime.
   - Lock non-goals: no Zepp OS API changes, no per-page hardcoded device branches, no breaking signature changes to existing callers.
   - Risk mitigation: capture baseline snapshots from existing tests (`layout-engine`, `layout-presets`, page render tests) before edits.
2. Subtask 72.1 - Add `safeTop` to `utils/screen-utils.js`
   - Add constants and helpers: `SYSTEM_HEADER_HEIGHT_SQUARE` (initial 48, tunable), supported square header device sources (`224`, `225`), and tolerant size check around 390x450.
   - Extend `getScreenMetrics` to return `{ width, height, isRound, safeTop }`.
   - Add optional override parameter to `getScreenMetrics` for testability (e.g., `getScreenMetrics({ safeTop: 48 })`), with sane clamping and fallback behavior.
   - Keep round devices (e.g., source `227`) at `safeTop: 0`.
   - Elevated risk and rollback: false-positive device detection could shift non-target layouts; mitigate with strict deviceSource gate + dimension tolerance, and rollback quickly by setting `SYSTEM_HEADER_HEIGHT_SQUARE` to `0` while retaining API shape.
3. Subtask 72.2 - Update `utils/layout-presets.js` to accept/use `safeTop` (backward compatible)
   - Add optional `safeTop = 0` option to `createStandardPageLayout` and `createScorePageLayout`.
   - Apply safeTop in preset-generated top handling in a backward-compatible way (defaults unchanged when omitted), and keep existing token-based defaults (`TOKENS.spacing.*`) intact.
   - Ensure no call sites break: current page modules can continue passing existing options without modifications.
   - Risk mitigation: do not require immediate page refactors; this remains additive plumbing.
4. Subtask 72.3 - Update `utils/layout-engine.js` to propagate and honor `safeTop`
   - Read `safeTop` from metrics (`resolveLayout(schema, metrics)`), defaulting to `0` if absent.
   - Resolve sections in a safe-top-aware vertical space so percentage-based values still compute correctly and top anchoring starts below the reserved system-header area.
   - Ensure `after`, `fill`, and bottom-anchored sections continue to produce valid coordinates under safeTop offsets.
   - Keep element placement unchanged except inheriting updated section coordinates.
   - Elevated risk and rollback: fill/bottom interactions are most regression-prone; isolate changes to vertical base calculations and keep horizontal logic untouched. If regressions appear, rollback only safeTop math block in `resolveLayout` while retaining `safeTop` in metrics API.
5. Update/extend automated tests for safeTop behavior
   - `tests/screen-utils-consolidation.test.js`: add assertions for `safeTop` presence, square-target detection, round-device default `0`, and override behavior.
   - `tests/layout-presets.test.js`: add coverage that safeTop options remain optional and backward compatible.
   - `tests/layout-engine.test.js`: add cases validating safeTop with numeric top, percentage top, `after`, and bottom/fill combinations.
   - Keep existing tests passing without requiring every mock to provide `safeTop` (default should remain `0`).
6. Subtask 72.4 - GTR 3 round-screen regression validation
   - Validate `safeTop=0` path using round metrics (deviceSource 227 or square dimensions absent) and confirm no visual/coordinate drift.
   - Run existing render-centric tests that cover round-ish scenarios (notably `tests/game-screen-layout.test.js` plus existing layout tests).
   - Pass condition: round layout coordinates and interaction tests remain unchanged from baseline.
7. Subtask 72.5 - GTS 3 square-screen functionality validation
   - Validate `safeTop≈48` path with target square metrics (deviceSource 224/225 and ~390x450), including per-page checks for: `index`, `setup`, `game`, `summary`, `history`, `history-detail`, `game-settings`, `settings`.
   - Add focused assertions that top section/widget Y positions start at or below safeTop and do not overlap system-header space.
   - Pass condition: no top-header overlap on square target while footer and interactive controls remain reachable.
8. Final QA and release readiness
   - Run full project QA command: `npm run complete-check`.
   - If failures are layout-only, triage by area (`screen-utils` detection, presets plumbing, engine y-resolution), patch minimally, and re-run.
   - Final mitigation note: keep `SYSTEM_HEADER_HEIGHT_SQUARE` as the single tuning knob for device fine-tuning without further architecture changes.

## Validation
- Success criteria: `getScreenMetrics()` always returns `safeTop`; square GTS 3 family resolves to ~48 (tunable), round devices resolve to `0`; `createStandardPageLayout`/`createScorePageLayout` remain backward compatible with default `safeTop=0`; `resolveLayout` correctly applies safeTop to section placement including percentage-based layouts; all listed pages render without top overlap on square devices; `npm run complete-check` passes.
- Checkpoints:
  - Pre-implementation assumptions check: verify deviceSource mapping used by runtime (`224/225` square target, `227` round reference) and confirm fallback behavior in Node tests where deviceSource may be absent.
  - During implementation correctness checks: (a) metrics API adds `safeTop` without breaking existing destructuring, (b) presets accept optional safeTop with unchanged defaults, (c) engine vertical calculations account for safeTop across `top`, `after`, `bottom`, `fill`, and percentage values.
  - Post-implementation verification and regression checks (pass/fail):
    - Pass: targeted tests for screen-utils/layout-engine/layout-presets succeed and page render tests remain green.
    - Pass: square scenario (390x450 + deviceSource 224/225) shows header content below reserved top area on all listed pages.
    - Pass: round scenario (e.g., 454x454 or deviceSource 227) has no coordinate drift versus baseline.
    - Fail: any page header y-origin intrudes into reserved top area on square target, or round-device layouts change unexpectedly.
  - Rollback trigger and mitigation: if widespread regression occurs, first set `SYSTEM_HEADER_HEIGHT_SQUARE` to `0` to disable behavioral impact, then iteratively re-enable after fixing detection/resolution math.
