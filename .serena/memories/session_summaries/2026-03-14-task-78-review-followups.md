## Goal
Address Task 78 review follow-ups by adding the missing functional confirmation tests and making a tiny test cleanup.

## Instructions
- Keep scope limited to the review items.
- Prefer test-only or minimal-risk changes.
- Avoid broadening production changes.

## Discoveries
- The requested settings/history-detail confirmation coverage fit cleanly into the existing `tests/settings-navigation.test.js` harness, avoiding a new untracked test file.
- `page/history-detail.js` tests can seed history storage directly through `saveState(HISTORY_STORAGE_KEY, ...)` under the existing LocalStorage mock.
- `tests/game-screen-layout.test.js` still had a dead `waitForPersistenceIdle` guard even though the page no longer exposes that helper.

## Accomplished
- Added settings-page confirmation tests for first tap, second tap clear-and-home navigation, alternate-item reset, and `onDestroy` reset.
- Added history-detail confirmation tests for first tap, successful delete/back navigation, delete failure reset behavior, and `onDestroy` reset.
- Removed the dead `waitForPersistenceIdle` check from `tests/game-screen-layout.test.js`.
- Ran targeted tests for the touched suites and then `npm run complete-check`, all passing.

## Next Steps
- Tree is ready for QA re-run or commit once the user wants to proceed.

## Relevant Files
- `tests/settings-navigation.test.js` — added settings clear-data and history-detail confirmation coverage.
- `tests/game-screen-layout.test.js` — removed dead persistence-idle guard from the harness.