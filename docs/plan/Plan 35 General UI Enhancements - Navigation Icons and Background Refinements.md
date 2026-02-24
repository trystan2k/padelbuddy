# Plan 035: General UI Enhancements - Navigation Icons and Background Refinements

## Task Analysis

### Main Objective
Remove gray backgrounds from page containers across multiple screens, replace text-based "Back to Home" buttons with home icon buttons, and implement swipe-right-to-exit gesture on the Home Screen.

### Identified Dependencies
- **Task 6** (completed): Game Screen Layout Construction
- **Task 7** (completed): Game Screen Interaction & Binding
- **Task 18** (completed): Match Summary Screen
- **Task 22** (completed): Game Screen UI Redesign
- **Task 23** (completed): Scrollable Match History

### System Impact
- **Files to modify**: `page/index.js`, `page/game.js`, `page/summary.js`, `page/history.js`, `page/history-detail.js`
- **No new files required**: `home-icon.png` already exists in `assets/gtr-3/` and `assets/gts-3/`
- **Visual-only changes**: No business logic modifications required
- **User experience improvement**: Cleaner UI with icons instead of text buttons

---

## Chosen Approach

### Proposed Solution

1. **Gray Background Removal**: Change `cardBackground` color value from `0x111318` (dark gray) to `0x000000` (transparent/black) in the design tokens of affected pages. This is the simplest approach that maintains widget structure while achieving the visual goal.

2. **Icon Button Replacement**: Use the existing pattern from `history.js` for image-based buttons:
   ```javascript
   this.createWidget(hmUI.widget.BUTTON, {
     x: iconX,
     y: iconY,
     w: -1,
     h: -1,
     normal_src: 'home-icon.png',
     press_src: 'home-icon.png',
     click_func: () => this.handleNavigateHome()
   })
   ```

3. **Swipe-Right Gesture**: Implement gesture handler using `hmApp.registerGestureEvent` pattern from `game.js`, calling `hmApp.goBack()` to exit from the root page.

### Justification for Simplicity

| Approach | Rejected | Reason |
|----------|----------|--------|
| Remove FILL_RECT widgets entirely | Partial | More complex, requires restructuring layout calculations |
| Add borders/separators instead | Yes | Overengineered for the stated goal |
| Use transparent hex value | **Selected** | Simplest, maintains structure, easily reversible |

### Components to be Modified/Created

| File | Changes |
|------|---------|
| `page/index.js` | Add gesture handler for swipe-right to exit |
| `page/game.js` | Replace text button with home icon button, update tokens |
| `page/summary.js` | Replace text button with home icon button, update tokens |
| `page/history.js` | Update cardBackground token |
| `page/history-detail.js` | Update cardBackground token |

---

## Implementation Steps

### Step 1: Update Design Tokens - Remove Gray Backgrounds (Subtask 35.1)

**Files**: `page/game.js`, `page/summary.js`, `page/history.js`, `page/history-detail.js`

**Changes**: Update the `cardBackground` color in each page's design tokens from `0x111318` to `0x000000`.

#### 1.1 Update `page/game.js` (line ~18)
```javascript
// BEFORE
cardBackground: 0x111318,

// AFTER
cardBackground: 0x000000,
```

#### 1.2 Update `page/summary.js` (line ~17)
```javascript
// BEFORE
cardBackground: 0x111318,

// AFTER
cardBackground: 0x000000,
```

#### 1.3 Update `page/history.js` (line ~13)
```javascript
// BEFORE
cardBackground: 0x111318,

// AFTER
cardBackground: 0x000000,
```

#### 1.4 Update `page/history-detail.js` (line ~12)
```javascript
// BEFORE
cardBackground: 0x111318,

// AFTER
cardBackground: 0x000000,
```

**Validation Checkpoint**:
- [ ] Verify gray backgrounds no longer visible on all affected screens
- [ ] Verify text contrast/readability remains acceptable
- [ ] Run `npm run test` - all tests must pass

---

### Step 2: Replace Back to Home Button in Game Play Screen (Subtask 35.2)

**File**: `page/game.js`

**Dependencies**: Step 1 must be complete

#### 2.1 Locate the Back to Home button in `renderGameScreen()` (lines ~1626-1637)

Replace the text-based button with an image-based button:

