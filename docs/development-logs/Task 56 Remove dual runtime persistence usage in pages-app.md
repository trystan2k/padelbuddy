---
title: Task 56 Remove dual runtime persistence usage in pages-app
type: note
permalink: development-logs/task-56-remove-dual-runtime-persistence-usage-in-pages-app
---

# Development Log: Task 56 Remove dual runtime persistence usage in pages-app

## Metadata
- Task ID: 56
- Date (UTC): 2026-03-02T19:33:26Z
- Project: padelbuddy
- Branch: feature/PAD-56-remove-dual-runtime-persistence-usage-in-pages-app
- Commit: 96da809

## Objective
- Replace dual runtime persistence usage in app/page flows with the Unified Active-Session Storage Service APIs (`getActiveSession`, `saveActiveSession`, `clearActiveSession`, `migrateLegacySessions`) while preserving behavior across setup -> game -> summary and restart paths.

## Implementation Summary
- Completed subtasks 56.1-56.5 per plan. Key changes across subtasks:
  - 56.1: Performed a persistence access audit for `app.js` and `page/*`; documented site-specific patterns and replacement mapping (consolidated in this file under "Consolidated 56.1 Audit").
  - 56.2: Replaced direct session read paths in `page/game.js`, `page/setup.js`, `page/index.js`, and `page/summary.js` to call `getActiveSession()` from `utils/active-session-storage.js`. Preserved null/invalid-session handling.
  - 56.3: Replaced direct session write/clear paths with `saveActiveSession()` and `clearActiveSession()` in gameplay and setup flows; consolidated debounced in-game persistence to use a single canonical write path.
  - 56.4: Removed legacy dual-write imports and conditional branches from page/app flow code; kept `migrateLegacySessions()` at startup as non-blocking.
  - 56.5: Confirmed migration safety checks remain in `app.js` and are idempotent; updated `utils/start-new-match-flow.js` to use unified clear semantics where required.

## Consolidated 56.1 Audit
- Scope:
  - In scope: `app.js`, `page/*.js`
  - Out of scope at audit time: behavior-changing edits and full cutover from 56.2+
- Unified API target used for migration:
  - Reads: `getActiveSession()`
  - Writes: `saveActiveSession()`
  - Clears: `clearActiveSession()`
  - Startup migration: `migrateLegacySessions()` (best-effort, non-blocking)

### Audit Matrix (direct persistence/session access found)
| File | Legacy/dual access pattern found | Unified replacement target |
| --- | --- | --- |
| `app.js` | `saveState(runtimeState)` + `saveMatchState(schemaSnapshot)` in `emergencyPersistMatchState` | `saveActiveSession(stateToPersist)` |
| `app.js` | startup migration call `migrateLegacySessions({ globalData })` | Keep as-is (already unified service) |
| `page/game.js` | `loadMatchState()` in `validateSessionAccess` | `getActiveSession()` |
| `page/game.js` | `loadState()` fallback in `ensureRuntimeState` | `getActiveSession()` + runtime normalization |
| `page/game.js` | `saveState(...)` + `saveMatchState(...)` in `persistRuntimeStateSnapshot` | `saveActiveSession(...)` |
| `page/index.js` | `loadMatchState()` in resume visibility + resume click revalidation | `getActiveSession()` |
| `page/setup.js` | `clearMatchState()` + `saveMatchState()` + `loadMatchState()` in game start flow | `clearActiveSession()` + `saveActiveSession()` + `getActiveSession()` |
| `page/setup.js` | `clearState()` in runtime clear path | `clearActiveSession()` |
| `page/summary.js` | `loadMatchState()` for finished session bootstrap | `getActiveSession()` |

### Files Confirmed Without Direct Session Persistence Access
- `page/history.js`
- `page/history-detail.js`
- `page/settings.js`
- `page/score-view-model.js`

### 56.1 Risk Snapshot (captured before cutover)
1. Runtime vs canonical shape merge risk in `page/game.js` (`ensureRuntimeState` mapping correctness).
2. App lifecycle safety-net risk in `app.js:onDestroy` (stale snapshot vs hard-kill resilience).
3. Setup clear-order risk in `page/setup.js` (clear/save/read ordering correctness).
4. GlobalData handoff coupling risk (`pendingPersistedMatchState` / `pendingHomeMatchState`) for Task 57 cleanup.
5. Non-page legacy clear hotspot in `utils/start-new-match-flow.js` (resolved in Task 56.4).

## Files Changed
- app.js
- page/game.js
- page/setup.js
- page/index.js
- page/summary.js
- utils/start-new-match-flow.js
- utils/match-storage.js (compat shim left for non-page callers/tests)
- utils/active-session-storage.js (primary service)
- tests/* (updated mocks and fixtures in integration/unit tests; notable files: tests/active-session-storage.integration.test.js, tests/setup-flow.test.js, tests/game-screen-layout.test.js, tests/summary-screen.test.js, tests/app-undo-integration.test.js)
- docs/development-logs/Task 56 Remove dual runtime persistence usage in pages-app.md (includes consolidated 56.1 audit content)

## Key Decisions
- Chosen approach: targeted page/app cutover (Plan option B) to minimize risk and avoid overlapping with Task 57 which will remove `globalData` handoffs.
- Retained `migrateLegacySessions()` as a non-blocking startup step to ensure migration safety and backward compatibility during rollout.
- Left `utils/match-storage.js` as a compatibility shim for non-page callers and tests to avoid broad ripples; new page/app code references `utils/active-session-storage.js` directly.

## Validation Performed
- npm run lint: pass
- npm run format:check: initial failure due to formatting changes in modified files; fixed by applying project formatter and re-check -> pass
- npm test / npm run complete-check: pass (all unit and integration tests updated to new API mocks and fixtures)
- Manual scenario checklist (setup -> game -> summary; mid-game restart restore; start-new-game reset): behavior parity confirmed

## QA Notes
- Initial formatting error encountered after code edits; formatting auto-fix applied and verified.
- Tests required minor fixture updates where tests previously relied on legacy runtime storage hooks; updated tests to import `utils/active-session-storage.js` mocks instead.

## Code Review Verdict
- Verdict: Approved with non-blocking observations
- Non-blocking observations:
  - A few helper functions in `page/game.js` still perform runtime-shape normalization inline; consider moving shared normalization to `utils/active-session-schema-utils.js` in follow-up.
  - Some tests still import `utils/match-storage.js` for legacy reasons — plan Task 57 to fully deprecate and remove the compatibility shim.
  - Minor logging verbosity increase in `utils/active-session-storage.js` during migration; acceptable but suggest tuning log levels in a follow-up.

## Risks and Follow-ups
- Risk: Runtime vs canonical shape normalization could introduce subtle state mapping regressions; mitigation: add dedicated normalization helpers (Task 57 follow-up) and add targeted property-level assertions in tests.
- Risk: App onDestroy emergency persistence relies on last-known snapshot semantics; monitor crash-restart cases in CI and add additional smoke tests if failures observed.
- Follow-up tasks: Task 57 proposed to remove `globalData` handoff channels and deprecate `utils/match-storage.js`; also consider extracting shared normalization helpers and tuning migration logging.

