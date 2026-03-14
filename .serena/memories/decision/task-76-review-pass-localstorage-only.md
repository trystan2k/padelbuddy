## What
Refined Task 76 to remove startup legacy migration, delete `utils/storage.js`, and make active-session persistence LocalStorage-first only.

## Why
Code review required production code and test coverage to fully match the final Zepp OS 3.x/new-users-only scope without lingering legacy hmFS migration infrastructure.

## Where
- app.js
- utils/active-session-storage.js
- utils/app-data-clear.js
- deleted: utils/storage.js
- updated/deleted tests across active-session, start-new-match-flow, home, game, settings, and regression suites

## Learned
- `platform-adapters.storage.clear()` clears the active runtime storage, so test helpers must clear fallback state before installing a mock storage, not after, or seeded entries are lost.
- The game access guard tests need canonical serialized sessions (`serializeMatchState(createDefaultMatchState())`) rather than partial legacy-shaped payloads now that production no longer supports legacy active-session inputs.