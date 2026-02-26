# Plan 46: Migrate Setup Screen to New Layout System

## Task Analysis

**Main objective:**  
Refactor `page/setup.js` to use the declarative layout system (design-tokens, screen-utils, layout-engine, ui-components) instead of the local `SETUP_TOKENS` constant and manual widget positioning.

**Identified dependencies:**
- `utils/design-tokens.js` - Centralized TOKENS object, getFontSize(), getColor()
- `utils/screen-utils.js` - getScreenMetrics(), clamp(), ensureNumber(), pct()
- `utils/layout-engine.js` - resolveLayout() function
- `utils/ui-components.js` - createBackground(), createCard(), createSectionTitle(), createBodyText(), createButton()

**System impact:**
- `page/setup.js` - Primary file to modify
- No changes required to utility files
- Visual output must remain identical
- All button handlers (option selection, start match) must function identically
- State management (selectedSetsToPlay, startErrorMessage) preserved

---

## Chosen Approach

**Proposed solution:**  
Incremental migration following the provided subtask breakdown. Each subtask produces a testable intermediate state, allowing verification before proceeding.

**Justification for simplicity:**
- Follows established patterns from Plan 45 (Home Screen migration - already completed)
- Uses existing utility functions without modification
- Maintains backward compatibility during transition
- Clear rollback points at each subtask
- Reuses existing button variants (primary/secondary) for option selection

**Components to be modified/created:**
1. **Remove** `SETUP_TOKENS` constant (lines 9-42)
2. **Add** imports from utils modules
3. **Define** `SETUP_LAYOUT` schema constant with card-based layout
4. **Refactor** `renderSetupScreen()` method to use layout engine
5. **Preserve** all existing state management and handlers

---

## Implementation Steps

### Step 1: Remove Legacy Dependencies from Setup Screen (Subtask 46.1)

**Action:** Delete the `SETUP_TOKENS` constant.

**Current code to remove (lines 9-42):**
```javascript
const SETUP_TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    buttonText: 0x000000,
    cardBackground: 0x000000,
    disabledButton: 0x2a2d34,
    disabledButtonText: 0x7d8289,
    errorText: 0xff6d78,
    mutedText: 0x7d8289,
    optionButton: 0x24262b,
    optionButtonPressed: 0x2d3036,
    optionButtonText: 0xffffff,
    optionSelectedButton: 0x1eb98c,
    optionSelectedButtonPressed: 0x1aa07a,
    optionSelectedButtonText: 0x000000,
    startButton: 0x1eb98c,
    startButtonPressed: 0x1aa07a,
    title: 0xffffff
  },
  fontScale: {
    helper: 0.04,
    option: 0.05,
    start: 0.052,
    title: 0.1
  },
  spacingScale: {
    cardTop: 0.1,
    cardHorizontalInset: 0.07,
    helperToOptions: 0.03,
    optionsToStart: 0.08,
    startToError: 0.025,
    titleToHelper: 0.03
  }
})
```

**Verification:** File still parses. Comment out renderSetupScreen temporarily if needed to verify.

**Rollback:** Re-add SETUP_TOKENS constant if issues arise.

---

### Step 2: Add New Layout System Imports (Subtask 46.2)

**Action:** Add imports for the new layout system modules at the top of `page/setup.js`.

**Add after existing imports:**
```javascript
import { TOKENS, getFontSize, getColor, toPercentage } from '../utils/design-tokens.js'
import { getScreenMetrics, clamp, ensureNumber } from '../utils/screen-utils.js'
import { resolveLayout } from '../utils/layout-engine.js'
import {
  createBackground,
  createCard,
  createSectionTitle,
  createBodyText,
  createButton
} from '../utils/ui-components.js'
```

**Verification:** File parses without errors. All imports resolve correctly.

---

### Step 3: Define SETUP_LAYOUT Schema Constant (Subtask 46.3)

**Action:** Create layout schema with header (spacer) and body (card container) sections.

