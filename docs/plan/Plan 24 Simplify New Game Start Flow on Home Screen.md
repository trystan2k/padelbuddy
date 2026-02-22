## Task Analysis
- Main objective: Simplify the Home Screen "Start New Game" button flow by removing the hard reset confirmation mechanism, allowing users to immediately start a new game without an intermediate confirmation step. This reduces friction in the user experience on a constrained watch interface.
- Identified dependencies: Existing `startNewMatchFlow` orchestrator in `utils/start-new-match-flow.js` (already handles session clear, manager reset, and navigation); Home Screen page lifecycle and UI rendering in `page/index.js`; the confirmation mechanism's state variables (`isHardResetConfirmationArmed`, `hardResetConfirmationTimerId`) and associated timer logic.
- System impact: Low-medium on Home Screen UX (positive: faster action; consideration: removes accidental-press protection); low on codebase complexity (removes code); no impact on scoring engine, persistence layer, or other pages.

## Chosen Approach
- Proposed solution: Remove the confirmation mechanism entirely by deleting the confirmation window constant, state variables, timer management functions, and the conditional flow that required two button presses. Route `handleStartNewGame` directly to `startNewMatchFlow` without intermediate state checks.
- Justification for simplicity: Deepthink comparison evaluated three approaches:
  - (A) Keep confirmation but reduce timeout from 2500ms → 1000ms: Rejected as still adds friction and retains timer complexity on a watch with limited interaction precision.
  - (B) Replace timer with modal/dialog confirmation: Rejected as overengineered for Zepp OS watch context (modals are intrusive and add layout complexity on small screens).
  - (C) Remove confirmation entirely (chosen): Simplest solution that aligns with the watch app paradigm where accidental taps are rare and easily recoverable (user can navigate back). Removes ~71 lines of timer/state logic with no new code paths.
- Components to be modified/created: `page/index.js` only (removal of confirmation mechanism). No new files; no changes to utilities or other pages.

## Implementation Steps
1. **Validate assumptions and UX contract**: Confirm that removing confirmation is acceptable UX for watch form factor; verify `startNewMatchFlow` already provides safe reset behavior (it does - clears session, resets manager, navigates to setup); confirm non-goals (no scoring changes, no persistence contract changes, no other page modifications).

2. **Remove confirmation window constant**: Delete `HOME_HARD_RESET_CONFIRMATION_WINDOW_MS = 2500` constant as it becomes dead code.

3. **Remove confirmation state variables from `onInit`**: Remove `this.isHardResetConfirmationArmed = false` and `this.hardResetConfirmationTimerId = null` initializations.

4. **Remove confirmation cleanup from `onShow`**: Remove `this.disarmHardResetConfirmation()` call that resets confirmation state when returning to Home.

5. **Remove confirmation cleanup from `onDestroy`**: Remove `this.clearHardResetConfirmationTimer()` call that cleans up timer on page destruction.

6. **Simplify button text logic in `renderHomeScreen`**: Replace conditional `startNewGameButtonText` assignment (which checked `isHardResetConfirmationArmed` to show "Confirm Start New Game") with simple constant text `gettext('home.startNewGame')`.

7. **Delete timer management functions**: Remove three functions entirely:
   - `clearHardResetConfirmationTimer()` - cleared the setTimeout reference
   - `disarmHardResetConfirmation(options)` - reset armed state with optional re-render
   - `armHardResetConfirmation()` - set armed state and started auto-disarm timer

8. **Simplify `handleStartNewGame` flow**: Remove the conditional check for `isHardResetConfirmationArmed` and the branching logic. Rename `handleHardResetStartNewGame` back to `handleStartNewGame` and remove the old wrapper function that handled confirmation arming.

9. **Remove confirmation disarm from `handleResumeGame`**: Remove the `this.disarmHardResetConfirmation({ shouldRender: true })` call that was clearing confirmation state when user chose to resume instead.

10. **Execute verification**: Run existing test suite (`npm run test`) to confirm no regressions; verify Home Screen renders correctly with single "Start New Game" button; verify button immediately triggers new match flow.

## Validation
- Success criteria:
  - Home Screen displays single "Start New Game" button (no conditional text changes)
  - Button press immediately triggers `startNewMatchFlow` and navigates to setup page
  - No timer-related state or logic remains in `page/index.js`
  - All existing tests pass
  - Code is cleaner (~71 lines removed)

- Checkpoints:
  - **Pre-implementation checkpoint** (after Step 1): Confirm UX decision is intentional and `startNewMatchFlow` provides adequate safety guarantees.
  - **Implementation checkpoint** (after Steps 2-9): Manual verification that button works immediately; no console errors; no orphaned state variables.
  - **Post-implementation checkpoint** (after Step 10): Full test suite passes (`npm run test`); diff review confirms only removal changes (no new logic added).

- Rollback considerations: Minimal risk - if confirmation is deemed necessary post-release, the mechanism can be restored from git history (commit before b18e8e8). No data loss risk since `startNewMatchFlow` safely clears both persisted and runtime state.
