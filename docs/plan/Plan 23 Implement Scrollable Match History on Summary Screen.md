## Task Analysis
- Main objective: Enhance the existing Match Summary Screen (`page/summary.js`) by replacing static history text with a scrollable `SCROLL_LIST` widget to accommodate longer match histories, increase body font scale from 0.04 to 0.08 for improved readability, and remove the "Start New Game" button leaving only the "Home" button.
- Identified dependencies: Task 18 (Match Summary Screen implementation), Task 16 (Set Completion and Match Completion Logic providing `setHistory` data), existing `page/summary.js` layout tokens and widget patterns, Zepp OS `SCROLL_LIST` widget API, and established responsive unit conventions (`rpx` preference, design-width baseline).
- System impact: Medium on Summary Screen UX (scrollable list replaces static text), low on data contracts (`setHistory` array structure unchanged), low on navigation flow (single button instead of two), and low risk of regression due to isolated widget replacement.

## Chosen Approach
- Proposed solution: Refactor the history section of `page/summary.js` to use `hmUI.widget.SCROLL_LIST` instead of multiple `TEXT` widgets, while maintaining the existing card-based visual hierarchy. Remove the "Start New Game" button and its associated handler logic. Increase the body font scale in `SUMMARY_TOKENS.fontScale.body` from 0.04 to 0.08 for better legibility on small watch screens.
- Justification for simplicity: Deepthink compared three approaches:
  1. **CSS-like overflow container** (rejected - Zepp OS doesn't support overflow scroll on TEXT widgets)
  2. **Paginated history with prev/next buttons** (rejected - adds unnecessary UI complexity and cognitive load for simple set history)
  3. **Native SCROLL_LIST widget** (chosen - Zepp OS provides built-in scroll handling with minimal configuration, matches existing widget patterns in the codebase)
  
  Option 3 is the simplest effective approach because: the `SCROLL_LIST` is purpose-built for scrollable content, requires only data array + config mapping, integrates seamlessly with existing card layout, and maintains touch interaction consistency with Zepp OS conventions.
- Components to be modified: `page/summary.js` only (single file change):
  - `SUMMARY_TOKENS.fontScale.body`: 0.04 → 0.08
  - History section: replace static `TEXT` widgets with `SCROLL_LIST` widget
  - Actions section: remove "Start New Game" button, keep "Home" button only
  - Remove unused `startNewMatchFlow` import and `isStartingNewGame` state
  - Adjust header height and spacing to accommodate larger font and scrollable area

## Implementation Steps

1. **Pre-implementation analysis and assumptions lock**
   - Confirm the `setHistory` data structure from Task 16 remains unchanged (array of `{setNumber, teamAGames, teamBGames}`)
   - Confirm the `SCROLL_LIST` widget API contract (requires `data_array` with key-matched objects, `item_config` with `text_view` definition)
   - Confirm font scale increase won't cause text clipping in existing header elements
   - Define non-goals: no changes to winner calculation, no changes to score display, no changes to data persistence

2. **Update font scale token**
   - In `SUMMARY_TOKENS.fontScale`, change `body` from `0.04` to `0.08`
   - This affects all text rendered with `fontScale.body`, primarily the history list items
   - Rationale: Small watch screens require larger text for quick glance readability

3. **Calculate dynamic history layout metrics**
   - Compute `historyTitleHeight` (24-32px clamped) for the "Set History" label
   - Compute `historyBodyY` and `historyBodyHeight` for the scrollable area
   - Compute `historyRowHeight` based on the new font scale: `width * fontScale.body * 2.2` (clamped 28-56px)
   - Ensure `historyBodyHeight` provides adequate space for at least 2-3 visible items

4. **Replace static TEXT widgets with SCROLL_LIST widget**
   - Transform `viewModel.historyLines` array into `data_array` format: `[{ line: 'Set 1: 6-4' }, { line: 'Set 2: 4-6' }, ...]`
   - Configure `SCROLL_LIST` with:
     - `item_config`: single type (type_id: 1) with `text_view` mapping to `line` key
     - `item_height`: calculated `historyRowHeight`
     - `item_bg_color`: card background color for visual consistency
     - Text styling matches `SUMMARY_TOKENS` (color, text_size from font scale)
   - Position widget at `historyBodyY` with `historyBodyHeight`

5. **Remove "Start New Game" button and associated logic**
   - Delete the second button creation in actions section
   - Remove `isStartingNewGame` state tracking (if present)
   - Remove `startNewMatchFlow` import (no longer used)
   - Adjust actions section to single-button layout (center "Home" button)

6. **Adjust header and spacing layout**
   - Recalculate `actionsSectionHeight` for single button (no longer two buttons stacked)
   - Adjust `headerHeight` calculation to balance with increased history area
   - Ensure `historyGap` provides adequate visual separation between header card and history card

7. **Test and validate scroll behavior**
   - Verify 1-set match displays single line correctly (no scroll needed)
   - Verify 3-set match enables scrolling to see all entries
   - Verify 5-set match (theoretical max) scrolls smoothly
   - Test on both round (GTS 3: 390x390) and square (GTR 3: 454x454) screen dimensions

## Validation

- **Success criteria**:
  1. Match history displays in a scrollable list using `SCROLL_LIST` widget
  2. Each set displays as "Set N: X-Y" format (e.g., "Set 1: 6-4")
  3. Font size is legible with scale 0.08 (doubled from original 0.04)
  4. Only "Home" button remains on Summary Screen
  5. "Home" button navigates correctly to `page/index`
  6. Scrollable list handles 1-set, 2-set, 3-set, and 5-set matches without overflow issues
  7. No unused imports or dead code remains

- **Checkpoints**:
  - **Pre-implementation checkpoint** (after Step 1): Confirm data contract and widget API understanding; validate that `setHistory` format matches expectations from Task 16
  - **Implementation checkpoint A** (after Steps 2-4): Verify font scale change doesn't break existing text; confirm `SCROLL_LIST` renders single-item history correctly
  - **Implementation checkpoint B** (after Steps 5-6): Confirm single-button layout looks balanced; verify header/history proportions are visually harmonious
  - **Post-implementation checkpoint** (after Step 7): Execute visual QA on simulator with multiple match lengths (1, 2, 3, 5 sets); verify scroll interaction feels responsive; run `npm run test` to catch regressions

- **Rollback considerations**:
  - If `SCROLL_LIST` causes performance issues on older devices, fallback to static text with max 3 visible lines
  - If font scale 0.08 causes layout overflow on smaller screens, reduce to 0.06 as intermediate value
  - If removing "Start New Game" causes user confusion, the functionality is still accessible via Home → New Match flow