**Add before the page class definition:**
```javascript
/**
 * Layout schema for the setup screen.
 * Card-based layout with title, helper, options, start button, and error.
 */
const SETUP_LAYOUT = {
  sections: {
    header: {
      top: 0,
      height: '10%', // Spacer area (title moved inside card)
      roundSafeInset: true
    },
    body: {
      height: 'fill',
      after: 'header',
      roundSafeInset: true,
      sideInset: pct(7) // Card horizontal inset
    }
  },
  elements: {
    // Card container
    card: {
      section: 'body',
      x: 0,
      y: 0,
      width: '100%',
      height: '100%',
      _meta: {
        type: 'card',
        radius: pct(7) // Relative to card width
      }
    },
    // Title text (inside card)
    title: {
      section: 'body',
      x: 0,
      y: '5%', // Position relative to card
      width: '100%',
      height: '12%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'sectionTitle',
        text: 'setup.title',
        color: 'colors.text'
      }
    },
    // Helper text
    helperText: {
      section: 'body',
      x: 0,
      y: '20%', // After title
      width: '100%',
      height: '7%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        text: 'setup.selectSetsHint',
        color: 'colors.mutedText'
      }
    },
    // Option buttons row - defined as a conceptual group
    // Individual buttons positioned dynamically in renderSetupScreen
    optionsRow: {
      section: 'body',
      x: 0,
      y: '32%', // After helper
      width: '100%',
      height: '25%',
      align: 'center',
      _meta: {
        type: 'optionsRow',
        options: [1, 3, 5], // MATCH_SET_OPTIONS
        gap: '2.2%'
      }
    },
    // Start button
    startButton: {
      section: 'body',
      x: 0,
      y: '65%', // After options
      width: '78%', // Narrower than card
      height: '18%',
      align: 'center',
      _meta: {
        type: 'button',
        variant: 'primary',
        text: 'setup.startMatch',
        onClick: 'handleStartMatch'
      }
    },
    // Error message (conditional)
    errorMessage: {
      section: 'body',
      x: 0,
      y: '88%', // After start button
      width: '100%',
      height: '8%',
      align: 'center',
      _meta: {
        type: 'text',
        style: 'body',
        text: 'dynamic', // Set from this.startErrorMessage
        color: 'colors.danger',
        conditional: 'hasError'
      }
    }
  }
}
```

**Note:** The layout schema defines the structure, but option buttons require dynamic rendering based on selection state.

**Verification:** Schema structure matches layout-engine expectations.

---

### Step 4: Refactor renderSetupScreen() Function (Subtask 46.4)

**Action:** Replace manual widget creation with layout engine + ui-components.

