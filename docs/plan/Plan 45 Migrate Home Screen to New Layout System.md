# Plan 45: Migrate Home Screen to New Layout System

## Task Analysis

**Main objective:**  
Refactor `page/index.js` to use the declarative layout system (design-tokens, screen-utils, layout-engine, ui-components) instead of the local `HOME_TOKENS` constant and manual widget positioning.

**Identified dependencies:**
- `utils/design-tokens.js` - Centralized TOKENS object
- `utils/screen-utils.js` - `getScreenMetrics()` function
- `utils/layout-engine.js` - `resolveLayout()` function
- `utils/ui-components.js` - `createBackground()`, `createText()`, `createPageTitle()`, `createButton()` functions

**System impact:**
- `page/index.js` - Primary file to modify
- No changes required to utility files
- Visual output must remain identical
- All button handlers must function identically

---

## Chosen Approach

**Proposed solution:**  
Incremental migration following the provided subtask breakdown. Each subtask produces a testable intermediate state, allowing verification before proceeding.

**Justification for simplicity:**
- Follows established patterns from `utils/layout-presets.js` (already tested)
- Uses existing utility functions without modification
- Maintains backward compatibility during transition
- Clear rollback points at each subtask

**Components to be modified/created:**
1. **Remove** `HOME_TOKENS` constant (lines 12-54)
2. **Add** imports from utils modules
3. **Define** `INDEX_LAYOUT` schema constant
4. **Refactor** `renderHomeScreen()` method to use layout engine
5. **Preserve** all existing functionality (handlers, conditional resume button)

---

## Implementation Steps

### Step 1: Add New Imports (Subtask 45.1)

**Action:** Add imports for the new layout system modules.

```javascript
// Add to top of page/index.js
import { TOKENS, getFontSize } from '../utils/design-tokens.js'
import { getScreenMetrics } from '../utils/screen-utils.js'
import { resolveLayout } from '../utils/layout-engine.js'
import {
  createBackground,
  createPageTitle,
  createButton
} from '../utils/ui-components.js'
```

**Verification:** File parses without errors. Imports resolve correctly.

---

### Step 2: Define INDEX_LAYOUT Schema (Subtask 45.2)

**Action:** Create layout schema with header/body/footer sections.

```javascript
/**
 * Layout schema for the home screen.
 * Uses declarative positioning resolved by layout-engine.
 */
const INDEX_LAYOUT = {
  sections: {
    header: {
      top: 0,
      height: '18%', // Logo + title area
      roundSafeInset: true
    },
    body: {
      height: 'fill',
      after: 'header',
      gap: '6%',
      roundSafeInset: true
    },
    footer: {
      bottom: 0,
      height: '15%', // Settings icon area
      roundSafeInset: false
    }
  },
  elements: {
    // Elements defined in Step 3
  }
}
```

**Verification:** Schema structure matches `createStandardPageLayout()` pattern from layout-presets.js.

---

### Step 3: Configure Layout Elements (Subtask 45.3)

**Action:** Add element definitions to INDEX_LAYOUT for all UI components.

```javascript
elements: {
  // Logo text - top of header
  logo: {
    section: 'header',
    x: 0,
    y: 0,
    width: '100%',
    height: '40%',
    align: 'center',
    _meta: {
      type: 'text',
      style: 'sectionTitle',
      text: 'home.logo',
      color: 'colors.accent'
    }
  },
  // Page title - bottom of header
  pageTitle: {
    section: 'header',
    x: 0,
    y: '55%',
    width: '100%',
    height: '45%',
    align: 'center',
    _meta: {
      type: 'pageTitle',
      text: 'home.title'
    }
  },
  // Primary button - Start New Game
  primaryButton: {
    section: 'body',
    x: 0,
    y: 0,
    width: '85%',
    height: TOKENS.sizing.buttonHeight,
    align: 'center',
    _meta: {
      type: 'button',
      variant: 'primary',
      text: 'home.startNewGame',
      onClick: 'handleStartNewGame'
    }
  },
  // Secondary button - Resume Game (conditional)
  secondaryButton: {
    section: 'body',
    x: 0,
    y: '55%',
    width: '85%',
    height: TOKENS.sizing.buttonHeight,
    align: 'center',
    _meta: {
      type: 'button',
      variant: 'secondary',
      text: 'home.resumeGame',
      onClick: 'handleResumeGame',
      conditional: 'hasSavedGame'
    }
  },
  // Settings icon button
  settingsButton: {
    section: 'footer',
    x: 0,
    y: 0,
    width: TOKENS.sizing.iconLarge,
    height: TOKENS.sizing.iconLarge,
    align: 'center',
    _meta: {
      type: 'iconButton',
      icon: 'setting-icon.png',
      onClick: 'navigateToSettings'
    }
  }
}
```

**Verification:** All elements reference valid sections. `_meta` properties follow established patterns.

---

### Step 4: Refactor renderHomeScreen() (Subtask 45.4)

**Action:** Replace manual widget creation with layout engine + ui-components.

**Before (current approach):**
- Manual position calculations using `HOME_TOKENS`
- Direct `hmUI.widget.*` creation
- ~110 lines of code