```javascript
// BEFORE (lines ~1626-1637)
this.createWidget(hmUI.widget.BUTTON, {
  x: backHomeButtonX,
  y: backHomeButtonY,
  w: backHomeButtonWidth,
  h: backHomeButtonHeight,
  radius: Math.round(backHomeButtonHeight / 2),
  normal_color: GAME_TOKENS.colors.buttonSecondary,
  press_color: GAME_TOKENS.colors.buttonSecondaryPressed,
  color: GAME_TOKENS.colors.buttonSecondaryText,
  text_size: Math.round(width * GAME_TOKENS.fontScale.button),
  text: isMatchFinished ? gettext('game.home') : gettext('game.backHome'),
  click_func: () => this.handleBackToHome()
})

// AFTER
const homeIconSize = 48
const homeIconX = Math.round((width - homeIconSize) / 2)
const homeIconY = backHomeButtonY + Math.round((backHomeButtonHeight - homeIconSize) / 2)

this.createWidget(hmUI.widget.BUTTON, {
  x: homeIconX,
  y: homeIconY,
  w: -1,
  h: -1,
  normal_src: 'home-icon.png',
  press_src: 'home-icon.png',
  click_func: () => this.handleBackToHome()
})
```

#### 2.2 Clean up unused variables
Remove or repurpose the now-unused button dimension variables:
- `backHomeButtonWidth` - can be removed if not used elsewhere
- `backHomeButtonHeight` - keep for layout calculations if still used for `backHomeButtonY`

**Validation Checkpoint**:
- [ ] Home icon displays correctly on Game Play screen
- [ ] Touch target meets minimum 44x44px (icon is 48x48)
- [ ] Click handler navigates to home screen correctly
- [ ] Run `npm run test` - all tests must pass

---

### Step 3: Replace Back to Home Button in Match Summary Screen (Subtask 35.3)

**File**: `page/summary.js`

**Dependencies**: Step 2 must be complete

#### 3.1 Locate the Home button in `renderSummaryScreen()` (lines ~583-595)

Replace the text-based button with an image-based button:

```javascript
// BEFORE (lines ~583-595)
this.createWidget(hmUI.widget.BUTTON, {
  x: actionsX,
  y: actionsSectionY,
  w: actionsWidth,
  h: buttonHeight,
  radius: Math.round(buttonHeight / 2),
  normal_color: SUMMARY_TOKENS.colors.buttonSecondary,
  press_color: SUMMARY_TOKENS.colors.buttonSecondaryPressed,
  color: SUMMARY_TOKENS.colors.buttonSecondaryText,
  text_size: Math.round(width * SUMMARY_TOKENS.fontScale.button),
  text: gettext('summary.home'),
  click_func: () => this.handleNavigateHome()
})

// AFTER
const homeIconSize = 48
const homeIconX = Math.round((width - homeIconSize) / 2)
const homeIconY = actionsSectionY + Math.round((buttonHeight - homeIconSize) / 2)

this.createWidget(hmUI.widget.BUTTON, {
  x: homeIconX,
  y: homeIconY,
  w: -1,
  h: -1,
  normal_src: 'home-icon.png',
  press_src: 'home-icon.png',
  click_func: () => this.handleNavigateHome()
})
```

**Validation Checkpoint**:
- [ ] Home icon displays correctly on Match Summary screen
- [ ] Visual parity with Game Play icon
- [ ] Click handler navigates to home screen correctly
- [ ] Run `npm run test` - all tests must pass

---

### Step 4: Implement Swipe-Right-to-Close on Home Screen (Subtask 35.4)

**File**: `page/index.js`

**Dependencies**: Step 3 must be complete

#### 4.1 Add gesture handler registration method

Add a new method `registerGestureHandler()` to the Page object in `page/index.js`:

```javascript
registerGestureHandler() {
  if (
    typeof hmApp === 'undefined' ||
    typeof hmApp.registerGestureEvent !== 'function'
  ) {
    return
  }

  try {
    hmApp.registerGestureEvent((event) => {
      if (event === hmApp.gesture.RIGHT) {
        // Exit the app - on root page, goBack() closes the app
        hmApp.goBack()
        return true
      }
      // For other gestures, don't skip default behavior
      return false
    })
  } catch {
    // Non-fatal: gesture registration failed
  }
}
```

#### 4.2 Add gesture handler unregistration method

Add `unregisterGestureHandler()` method:

```javascript
unregisterGestureHandler() {
  if (
    typeof hmApp === 'undefined' ||
    typeof hmApp.unregisterGestureEvent !== 'function'
  ) {
    return
  }

  try {
    hmApp.unregisterGestureEvent()
  } catch {
    // Non-fatal: gesture unregistration failed
  }
}
```

#### 4.3 Call gesture handler in `onInit()`

Modify the `onInit()` method to register the gesture handler:

```javascript
onInit() {
  this.refreshSavedMatchState()
  this.registerGestureHandler()
}
```

#### 4.4 Call unregister in `onDestroy()`

Modify the `onDestroy()` method to unregister the gesture handler:

