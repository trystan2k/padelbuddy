## What
Implemented Task 76 as a LocalStorage-first persistence refactor for the Zepp OS 3.x mainline app with no legacy hmFS migration path.

## Why
The user narrowed scope to new users on newer watches only, explicitly removing backward compatibility, legacy user-data migration, and hmFS fallback requirements.

## Where
- utils/persistence.js
- utils/active-session-storage.js
- utils/match-history-storage.js
- utils/haptic-feedback-settings.js
- utils/app-data-clear.js
- utils/storage.js
- utils/match-storage.js
- app.js
- page/game/persistence.js
- docs/schema/match-session.md
- tests/storage.test.js
- tests/haptic-feedback-settings.test.js
- tests/match-history-storage.test.js
- tests/active-session-storage.localstorage.test.js
- tests/helpers/local-storage-mock.js

## Learned
- platform-adapters storage keeps an internal fallback mirror, so tests that swap runtime storage instances need an explicit `storage.clear()` reset to avoid stale reads.
- Keeping a no-op `migrateLegacySessions()` export is a safe internal compatibility bridge while fully disabling legacy data migration behavior.