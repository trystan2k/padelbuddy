## Task Analysis

- **Main objective**: Audit the entire codebase for invalid Zepp OS lifecycle methods (`onShow`, `onHide`, `onResume`, `onPause`) that do not exist in API v1.0, document each occurrence with full context, and remove all violations by leveraging the v1.0-correct lifecycle (`onInit` → `build()` → `onDestroy()`). Update one affected test and produce three documentation deliverables in `.taskmaster/notes/`.
- **Identified dependencies**:
  - Tasks 9, 14, 25, 12: No direct code conflicts — game.js persistence hooks (`onDestroy`) and keep-awake (`hmApp.setScreenKeep`) are unaffected; the removed `onShow` methods are distinct from and do not overlap with those features.
  - `tests/home-screen.test.js`: Contains one test that directly invokes `page.onShow()` — must be updated as part of this task.
- **System impact**: Localized to four page files and one test file. No changes to utilities, `app.js`, `app.json`, `assets`, or side-service modules. History pages (`page/history.js`, `page/history-detail.js`) are already fully v1.0-compliant and require no changes.

---

## Audit Findings (Pre-Plan Research)

### Complete Scan Results

Exhaustive pattern search (`onShow|onHide|onResume|onPause`) across all `*.js` files:

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `page/index.js` | 201–209 | `onShow()` method defined | ❌ Invalid |
| `page/setup.js` | 78–81 | `onShow()` method defined | ❌ Invalid |
| `page/summary.js` | 180–182 | `onShow()` method defined | ❌ Invalid |
| `page/game.js` | 557–567 | `onShow()` method defined | ❌ Invalid |
| `page/history.js` | — | No violations | ✅ Compliant |
| `page/history-detail.js` | — | No violations (comment confirms intent) | ✅ Compliant |
| `tests/home-screen.test.js` | 432 | `page.onShow()` call in test | ⚠️ Test-only |

No occurrences of `onHide`, `onResume`, or `onPause` anywhere in the codebase.

### Per-File Violation Analysis

#### `page/index.js` — `onShow()` (lines 201–209)

**Exact violation body:**
```js
onShow() {
  this.isStartingNewGame = false
  this.isClearDataArmed = false
  this.savedMatchState = null
  this.hasSavedGame = false
  this.savedMatchStateFromHandoff = false
  this.renderHomeScreen()
  this.refreshSavedMatchState()
}
```

**Why invalid in v1.0**: `onShow` is not a recognised lifecycle hook in Zepp OS v1.0 (`onInit`, `build`, `onDestroy` are the only valid methods). The runtime silently ignores unknown methods — no error is thrown — but the code inside **never executes on any device/simulator running v1.0**.

**Why the logic is already covered**:
- `onInit()` (lines 191–199) already sets every flag to the same initial values (`false`/`null`) **and** calls `refreshSavedMatchState()`, which itself calls `renderHomeScreen()` before returning.
- `build()` (lines 211–213) calls `renderHomeScreen()` a second time.
- In v1.0 navigation, every page entry creates a brand-new page object; `onInit` is always called. There is no "return to existing page instance" scenario.

**Proposed fix**: Remove `onShow()` entirely.
**Risk classification**: 🟡 LOW — fully covered by `onInit`; one test must be updated.

---

#### `page/setup.js` — `onShow()` (lines 78–81)

**Exact violation body:**
```js
onShow() {
  this.isNavigatingToGame = false
  this.renderSetupScreen()
}
```

**Why invalid in v1.0**: Same reason as above — not a v1.0 lifecycle method, silently never called.

**Why the logic is already covered**:
- `onInit()` (lines 70–76) already sets `isNavigatingToGame = false` along with all other fields.
- `build()` (lines 83–85) already calls `renderSetupScreen()`.

**Proposed fix**: Remove `onShow()` entirely.
**Risk classification**: ⚪ TRIVIAL — completely redundant, no test coverage to update.

---

#### `page/summary.js` — `onShow()` (lines 180–182)

**Exact violation body:**
```js
onShow() {
  this.refreshFinishedMatchState()
}
```

**Why invalid in v1.0**: Not a v1.0 lifecycle method; silently never called.

**Why the logic is already covered**:
- `onInit()` (lines 174–178) already calls `refreshFinishedMatchState()`, which internally calls `renderSummaryScreen()`.
- `build()` (lines 184–187) calls `renderSummaryScreen()` and `registerGestureHandler()` again as a complete render pass.

**Proposed fix**: Remove `onShow()` entirely.
**Risk classification**: ⚪ TRIVIAL — completely redundant, no test coverage to update.

