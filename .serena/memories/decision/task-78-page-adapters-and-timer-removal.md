## What
Migrated the eight page modules to the Task 75 adapter stack for navigation, toasts, gestures, haptics, and keep-awake, and removed all page-level JavaScript timers by switching to state-driven confirmations plus immediate persistence.

## Why
Task 78 required Zepp OS 3.6+ compatible pages without unsupported timer assumptions.

## Where
- `page/index.js`
- `page/setup.js`
- `page/game.js`
- `page/summary.js`
- `page/history.js`
- `page/history-detail.js`
- `page/settings.js`
- `page/game-settings.js`
- `utils/start-new-match-flow.js`
- `utils/platform-adapters.js`

## Learned
- `page/game.js` could drop timer-based persistence debounce entirely because existing timestamp-based tap debounce plus signature dedupe kept writes predictable.
- History/settings confirmation flows worked better as explicit two-step states cleared by other actions or teardown than as timeout windows.
- Test loaders that import page modules through `data:` URLs must rewrite the new `platform-adapters.js` import explicitly.