**New implementation:**
```javascript
renderSetupScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  const metrics = getScreenMetrics()
  const { width, height } = metrics
  const layout = resolveLayout(SETUP_LAYOUT, metrics)
  
  // Get resolved positions
  const cardSection = layout.sections.body
  const cardEl = layout.elements.card
  const titleEl = layout.elements.title
  const helperEl = layout.elements.helperText
  const optionsEl = layout.elements.optionsRow
  const startEl = layout.elements.startButton
  const errorEl = layout.elements.errorMessage

  this.clearWidgets()

  // 1. Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // 2. Card container
  const cardConfig = createCard({
    x: cardEl.x,
    y: cardEl.y,
    w: cardEl.w,
    h: cardEl.h
  })
  this.createWidget(cardConfig.widgetType, cardConfig.config)

  // 3. Title text
  const titleMeta = SETUP_LAYOUT.elements.title._meta
  const titleText = createSectionTitle({
    x: titleEl.x,
    y: titleEl.y,
    w: titleEl.w,
    h: titleEl.h,
    text: gettext(titleMeta.text)
  })
  this.createWidget(titleText.widgetType, titleText.config)

  // 4. Helper text
  const helperMeta = SETUP_LAYOUT.elements.helperText._meta
  const helperText = createBodyText({
    x: helperEl.x,
    y: helperEl.y,
    w: helperEl.w,
    h: helperEl.h,
    text: gettext(helperMeta.text)
  })
  this.createWidget(helperText.widgetType, helperText.config)

  // 5. Option buttons (1, 3, 5 sets)
  const optionButtonWidth = Math.round((optionsEl.w - (MATCH_SET_OPTIONS.length - 1) * Math.round(width * 0.022)) / MATCH_SET_OPTIONS.length)
  const optionButtonHeight = clamp(Math.round(optionsEl.h), 48, 130)
  const optionGap = Math.round(width * 0.022)

  MATCH_SET_OPTIONS.forEach((setsToPlay, index) => {
    const isSelected = this.selectedSetsToPlay === setsToPlay
    const optionButtonX = optionsEl.x + (optionButtonWidth + optionGap) * index

    const optionBtn = createButton({
      x: optionButtonX,
      y: optionsEl.y,
      w: optionButtonWidth,
      h: optionButtonHeight,
      variant: isSelected ? 'primary' : 'secondary',
      text: this.getOptionLabel(setsToPlay),
      onClick: () => this.handleSelectSets(setsToPlay)
    })
    this.createWidget(optionBtn.widgetType, optionBtn.config)
  })

  // 6. Start button
  const canStartMatch = this.isStartMatchEnabled()
  const startBtn = createButton({
    x: startEl.x,
    y: startEl.y,
    w: startEl.w,
    h: clamp(Math.round(startEl.h), 50, 130),
    variant: canStartMatch ? 'primary' : 'secondary',
    text: gettext('setup.startMatch'),
    disabled: !canStartMatch,
    onClick: () => {
      if (!canStartMatch) {
        return false
      }
      return this.handleStartMatch()
    }
  })
  this.createWidget(startBtn.widgetType, startBtn.config)

  // 7. Error message (conditional)
  if (this.startErrorMessage.length > 0) {
    const errorText = createBodyText({
      x: errorEl.x,
      y: errorEl.y,
      w: errorEl.w,
      h: errorEl.h,
      text: this.startErrorMessage,
      color: TOKENS.colors.danger
    })
    this.createWidget(errorText.widgetType, errorText.config)
  }
}
```

**Verification:** 
- All widgets render correctly
- Button handlers fire
- Layout positions match expected design

---

### Step 5: Update State Management for Option Selection (Subtask 46.5)

**Action:** Verify state management is preserved and wired correctly.

**Existing state (in onInit):**
```javascript
this.selectedSetsToPlay = null
this.startErrorMessage = ''
```

**Existing handlers (preserve as-is):**
```javascript
handleSelectSets(setsToPlay) {
  if (!isValidSetsOption(setsToPlay)) {
    return
  }
  if (this.selectedSetsToPlay === setsToPlay) {
    return
  }
  this.startErrorMessage = ''
  this.selectedSetsToPlay = setsToPlay
  this.renderSetupScreen() // Re-renders with new selection
}

isStartMatchEnabled() {
  return (
    this.hasSetSelection() &&
    !this.isPersistingMatchState &&
    !this.isNavigatingToGame
  )
}
```

**Verification checklist:**
- [ ] Option buttons (1, 3, 5) toggle selection
- [ ] Only one option selectable at a time
- [ ] Selected option shows 'primary' variant
- [ ] Unselected options show 'secondary' variant
- [ ] Start button disabled when no selection
- [ ] Start button enabled after selection
- [ ] Error message displays conditionally with danger color

---

## Validation

### Success Criteria
1. **Build Verification**: Project builds with no compilation errors (`npm run complete-check`)
2. **Visual QA**: Migrated screen visually matches expected design
3. **Positioning**: Title, helper text, and buttons positioned correctly
4. **Functional**:
   - Option buttons (1, 3, 5) toggle selection; only one selectable at a time
   - Start button is disabled with no selection; enables after selection
   - Selected option changes button variant to 'primary' and others 'secondary'
   - Error message conditionally displays with danger styling
5. **Cross-device**: Layout adapts correctly on round and square screens
6. **Regression**: Existing Setup Screen functionality preserved

### Checkpoints

| Checkpoint | Step | Verification Method |
|------------|------|---------------------|
| C1: Legacy removed | 1 | SETUP_TOKENS not found in file |
| C2: Imports resolve | 2 | No parse errors |
| C3: Schema valid | 3 | `resolveLayout()` returns non-empty |
| C4: Render works | 4 | Visual inspection on device |
| C5: State preserved | 5 | Option selection, start button work |

