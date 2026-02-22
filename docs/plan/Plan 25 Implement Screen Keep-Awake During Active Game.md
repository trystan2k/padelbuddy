## Task Analysis
- Main objective: Implement Taskmaster Task 25 (`Implement Screen Keep-Awake During Active Game`) to prevent the watch screen from turning off during an active padel match, ensuring users can track scores without interruption and the app returns correctly if the screen does turn off.
- Identified dependencies: Task 8 (game interaction and rendering), Task 9 (navigation & lifecycle handling), and Task 14 (lifecycle persistence triggers) are complete; the game page lifecycle (`onInit`, `build`, `onShow`, `onHide`, `onDestroy`) and app-level lifecycle (`onCreate`, `onDestroy`) patterns are already established.
- System impact: Low and highly localized to two files: `app.js` (app-level screen keep registration) and `page/game.js` (page-level bright screen control). No changes to scoring logic, persistence, or navigation flows.

## Chosen Approach
- Proposed solution: Two-tier screen management strategy:
  1. **App-level screen keep**: Register `hmApp.setScreenKeep(true)` in `App.onCreate()` so that if the screen turns off while the app is active, the watch re-launches the app instead of returning to the watchface.
  2. **Page-level bright screen control**: Call `hmSetting.setBrightScreen(maxSeconds)` when the game page becomes visible (in `build()`), and cancel it with `hmSetting.setBrightScreenCancel()` in `onDestroy()` to release the bright screen lock when leaving the game.
- Justification for simplicity: Deepthink evaluated three approaches:
  - **Approach A (App-level only)**: Only set `setScreenKeep` at app level. Rejected: This handles recovery after screen-off but doesn't prevent the screen from turning off during gameplay, which disrupts user experience.
  - **Approach B (Page-only bright screen)**: Only use `setBrightScreen` on the game page. Rejected: If the screen still turns off (timeout, wrist down), the user returns to watchface and loses context.
  - **Approach C (Both tiers)**: Combine app-level `setScreenKeep` with page-level `setBrightScreen`. Chosen: Provides the best user experience by preventing screen timeout during gameplay AND ensuring graceful recovery if timeout occurs.
- Components to be modified/created: `app.js` (5 lines added in `onCreate`), `page/game.js` (23 lines added: two new methods `keepScreenOn()` and `releaseScreenOn()`, plus calls in `build()` and `onDestroy()`).

## Implementation Steps
1. **Pre-implementation assumptions check**: Review Zepp OS documentation for `hmApp.setScreenKeep` and `hmSetting.setBrightScreen` / `setBrightScreenCancel` APIs. Confirm these APIs exist and understand their behavior across API levels. Document that the maximum bright screen time is `2147483` seconds (max signed 32-bit integer in seconds).

2. **Implement app-level screen keep (app.js)**:
   - In `App.onCreate()`, add a guarded call to `hmApp.setScreenKeep(true)`.
   - Wrap the call in a capability check (`typeof hmApp !== 'undefined' && typeof hmApp.setScreenKeep === 'function'`) to handle simulator environments where the API may be unavailable.
   - This ensures the app relaunches instead of returning to watchface if the screen turns off.

3. **Implement page-level bright screen control methods (page/game.js)**:
   - Create `keepScreenOn()` method: Call `hmSetting.setBrightScreen(2147483)` with capability check and try-catch for simulator compatibility.
   - Create `releaseScreenOn()` method: Call `hmSetting.setBrightScreenCancel()` with capability check and try-catch.
   - Use try-catch blocks because these APIs may throw or be undefined in the simulator environment.

4. **Wire bright screen control to page lifecycle**:
   - Call `this.keepScreenOn()` at the start of `build()` method, after session validation check but before rendering.
   - Call `this.releaseScreenOn()` in `onDestroy()` before other cleanup, to ensure the bright screen lock is released when leaving the game page.

5. **Add defensive coding for API unavailability**:
   - All screen-related API calls must be wrapped in capability checks (`typeof hmSetting !== 'undefined'`) and try-catch blocks.
   - Non-fatal errors should be silently caught to avoid crashing the app on simulator or older devices.

6. **Run QA gate `npm run test`**: Verify all existing tests pass and the new code doesn't introduce regressions.

7. **Manual verification on simulator and device**:
   - **Simulator test**: Launch app, start a game, verify no errors in console. The bright screen API may not work but should fail gracefully.
   - **Real device test**: Start a game, wait beyond normal screen timeout (typically 5-30 seconds), confirm screen stays on. If screen is forced off (e.g., wrist down for extended period), confirm app relaunches correctly when screen is reactivated.

## Validation
- Success criteria:
  - During active gameplay on a real device, the screen remains on indefinitely (until user manually exits or match ends).
  - If the screen does turn off (rare edge case, very long wrist-down), the app relaunches instead of returning to watchface.
  - The implementation is resilient to simulator environments where APIs may be unavailable (no crashes, graceful degradation).
  - Existing game scoring, persistence, and navigation behavior remains intact.

- Checkpoints:
  - **Pre-implementation checkpoint (step 1)**: Confirm API documentation and behavior; understand maximum bright screen value and fallback requirements.
  - **Implementation checkpoint A (steps 2-3)**: App-level `setScreenKeep` added with capability guards; page-level `keepScreenOn`/`releaseScreenOn` methods implemented with try-catch.
  - **Implementation checkpoint B (steps 4-5)**: Lifecycle wiring complete; defensive coding verified; code review confirms no crash paths on API unavailability.
  - **Post-implementation checkpoint (steps 6-7)**: `npm run test` passes; manual verification on both simulator (graceful degradation) and real device (screen stays on during game).
