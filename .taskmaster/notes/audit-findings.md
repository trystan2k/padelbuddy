# Lifecycle API Audit Findings

## Scope

Exhaustive pattern search for `onShow|onHide|onResume|onPause` across all `*.js` files in the repository.
Applies to Task #32: Audit & Fix Zepp OS v1.0 Lifecycle API Usage.

In Zepp OS v1.0, the only valid page lifecycle methods are:
- `onInit(params)` — entry point; parse params, initialize state, load data
- `build()` — render all UI widgets
- `onDestroy()` — exit; persist state, release resources

Any other lifecycle methods (`onShow`, `onHide`, `onResume`, `onPause`) are silently ignored by the v1.0 runtime — they are dead code.

---

## Summary Table

| File | Line | Violation | Severity | Action |
|------|------|-----------|----------|--------|
| `page/index.js` | 202–210 | `onShow()` method defined | ❌ Invalid | Removed |
| `page/setup.js` | 79–82 | `onShow()` method defined | ❌ Invalid | Removed |
| `page/summary.js` | 181–183 | `onShow()` method defined | ❌ Invalid | Removed |
| `page/game.js` | 558–568 | `onShow()` method defined | ❌ Invalid | Removed |
| `page/history.js` | — | No violations | ✅ Compliant | No action |
| `page/history-detail.js` | — | No violations | ✅ Compliant | No action |
| `tests/home-screen.test.js` | 432 | `page.onShow()` call in test | ⚠️ Test-only | Updated |

No occurrences of `onHide`, `onResume`, or `onPause` anywhere in the codebase.

---

## Detailed Findings

### page/index.js

**Violation:** `onShow()` method (lines 202–210)

**Exact body:**
```js
onShow() {
  this.isStartingNewGame = false
  this.isClearDataArmed = false
  this.savedMatchState = null
  this.hasSavedGame = false
  this.savedMatchStateFromHandoff = false
  this.renderHomeScreen()
  this.refreshSavedMatchState()
},
```

**Incompatibility reason:** `onShow` is not a recognised lifecycle hook in Zepp OS v1.0. The runtime silently ignores unknown methods — no error is thrown — but the code inside **never executes** on any device/simulator running v1.0.

**Why already covered by v1.0 lifecycle:**
- `onInit()` already sets every flag to the same initial values (`false`/`null`) and calls `refreshSavedMatchState()`, which itself calls `renderHomeScreen()` before returning.
- `build()` calls `renderHomeScreen()` again as a complete render pass.
- In v1.0 navigation, every page entry creates a brand-new page object; `onInit` is always called. There is no "return to existing page instance" scenario.

**Risk classification:** 🟡 LOW — fully covered by `onInit`; one test required updating.
**Fix applied:** Removed `onShow()` method entirely.

---

### page/setup.js

**Violation:** `onShow()` method (lines 79–82)

**Exact body:**
```js
onShow() {
  this.isNavigatingToGame = false
  this.renderSetupScreen()
},
```

**Incompatibility reason:** Same as above — not a v1.0 lifecycle method; silently never called.

**Why already covered by v1.0 lifecycle:**
- `onInit()` already sets `isNavigatingToGame = false` along with all other fields.
- `build()` already calls `renderSetupScreen()`.

**Risk classification:** ⚪ TRIVIAL — completely redundant; no test coverage to update.
**Fix applied:** Removed `onShow()` method entirely.

---

### page/summary.js

**Violation:** `onShow()` method (lines 181–183)

**Exact body:**
```js
onShow() {
  this.refreshFinishedMatchState()
},
```

**Incompatibility reason:** Not a v1.0 lifecycle method; silently never called.

**Why already covered by v1.0 lifecycle:**
- `onInit()` already calls `refreshFinishedMatchState()`, which internally calls `renderSummaryScreen()`.
- `build()` calls `renderSummaryScreen()` and `registerGestureHandler()` again as a complete render pass.

**Risk classification:** ⚪ TRIVIAL — completely redundant; no test coverage to update.
**Fix applied:** Removed `onShow()` method entirely.

---

### page/game.js

**Violation:** `onShow()` method (lines 558–568)

**Exact body:**
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
},
```

**Incompatibility reason:** Not a v1.0 lifecycle method; silently never called.

**Why already covered by v1.0 lifecycle:**
- `onInit()` always calls `this.validateSessionAccess()` synchronously at the end of initialization, populating `this.isSessionAccessGranted` and navigating away if denied.
- `build()` gates on `this.isSessionAccessGranted`: if false, renders a blank background (nav already triggered in `onInit`); if true, calls `keepScreenOn()`, `ensureRuntimeState()`, `renderGameScreen()`, and `registerGestureHandler()`.
- In v1.0, navigating back to the game page always triggers a full fresh `onInit` + `build()` cycle — the "re-validate on return" concern is inherently addressed by page re-creation.

**Risk classification:** 🟡 LOW-MEDIUM — game.js is the most complex page; additional post-removal verification of the full `onInit`→`build()` access-check flow was performed.
**Fix applied:** Removed `onShow()` method entirely.

---

## Already Compliant Files

### page/history.js

No violations found. No lifecycle methods other than `onInit`, `build`, and `onDestroy` are present. No changes required.

### page/history-detail.js

No violations found. A comment in this file explicitly notes the v1.0 lifecycle intent. No changes required.

---

## Test File Impact

### tests/home-screen.test.js (line 432)

**Violation:** Direct call `page.onShow()` in one test.

**Test before fix:**
```js
test('home screen refreshes resume visibility onShow using loadMatchState', async () => {
  // ...
  page.onShow()
  await waitForAsyncPageUpdates()
  // ...
})
```

**Reason for update:** Once `onShow` was removed from `page/index.js`, calling `page.onShow()` in the test would invoke `undefined`, silently failing the assertion checks.

**Fix applied:**
1. Test renamed to: `'home screen refreshes resume visibility on re-init (v1.0 lifecycle) using loadMatchState'`
2. `page.onShow()` replaced with `page.onDestroy(); page.onInit(); page.build()` — this correctly simulates the v1.0 page re-creation lifecycle (old page destroyed, new page created, rendered).

**Behavioral intent preserved:** `onInit` calls `refreshSavedMatchState()` which re-reads storage and re-renders, exactly replicating what `onShow` was supposed to do. The full lifecycle simulation (`onDestroy` → `onInit` → `build`) accurately models v1.0 navigation semantics.
