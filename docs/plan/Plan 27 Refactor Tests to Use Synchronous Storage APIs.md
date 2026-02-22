## Task Analysis
- Main objective: Refactor all test files to use synchronous storage APIs that match the production Zepp OS file system implementation (`hmFS.SysProSetChars`/`SysProGetChars`), eliminating async/await patterns that do not reflect the actual synchronous runtime behavior.
- Identified dependencies: Production storage implementation in `utils/storage.js` (synchronous hmFS adapter), `utils/match-storage.js` (ZeppOsStorageAdapter with synchronous methods), and existing test files that incorrectly used async storage patterns or the deprecated `settingsStorage` API.
- System impact: Medium impact on test suite (8 test files modified, net reduction of 760 lines from 585 additions/1345 deletions). Zero impact on production code - this is a test-only refactor to improve test accuracy and reduce complexity.

## Chosen Approach
- Proposed solution: Systematically update all test mocks to use synchronous `hmFS` global mocking (`SysProSetChars`/`SysProGetChars`) instead of async/await patterns or the deprecated `settingsStorage` API. Simplify test assertions by removing unnecessary async coordination and complex UI verification that was compensating for misaligned storage patterns.
- Justification for simplicity: The production code uses synchronous Zepp OS storage APIs. Tests should mirror this behavior exactly to ensure accurate validation. Three approaches were considered:
  - (A) Keep async patterns and add complex coordination logic - rejected because it adds complexity and tests behavior that doesn't exist in production
  - (B) Create separate test-specific async wrappers - rejected because it creates divergence between test and production code
  - (C) **Align tests with production synchronous patterns** - selected because it simplifies tests, reduces code volume, and ensures tests accurately validate actual runtime behavior
- Components to be modified/created: 
  - `tests/storage.test.js` - Replace `settingsStorage` mocks with `hmFS` global mocking
  - `tests/home-screen.test.js` - Remove confirmation timeout logic, simplify assertions, use synchronous `matchStorage.adapter` mocking
  - `tests/game-screen-layout.test.js` - Major simplification, remove complex UI verification, use synchronous patterns
  - `tests/match-storage.test.js` - Ensure synchronous adapter mocking patterns
  - `tests/edge-case-handling.test.js` - Update storage mocking to use `hmFS` globals
  - `tests/summary-screen.test.js` - Align with synchronous patterns
  - `tests/setup-flow.test.js` - Update storage mocking
  - `tests/start-new-match-flow.test.js` - Update storage mocking

## Implementation Steps

### Step 1: Pre-implementation Analysis
- Verify that production storage (`utils/storage.js`) uses synchronous `hmFS.SysProSetChars`/`SysProGetChars` APIs
- Confirm `utils/match-storage.js` `ZeppOsStorageAdapter` methods (`save`, `load`, `clear`) are synchronous
- Identify all test files using incorrect async/await storage patterns or deprecated `settingsStorage`
- Establish baseline: run `npm run test` and capture current state

### Step 2: Update Core Storage Tests (`tests/storage.test.js`)
- Replace any `settingsStorage` mocks with `globalThis.hmFS` object mocking
- Ensure tests mock `SysProSetChars` and `SysProGetChars` methods
- Verify `saveState`, `loadState`, and `clearState` functions work with synchronous patterns
- Remove any unnecessary async/await from test bodies

### Step 3: Update Match Storage Tests (`tests/match-storage.test.js`)
- Verify `matchStorage.adapter` mock methods (`save`, `load`, `clear`) are synchronous
- Ensure tests do not use `async/await` when testing storage operations
- Validate that `MatchStorage` class tests reflect synchronous behavior

### Step 4: Refactor Home Screen Tests (`tests/home-screen.test.js`)
- Replace `settingsStorage` global mock with `hmFS` global mock
- Update `matchStorage.adapter` to use synchronous methods
- Remove confirmation timeout logic that was compensating for async patterns
- Simplify `waitForAsyncPageUpdates` helper - reduce from 3+ ticks if storage is now synchronous
- Remove complex UI verification that was needed due to async timing issues

### Step 5: Major Simplification of Game Screen Layout Tests (`tests/game-screen-layout.test.js`)
- Remove complex UI verification logic that was compensating for async storage
- Update `runWithRenderedGamePage` helper to use synchronous `hmFS` mocking
- Ensure `matchStorage.adapter` mock is synchronous
- Remove any `await` calls related to storage operations
- Simplify assertions that were checking async state propagation

### Step 6: Update Edge Case Handling Tests (`tests/edge-case-handling.test.js`)
- Replace `settingsStorage` with `hmFS` global mocking
- Ensure `matchStorage.adapter` uses synchronous methods
- Remove async coordination for storage operations
- Verify session guard tests work correctly with synchronous patterns

### Step 7: Update Summary Screen Tests (`tests/summary-screen.test.js`)
- Replace `settingsStorage` with `hmFS` global mocking
- Ensure synchronous `matchStorage.adapter` mocking
- Remove unnecessary async coordination

### Step 8: Update Setup Flow and Start New Match Flow Tests
- `tests/setup-flow.test.js` - Update storage mocking patterns
- `tests/start-new-match-flow.test.js` - Update storage mocking patterns
- Ensure consistent `hmFS` global mocking across all files

### Step 9: Run Full Test Suite and Validate
- Run `npm run test` and verify all tests pass
- Confirm test count and behavior is consistent
- Verify no regression in test coverage

### Step 10: Final Cleanup and Documentation
- Remove any remaining `settingsStorage` references in test files
- Ensure consistent patterns across all test files:
  - `globalThis.hmFS = { SysProSetChars, SysProGetChars }` for Zepp OS storage
  - `matchStorage.adapter = { save, load, clear }` for match storage
- Verify net reduction in test complexity (target: reduced line count, simpler assertions)

## Validation

### Success Criteria
1. All tests pass with `npm run test`
2. No test uses `async/await` for storage operations that are synchronous in production
3. All tests use `hmFS.SysProSetChars`/`SysProGetChars` mocking instead of deprecated `settingsStorage`
4. Test file line count is reduced (simpler tests)
5. No regression in test coverage or test behavior

### Checkpoints
- **Checkpoint 1** (after Step 1): Baseline established, all tests passing, inventory of files to modify complete
- **Checkpoint 2** (after Steps 2-3): Core storage tests updated and passing
- **Checkpoint 3** (after Step 4): Home screen tests simplified and passing
- **Checkpoint 4** (after Step 5): Game screen layout tests significantly simplified (major refactor target)
- **Checkpoint 5** (after Steps 6-8): All remaining test files updated
- **Checkpoint 6** (after Step 9): Full test suite passes with synchronous patterns
- **Checkpoint 7** (after Step 10): Final validation, no regressions, documentation complete

### Rollback Strategy
If regressions occur:
1. Each test file modification is independent - can rollback individual files
2. Git commit 77a370a represents the completed state - can use `git revert` if needed
3. Keep modifications atomic per test file to enable granular rollback