---

#### `page/game.js` — `onShow()` (lines 557–567)

**Exact violation body:**
```js
onShow() {
  // Re-validate on return to page (e.g. back navigation).
  // Only re-run if access was not yet granted (avoids redundant re-check on normal show)
  if (!this.isSessionAccessGranted) {
    this.validateSessionAccess()
    if (this.isSessionAccessGranted) {
      this.ensureRuntimeState()
      this.renderGameScreen()
    }
  }
}
```

**Why invalid in v1.0**: Not a v1.0 lifecycle method; silently never called.

**Why the logic is already covered**:
- `onInit()` (lines 540–555) always calls `this.validateSessionAccess()` synchronously at the end of initialization, populating `this.isSessionAccessGranted` and navigating away if denied.
- `build()` (lines 569–590) gates on `this.isSessionAccessGranted`: if false, renders a blank background (nav already triggered in onInit); if true, calls `keepScreenOn()`, `ensureRuntimeState()`, `renderGameScreen()`, and `registerGestureHandler()`.
- In v1.0, navigating back to the game page always triggers a full fresh `onInit` + `build()` cycle — the "re-validate on return" concern is inherently addressed by page re-creation.

**Proposed fix**: Remove `onShow()` entirely.
**Risk classification**: 🟡 LOW-MEDIUM — game.js is the most complex page; additional post-removal verification of the full `onInit`→`build()` access-check flow is warranted.

---

#### `tests/home-screen.test.js` — `page.onShow()` call (line 432)

**Exact test (lines 422–446):**
```js
test('home screen refreshes resume visibility onShow using loadMatchState', async () => {
  const activeState = serializePersistedMatchState({ status: 'active' })

  await runHomePageScenario(
    { matchStorageLoadResponses: [null, activeState] },
    async ({ createdWidgets, page, loadedMatchStorageKeys }) => {
      // initial render: no active state → no Resume button
      assert.deepEqual(getVisibleButtonLabels(createdWidgets), [...])

      page.onShow()             // ← calls the removed method
      await waitForAsyncPageUpdates()

      // after onShow: active state loaded → Resume button appears
      assert.deepEqual(getVisibleButtonLabels(createdWidgets), [...])
    }
  )
})
```

**Why it requires updating**: Once `onShow` is removed from `page/index.js`, calling `page.onShow()` in the test will invoke `undefined`, silently failing the assertion checks it was designed to protect.

**v1.0 equivalent behavior**: In v1.0, "returning to the home page" is equivalent to full page re-creation. The test should be updated to call `page.onInit()` (or simulate a fresh page construction) to model the v1.0 re-entry lifecycle correctly.

**Proposed fix**:
1. Rename the test to reflect v1.0 semantics: `'home screen refreshes resume visibility on re-init (v1.0 lifecycle) using loadMatchState'`
2. Replace `page.onShow()` with `page.onInit()` — this is the correct v1.0 re-entry point and already contains the identical state-refresh logic.

**Risk classification**: 🟡 LOW — behavioral intent is preserved; only the invoked method name changes.

---

## Chosen Approach

- **Proposed solution**: Remove all four `onShow()` method definitions from the page files (pure deletion, no new code). Update the single affected test to call `page.onInit()` instead of `page.onShow()`. Produce all three documentation deliverables in `.taskmaster/notes/`. No new wrapper functions, no feature-detection shims, no migration utilities.
- **Justification for simplicity**:
  - **Approach A (chosen — Remove `onShow` methods)**: In Zepp OS v1.0, every navigation event destroys the target page and reconstructs it from scratch — `onInit` is always called on entry. All four `onShow` bodies are provably already executed by the existing `onInit` + `build()` pair. The methods are dead code. Removing them is a zero-risk simplification.
  - **Approach B (rejected — Merge `onShow` body explicitly into `onInit`)**: Would introduce duplicate logic where `onInit` already performs the same operations. Creates redundancy and leaves the codebase in a noisier state.
  - **Approach C (rejected — Feature-detection compatibility wrapper)**: Adds accidental complexity, perpetuates the wrong mental model, and provides no runtime value on v1.0 targets.
- **Components to be modified/created**:
  - `page/index.js` — remove `onShow()` method body (lines 201–209)
  - `page/setup.js` — remove `onShow()` method body (lines 78–81)
  - `page/summary.js` — remove `onShow()` method body (lines 180–182)
  - `page/game.js` — remove `onShow()` method body (lines 557–567)
  - `tests/home-screen.test.js` — update one test to use `page.onInit()` instead of `page.onShow()`
  - `.taskmaster/notes/audit-findings.md` — create (subtask 32.2)
  - `.taskmaster/notes/risky-fixes.md` — create (subtask 32.5)
  - `.taskmaster/notes/lifecycle-audit-summary.md` — create (subtask 32.6)

