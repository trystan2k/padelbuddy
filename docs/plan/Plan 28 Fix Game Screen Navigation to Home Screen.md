## Task Analysis
- Main objective: Fix the navigation logic in `page/game.js` so that both the 'Return to Home' button and the swipe-back gesture navigate directly to the Home Screen (`page/index`) instead of the Setup Screen (`page/setup`).
- Identified dependencies: 
  - Existing navigation patterns in `page/game.js` (`navigateToHomePage`, `handleBackToHome`)
  - Page lifecycle system (`onInit`, `onShow`, `onHide`, `onDestroy`) - `onBack` lifecycle callback needs to be added
  - State persistence via `saveCurrentRuntimeState()`
  - Test suite in `tests/game-screen-layout.test.js` that verifies navigation behavior
- System impact: Low and highly localized to `page/game.js` and related tests. The change affects only the navigation destination and does not modify scoring, persistence, or state management logic.

### Root Cause Analysis
The current navigation flow is:
```
Home (page/index) → Setup (page/setup) → Game (page/game)
```

The `navigateToHomePage()` function currently calls `hmApp.goBack()` first, which navigates to the previous page in the stack (Setup), not Home. Additionally, there is no `onBack()` lifecycle handler to intercept the swipe-back gesture, so it defaults to `goBack()` behavior.

## Chosen Approach
- Proposed solution: Modify `navigateToHomePage()` to always use direct navigation (`hmApp.gotoPage({ url: 'page/index' })`) and add an `onBack()` lifecycle handler to intercept swipe-back gestures with the same behavior.
- Justification for simplicity: Deepthink evaluation of approaches:
  - **Approach A (chosen)**: Remove `goBack()` and always use `gotoPage` to Home. Add `onBack()` handler. Simplest change, minimal code modification, reuses existing patterns.
  - **Approach B (rejected)**: Clear navigation stack and navigate. Overengineered - Zepp OS has limited stack manipulation APIs, and this adds unnecessary complexity.
  - **Approach C (rejected)**: Use page replacement APIs. More complex without providing additional benefit for this use case.
- Components to be modified/created:
  - `page/game.js`: Modify `navigateToHomePage()`, add `onBack()` handler
  - `tests/game-screen-layout.test.js`: Update tests to expect `gotoPage` instead of `goBack`

## Implementation Steps

### Step 1: Modify navigateToHomePage() method
**File**: `page/game.js`

Remove the `hmApp.goBack()` fallback and always use direct navigation to `page/index`:

```javascript
navigateToHomePage() {
  if (typeof hmApp === 'undefined' || typeof hmApp.gotoPage !== 'function') {
    return
  }

  try {
    hmApp.gotoPage({
      url: 'page/index'
    })
  } catch {
    // Non-fatal: navigation failed
  }
}
```

**Risk**: Low. The `gotoPage` API is standard and well-supported.

### Step 2: Add onBack() lifecycle handler
**File**: `page/game.js`

Add an `onBack()` lifecycle handler after `onDestroy()` to intercept swipe-back gestures:

```javascript
onBack() {
  // Save state before navigating
  this.saveCurrentRuntimeState({ force: true })
  
  // Navigate directly to Home Screen
  if (typeof hmApp !== 'undefined' && typeof hmApp.gotoPage === 'function') {
    try {
      hmApp.gotoPage({
        url: 'page/index'
      })
    } catch {
      // Non-fatal: navigation failed
    }
  }
  
  // Return true to prevent default back behavior
  return true
}
```

**Risk**: Low. The `onBack()` lifecycle callback is a standard Zepp OS Page API.

### Step 3: Update existing tests
**File**: `tests/game-screen-layout.test.js`

Update the test that currently expects `goBack` to be called:

1. **Test: "game back-home control navigates back"** - Change assertion to expect `gotoPage` with `page/index` instead of `goBack`

2. **Test: "game back-home control falls back to home route when goBack is unavailable"** - Update description and remove the `goBack` deletion logic since it's no longer used

3. **Add new test**: "game onBack handler saves state and navigates to home" - Verify the `onBack()` handler works correctly

### Step 4: Add tests for onBack handler
**File**: `tests/game-screen-layout.test.js`

Add new test cases:
- Verify `onBack()` returns `true` (prevents default behavior)
- Verify `onBack()` calls `saveCurrentRuntimeState` before navigation
- Verify `onBack()` navigates to `page/index`

### Step 5: Run QA gate and manual verification
- Run `npm run test` to verify all tests pass
- Manual verification in simulator:
  1. Start a new game from Home Screen
  2. Score some points
  3. Tap 'Return to Home' button → verify navigates to Home Screen
  4. Resume game → verify state is preserved
  5. Perform swipe-back gesture → verify navigates to Home Screen
  6. Resume game → verify state is preserved

## Validation

### Success Criteria
1. **Button navigation**: Tapping the 'Return to Home' button from Game Screen navigates directly to Home Screen (`page/index`) without passing through Setup Screen
2. **Swipe-back navigation**: Performing a swipe-back gesture from Game Screen navigates directly to Home Screen
3. **State preservation**: Match state is saved before navigation in both cases
4. **Resume functionality**: The Resume Game button appears correctly on Home Screen after exiting an active match
5. **No regression**: Starting a new game from Home Screen still functions correctly

### Checkpoints
- **Pre-implementation checkpoint**: Confirm current behavior by reviewing `navigateToHomePage()` and identifying absence of `onBack()` handler
- **Implementation checkpoint A (Steps 1-2)**: Code changes complete, `onBack()` handler added
- **Implementation checkpoint B (Steps 3-4)**: All tests updated and passing
- **Post-implementation checkpoint (Step 5)**: `npm run test` passes, manual verification on simulator confirms correct navigation behavior

### Regression Test Checklist
- [ ] Start new game from Home Screen → Game Screen loads correctly
- [ ] Score points → State updates correctly
- [ ] Tap 'Return to Home' → Navigates to Home Screen (not Setup)
- [ ] Resume Game from Home → State restored correctly
- [ ] Swipe-back from Game Screen → Navigates to Home Screen (not Setup)
- [ ] Match finished → Summary Screen navigation still works
- [ ] No active match → Setup Screen validation still redirects correctly

## Notes
- The navigation stack behavior (Home → Setup → Game) is intentional for the new game flow
- This fix ensures users can exit to Home regardless of how they got to the Game Screen
- The `onBack()` handler returning `true` is critical to prevent the default back behavior
- State persistence before navigation is already implemented via `saveCurrentRuntimeState({ force: true })`
