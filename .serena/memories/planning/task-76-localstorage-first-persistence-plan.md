## What
Created an implementation-ready plan for Task 76 to move the Zepp OS 3.6+ mainline app to a LocalStorage-first persistence strategy with no legacy user-data migration.

## Why
The user explicitly overrode the original backward-compatibility scope: current users stay on the v1 app/version, so mainline should fully adopt the modern storage/API model without supporting legacy v1 APIs or old persisted data.

## Where
- docs/plan/Plan 76 Migrate Persistence to LocalStorage-First Strategy with Schema Migration.md
- Analysis inputs: app.js, app.json, utils/platform-adapters.js, utils/match-storage.js, utils/active-session-storage.js, utils/storage.js, utils/match-history-storage.js, utils/haptic-feedback-settings.js, utils/app-data-clear.js, page/game/persistence.js, docs/schema/match-session.md, docs/PRD-Zepp OS API Level 3.6 Migration for New App.md.

## Learned
- Task 75 already provides a reusable generic `storage` adapter that resolves modern runtime storage objects and is the simplest base for Task 76.
- The main complexity is not page rewrites but deleting legacy `hmFS`/startup-migration code and updating the test harness away from `hmFS` mocks.
- `page/game/persistence.js` still hardcodes `schemaVersion: 1` in a fallback shape and should be audited during the refactor.