---

## Implementation Steps

### Pre-Implementation Checkpoint (Subtask 32.1 + 32.2)

1. **Verify current test suite passes** before any changes:
   ```bash
   npm run test
   ```
   Record the baseline pass/fail count. All tests must pass on the baseline. If any test is already failing, stop and investigate before proceeding.

2. **Create `.taskmaster/notes/audit-findings.md`** with the full catalog of violations (file, line numbers, exact code snippets, incompatibility reason, proposed fix strategy). Use the pre-plan research above as the authoritative source. This is the deliverable for subtask 32.2.

   File structure:
   ```markdown
   # Lifecycle API Audit Findings
   ## Scope
   ## Summary Table
   ## Detailed Findings (one section per file)
   ### page/index.js
   ### page/setup.js
   ### page/summary.js
   ### page/game.js
   ## Already Compliant Files
   ## Test File Impact
   ```

### Phase 1 — Straightforward Page Fixes (Subtask 32.3)

3. **Fix `page/setup.js`** (⚪ TRIVIAL — start here, lowest risk):
   - Delete the entire `onShow()` method (lines 78–81, three lines including the closing brace).
   - Verify no other code in `setup.js` calls `this.onShow()`.
   - The `onInit` (lines 70–76) already resets `isNavigatingToGame = false` and `build()` (lines 83–85) already calls `renderSetupScreen()`.
   - No test files reference `page.onShow()` for setup — no test changes needed.

4. **Fix `page/summary.js`** (⚪ TRIVIAL):
   - Delete the entire `onShow()` method (lines 180–182).
   - Verify no other code in `summary.js` calls `this.onShow()`.
   - The `onInit` (lines 174–178) already calls `refreshFinishedMatchState()`.
   - No test files reference `page.onShow()` for summary — no test changes needed.

5. **Fix `page/index.js`** (🟡 LOW — requires test update):
   - Delete the entire `onShow()` method (lines 201–209, eight lines including the closing brace).
   - Verify no other code in `index.js` calls `this.onShow()`.
   - The `onInit` (lines 191–199) already resets all five flags to their initial values and calls `refreshSavedMatchState()`.

6. **Update `tests/home-screen.test.js`** to fix the broken `onShow` reference:
   - Locate the test at line 422: `test('home screen refreshes resume visibility onShow using loadMatchState', ...)`
   - Replace `page.onShow()` (line 432) with `page.onInit()`.
   - Update the test title to reflect v1.0 semantics: `'home screen refreshes resume visibility on re-init (v1.0 lifecycle) using loadMatchState'`
   - The behavioral intent of the test is preserved: `onInit` calls `refreshSavedMatchState()` which re-reads storage and re-renders, exactly replicating what `onShow` was supposed to do.

7. **Run QA gate** after Phase 1 changes:
   ```bash
   npm run test
   ```
   All tests must pass. If the updated home-screen test fails, debug the `onInit` re-invocation path in the test harness.

### Phase 2 — Complex Page Fix (Subtask 32.4)

8. **Fix `page/game.js`** (🟡 LOW-MEDIUM — verify full access-check flow):
   - Delete the entire `onShow()` method (lines 557–567, ten lines including the closing brace).
   - Before deleting, confirm the following invariant holds by code reading: in every reachable v1.0 path that lands on `game.js`, `onInit` is called first and `validateSessionAccess()` is invoked synchronously within `onInit`. Specifically:
     - Navigation from `setup.js` → `onInit` → `validateSessionAccess()` ✅
     - Direct page load → `onInit` → `validateSessionAccess()` ✅
     - Back navigation from any page → full page re-creation → `onInit` → `validateSessionAccess()` ✅
   - Confirm `build()` correctly handles both `isSessionAccessGranted = true` and `isSessionAccessGranted = false` branches.
   - No test files reference `page.onShow()` for game — no test changes needed (verified by audit).

9. **Run QA gate** after Phase 2:
   ```bash
   npm run test
   ```
   All tests must pass. Pay special attention to game-screen tests (`tests/game-screen-layout.test.js`, `tests/edge-case-handling.test.js`, `tests/app-undo-integration.test.js`).

### Phase 3 — Documentation (Subtasks 32.5 + 32.6)