```javascript
onDestroy() {
  this.unregisterGestureHandler()
  this.clearWidgets()
}
```

**Note on Swipe Threshold**: The Zepp OS `hmApp.gesture.RIGHT` event is triggered by the system with its own built-in threshold. No manual threshold calculation is needed - the OS handles swipe detection.

**Validation Checkpoint**:
- [ ] Swipe-right gesture exits app from Home Screen
- [ ] Gesture does not interfere with other interactions
- [ ] No accidental triggers during normal use
- [ ] Run `npm run test` - all tests must pass

---

### Step 5: Testing and Verification (Subtask 35.5)

**Dependencies**: All previous steps must be complete

#### 5.1 Visual Testing Checklist
- [ ] Gray backgrounds removed from Home Screen (index.js has no card backgrounds)
- [ ] Gray backgrounds removed from Game Play screen
- [ ] Gray backgrounds removed from Match Summary screen
- [ ] Gray backgrounds removed from Match History screen
- [ ] Gray backgrounds removed from History Detail screen
- [ ] Text remains readable on all screens
- [ ] Consistent styling across all affected screens

#### 5.2 Functional Testing Checklist
- [ ] Home icon button on Game Play screen navigates to Home Screen
- [ ] Home icon button on Match Summary screen navigates to Home Screen
- [ ] Swipe-right on Home Screen exits the app
- [ ] Touch targets for icon buttons are easily tappable (48x48px)

#### 5.3 Regression Testing Checklist
- [ ] Scoring functionality still works correctly
- [ ] Game flow (start → play → finish → summary) still works
- [ ] Match history viewing still works
- [ ] Settings navigation still works
- [ ] Resume game functionality still works

#### 5.4 Automated Testing
```bash
# Run all tests
npm run test

# Run complete QA gate
npm run complete-check
```

---

## Validation

### Success Criteria
1. All gray backgrounds (`0x111318`) removed from affected screens - verified visually
2. Home icon button replaces "Back to Home" text on Game Play screen
3. Home icon button replaces "Home" text on Match Summary screen
4. Touch targets for icon buttons are minimum 44x44px (actual: 48x48px)
5. Swipe-right gesture on Home Screen exits the app
6. All existing tests pass (`npm run test`)
7. Complete QA gate passes (`npm run complete-check`)

### Checkpoints

| Step | Checkpoint | Verification Method |
|------|------------|---------------------|
| 1 | Gray backgrounds removed | Visual inspection in simulator |
| 1 | Text contrast maintained | Visual inspection |
| 1 | Tests pass | `npm run test` |
| 2 | Home icon displays on Game Play | Visual inspection |
| 2 | Icon navigates correctly | Functional test |
| 2 | Tests pass | `npm run test` |
| 3 | Home icon displays on Summary | Visual inspection |
| 3 | Visual parity with Game Play | Visual comparison |
| 3 | Tests pass | `npm run test` |
| 4 | Swipe-right exits app | Functional test on device/simulator |
| 4 | Tests pass | `npm run test` |
| 5 | All regression tests pass | Full app flow test |
| 5 | QA gate passes | `npm run complete-check` |

### Rollback Notes

If issues arise, the changes are easily reversible:
1. **Token changes**: Revert `cardBackground` from `0x000000` to `0x111318`
2. **Icon buttons**: Revert to text-based button implementation
3. **Gesture handler**: Remove the three added methods and their calls

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Visual regression on different screen sizes | Low | Medium | Test on both GTR-3 (round) and GTS-3 (square) |
| Gesture conflicts with other interactions | Low | Low | Swipe-right is standard "back" pattern, well understood |
| Icon not rendering on some devices | Low | High | Verify icon exists in both asset folders (gtr-3, gts-3) |
| Text readability reduced without cards | Low | Medium | Background is black (0x000000), text is white/accent - sufficient contrast |

---

## Files Summary

| File | Lines to Modify | Type of Change |
|------|-----------------|----------------|
| `page/game.js` | ~18, ~1626-1637 | Token update, button replacement |
| `page/summary.js` | ~17, ~583-595 | Token update, button replacement |
| `page/history.js` | ~13 | Token update |
| `page/history-detail.js` | ~12 | Token update |
| `page/index.js` | ~onInit, ~onDestroy, +2 methods | Gesture handler addition |

**Total estimated changes**: ~30-40 lines across 5 files

---

## Notes

- The `home-icon.png` asset already exists in both `assets/gtr-3/` and `assets/gts-3/` directories
- The gesture handler pattern is already established in `game.js` and can be directly adapted
- Using `w: -1` and `h: -1` for image buttons lets Zepp OS use the image's native dimensions
- No new dependencies or external libraries required
