## Goal
Address review feedback for Task 76 by fully removing legacy production persistence behavior and aligning tests with the LocalStorage-first Zepp OS 3.x scope.

## Instructions
- Remove startup legacy migration from `app.js`.
- Strip `utils/active-session-storage.js` of legacy hmFS and migration code.
- Retire `utils/storage.js` after removing consumers.
- Migrate or remove hmFS-dependent tests; keep project green.

## Discoveries
- Existing local-storage test helper needed lifecycle changes because calling `platformStorage.clear()` after installing a mock storage erased the seeded values.
- Many dynamic page tests were not blocked by deleting `utils/storage.js` because they only rewrote import strings opportunistically.
- `createSerializedMatchState()` in game guard tests had to emit canonical serialized sessions to match the LocalStorage-only runtime contract.

## Accomplished
- Removed legacy migration from `app.js` and simplified `utils/active-session-storage.js` to LocalStorage-first persistence only.
- Removed legacy cleanup from `utils/app-data-clear.js` and deleted `utils/storage.js`.
- Reworked or removed hmFS-dependent tests, including deleting obsolete active-session/migration suites and converting current coverage to LocalStorage mocks.
- Fixed local-storage helper behavior and restored full QA: `npm run complete-check` passed.

## Next Steps
- Task 76 can be considered implementation-complete unless additional review comments appear.

## Relevant Files
- app.js — startup now performs schema bootstrap only
- utils/active-session-storage.js — LocalStorage-only active-session persistence
- utils/app-data-clear.js — clears current LocalStorage-backed keys only
- tests/helpers/local-storage-mock.js — async-safe LocalStorage mock lifecycle helper
- tests/game-screen-layout.test.js — session guard tests now use canonical LocalStorage state
- tests/home-screen.test.js — hard-reset assertions no longer expect legacy key cleanup
- tests/start-new-match-flow.test.js — LocalStorage-based reset flow coverage