10. **Create `.taskmaster/notes/risky-fixes.md`** (subtask 32.5 deliverable):
    - Document that all four violations were classified as TRIVIAL or LOW-MEDIUM risk.
    - Confirm no high-risk or deferred fixes are needed.
    - Note that `page/game.js` was LOW-MEDIUM and warranted extra post-removal verification (completed in step 8).
    - Mark no follow-up subtasks required.

    File structure:
    ```markdown
    # Risky Lifecycle Fix Assessment
    ## Risk Classification Summary
    ## page/game.js — Low-Medium Risk Analysis
    ## Conclusion: No Deferred Fixes Required
    ```

11. **Create `.taskmaster/notes/lifecycle-audit-summary.md`** (subtask 32.6 deliverable):
    - Complete final summary: violations found, files modified, test updates, risk assessment.
    - Confirm zero remaining `onShow`/`onHide`/`onResume`/`onPause` occurrences in production code.
    - Record the post-fix test suite pass state.

    File structure:
    ```markdown
    # Lifecycle API Audit — Final Summary
    ## Audit Scope and Date
    ## Violations Found (4 methods across 4 files)
    ## Files Modified
    ## Test Files Updated
    ## Compliant Files (no changes needed)
    ## Post-Fix Verification
    ## v1.0 Lifecycle Reference
    ```

12. **Final verification search** — run a pattern search to confirm zero violations remain:
    ```bash
    grep -rn "onShow\|onHide\|onResume\|onPause" page/ --include="*.js"
    ```
    The only acceptable output is zero results. If any remain, treat as a blocking regression.

---

## Replacement Pattern Reference (v1.0 Equivalents)

| Deprecated Method | v1.0 Equivalent | Rationale |
|-------------------|-----------------|-----------|
| `onShow()` | `onInit()` + `build()` | v1.0 always creates fresh page on navigation; `onInit` is the universal entry point |
| `onHide()` | `onDestroy()` | v1.0 has no hide/show cycle; destruction is the only exit event |
| `onResume()` | `onInit()` (via fresh page) | No page-stack persistence in v1.0 |
| `onPause()` | `onDestroy()` (guarded save) | Use `onDestroy` with state persistence guards |

**Core v1.0 lifecycle contract:**
```
onInit(params)   ← entry: parse params, init state, load data
build()          ← render: create all UI widgets
onDestroy()      ← exit: persist state, release resources
```

---

## Validation

- **Success criteria**:
  1. Zero occurrences of `onShow`, `onHide`, `onResume`, `onPause` in any `page/*.js` file.
  2. `npm run test` passes with 100% of existing tests (no regressions).
  3. The refactored home-screen test correctly validates the v1.0 re-entry behavior via `onInit()`.
  4. All three `.taskmaster/notes/` documentation files are created and complete.
  5. `page/history.js` and `page/history-detail.js` remain untouched (already compliant).

- **Checkpoints**:

  | Checkpoint | After Step | Condition to Pass |
  |------------|-----------|-------------------|
  | **CP-0: Baseline** | Step 1 | `npm run test` passes with no failures |
  | **CP-1: Phase 1 complete** | Step 7 | `npm run test` passes; `page/setup.js`, `page/summary.js`, `page/index.js` have no `onShow`; updated home-screen test passes |
  | **CP-2: Phase 2 complete** | Step 9 | `npm run test` passes; `page/game.js` has no `onShow`; game-screen tests all pass |
  | **CP-3: Final verification** | Step 12 | `grep` confirms zero violations in `page/`; all docs created |

- **Rollback notes**:
  - All changes are pure deletions of dead code methods plus a single test method-name swap. Git revert is the rollback strategy if any unexpected behaviour appears.
  - **`page/game.js` mitigation**: If removing `onShow` uncovers an edge case in the access-check flow, restore `onShow` body in `onInit` explicitly (merge, not re-add `onShow`) and document the specific failure scenario before re-attempting.
  - There is no cross-cutting risk to `app.js`, utilities, or navigation routing from this change.

- **Regression focus areas** (manual simulator smoke test post-fixes):
  - Home screen: navigate away and back; verify saved match state is correctly shown/hidden.
  - Setup screen: navigate away and back; verify `isNavigatingToGame` guard is respected on re-entry.
  - Summary screen: navigate to summary from game; verify finished match data renders correctly.
  - Game screen: start a game, navigate back, start again; verify session access control prevents re-entry without valid state.
  - Keep-awake (Task 25 feature): verify `hmApp.setScreenKeep` still functions correctly in `app.js onCreate` — unaffected by this change.