### Test Cases

| Test Case | Expected Result |
|-----------|-----------------|
| Initial load | No option selected, start button disabled |
| Tap option "1" | Option 1 selected (primary), others secondary, start enabled |
| Tap option "3" | Option 3 selected (primary), others secondary |
| Tap option "5" | Option 5 selected (primary), others secondary |
| Tap selected option | No change (same selection) |
| Tap start (disabled) | No action |
| Tap start (enabled) | Navigates to game page |
| Save failure | Error message displays in red |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Layout positions differ | Compare pixel values with legacy render before removing SETUP_TOKENS |
| Button colors mismatch | Verify TOKENS.colors matches SETUP_TOKENS.colors semantics |
| Option selection broken | Test each option individually, verify state updates |
| Start button state broken | Test enabled/disabled transitions |
| Error message not showing | Verify conditional rendering logic |
| Round screen issues | Test on round device/simulator |
| Card radius mismatch | Verify createCard uses correct radius ratio |

---

## Color Mapping Reference

| Old (SETUP_TOKENS) | New (TOKENS) | Usage |
|-------------------|--------------|-------|
| background (0x000000) | background (0x000000) | Screen background |
| cardBackground (0x000000) | cardBackground (0x1a1c20) | Card container |
| title (0xffffff) | text (0xffffff) | Title text |
| mutedText (0x7d8289) | mutedText (0x888888) | Helper text |
| optionButton (0x24262b) | secondaryButton (0x24262b) | Unselected option |
| optionSelectedButton (0x1eb98c) | primaryButton (0x1eb98c) | Selected option |
| startButton (0x1eb98c) | primaryButton (0x1eb98c) | Start button |
| disabledButton (0x2a2d34) | disabled (0x444444) | Disabled start |
| errorText (0xff6d78) | danger (0xff6d78) | Error message |

**Note:** The cardBackground color differs slightly (0x000000 → 0x1a1c20). This is intentional as part of the design token standardization. Verify visual acceptance.

---

## Estimated Effort

| Subtask | Effort |
|---------|--------|
| 46.1 - Remove legacy deps | 5 min |
| 46.2 - Add imports | 5 min |
| 46.3 - Define schema | 20 min |
| 46.4 - Refactor render | 30 min |
| 46.5 - Update state mgmt | 15 min |
| Testing & verification | 20 min |
| **Total** | **~1.5 hours** |

---

## Files Modified

| File | Change Type |
|------|-------------|
| `page/setup.js` | Modified |

## Files Referenced (No Changes)

| File | Purpose |
|------|---------|
| `utils/design-tokens.js` | Import TOKENS, getFontSize, getColor, toPercentage |
| `utils/screen-utils.js` | Import getScreenMetrics, clamp, ensureNumber |
| `utils/layout-engine.js` | Import resolveLayout |
| `utils/ui-components.js` | Import createBackground, createCard, createSectionTitle, createBodyText, createButton |

---

## Implementation Notes

### Option Button Layout Strategy

The option buttons (1, 3, 5 sets) require special handling because:
1. They are dynamically generated from `MATCH_SET_OPTIONS` array
2. Each button's variant depends on `this.selectedSetsToPlay` state
3. Width is calculated to fit 3 buttons with gaps

The layout schema defines the `optionsRow` container, but individual buttons are rendered in a loop within `renderSetupScreen()`.

### Start Button Disabled State

The `createButton()` factory in `ui-components.js` handles disabled state by:
- Setting `normal_color` and `press_color` to `TOKENS.colors.disabled`
- Setting `color` to `TOKENS.colors.mutedText`

This matches the legacy behavior.

### Error Message Conditional Rendering

The error message is only rendered when `this.startErrorMessage.length > 0`. This is handled with a conditional check before creating the widget.

---

## Post-Implementation Checklist

- [ ] All subtasks completed
- [ ] `npm run complete-check` passes
- [ ] Visual QA on device/simulator
- [ ] All button interactions work
- [ ] Cross-device testing (round and square)
- [ ] No console errors
- [ ] Code follows project conventions (2-space indent, camelCase)