**After (new approach):**
```javascript
renderHomeScreen() {
  if (typeof hmUI === 'undefined') {
    return
  }

  const metrics = getScreenMetrics()
  const layout = resolveLayout(INDEX_LAYOUT, metrics)

  this.clearWidgets()

  // Background
  const bg = createBackground()
  this.createWidget(bg.widgetType, bg.config)

  // Logo
  const logoEl = layout.elements.logo
  this.createWidget(hmUI.widget.TEXT, {
    x: logoEl.x,
    y: logoEl.y,
    w: logoEl.width,
    h: logoEl.height,
    text: gettext(logoEl._meta.text),
    text_size: getFontSize(logoEl._meta.style),
    color: TOKENS.colors.accent,
    align_h: hmUI.align.CENTER_H,
    align_v: hmUI.align.CENTER_V
  })

  // Page Title
  const titleEl = layout.elements.pageTitle
  const title = createPageTitle({
    x: titleEl.x,
    y: titleEl.y,
    w: titleEl.width,
    h: titleEl.height,
    text: gettext(titleEl._meta.text)
  })
  this.createWidget(title.widgetType, title.config)

  // Primary Button - Start New Game
  const primaryEl = layout.elements.primaryButton
  const primaryBtn = createButton({
    x: primaryEl.x,
    y: primaryEl.y,
    w: primaryEl.width,
    h: primaryEl.height,
    variant: 'primary',
    text: gettext(primaryEl._meta.text),
    onClick: () => this.handleStartNewGame()
  })
  this.createWidget(primaryBtn.widgetType, primaryBtn.config)

  // Secondary Button - Resume Game (conditional)
  if (this.hasSavedGame) {
    const secondaryEl = layout.elements.secondaryButton
    const secondaryBtn = createButton({
      x: secondaryEl.x,
      y: secondaryEl.y,
      w: secondaryEl.width,
      h: secondaryEl.height,
      variant: 'secondary',
      text: gettext(secondaryEl._meta.text),
      onClick: () => this.handleResumeGame()
    })
    this.createWidget(secondaryBtn.widgetType, secondaryBtn.config)
  }

  // Settings Icon Button
  const settingsEl = layout.elements.settingsButton
  const settingsBtn = createButton({
    x: settingsEl.x,
    y: settingsEl.y,
    variant: 'icon',
    normal_src: settingsEl._meta.icon,
    onClick: () => this.navigateToSettings()
  })
  this.createWidget(settingsBtn.widgetType, settingsBtn.config)
}
```

**Verification:** All widgets render correctly. Button handlers fire. Conditional resume button works.

---

### Step 5: Remove HOME_TOKENS and Verify (Subtask 45.5)

**Action:** Delete the `HOME_TOKENS` constant and verify consistency.

**Removal checklist:**
- [ ] Delete `HOME_TOKENS` constant (lines 12-54)
- [ ] Verify no remaining references to `HOME_TOKENS`
- [ ] Run `npm run complete-check`
- [ ] Manual visual verification on device/simulator

**Consistency verification:**
- [ ] Background color matches (0x000000)
- [ ] Logo color matches accent (0x1eb98c)
- [ ] Title color matches text (0xffffff)
- [ ] Button sizes match (85% width, 10.5% height)
- [ ] Button colors match (primary: 0x1eb98c, secondary: 0x24262b)
- [ ] Settings icon size matches (48px)
- [ ] All handlers function identically

---

## Validation

### Success Criteria
1. **Functional parity**: All existing behaviors work identically
   - Start New Game button → navigates to game page
   - Resume Game button → restores saved match (when available)
   - Settings icon → navigates to settings page
2. **Visual consistency**: UI appearance unchanged
3. **Code quality**: Uses centralized design tokens
4. **Test passing**: `npm run complete-check` passes

### Checkpoints

| Checkpoint | Step | Verification Method |
|------------|------|---------------------|
| C1: Imports resolve | 1 | No parse errors |
| C2: Schema valid | 2 | `resolveLayout()` returns non-empty |
| C3: Elements defined | 3 | All 5 elements have `_meta` |
| C4: Render works | 4 | Visual inspection on device |
| C5: Full migration | 5 | `HOME_TOKENS` removed, tests pass |

### Rollback Notes
- **Step 1-3**: Low risk - code not yet used
- **Step 4**: Medium risk - keep old `renderHomeScreen()` as `renderHomeScreenLegacy()` temporarily for comparison
- **Step 5**: Low risk - only cleanup after verification

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Layout positions differ | Compare pixel values with legacy render |
| Button colors mismatch | Verify TOKENS.colors matches HOME_TOKENS.colors |
| Conditional button broken | Test with and without saved game |
| Round screen issues | Test on round device/simulator |

---

## Estimated Effort

| Subtask | Effort |
|---------|--------|
| 45.1 - Add imports | 5 min |
| 45.2 - Define schema | 15 min |
| 45.3 - Configure elements | 20 min |
| 45.4 - Refactor render | 30 min |
| 45.5 - Verify & cleanup | 15 min |
| **Total** | **~1.5 hours** |

---

## Files Modified

| File | Change Type |
|------|-------------|
| `page/index.js` | Modified |

## Files Referenced (No Changes)

| File | Purpose |
|------|---------|
| `utils/design-tokens.js` | Import TOKENS, getFontSize |
| `utils/screen-utils.js` | Import getScreenMetrics |
| `utils/layout-engine.js` | Import resolveLayout |
| `utils/ui-components.js` | Import createBackground, createPageTitle, createButton |
