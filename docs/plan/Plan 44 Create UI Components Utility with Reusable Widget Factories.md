# Plan 44: Create UI Components Utility with Reusable Widget Factories

## Task Analysis

### Main Objective
Implement `utils/ui-components.js` containing reusable widget factory functions for common UI elements (backgrounds, cards, buttons, dividers, text components) using design tokens for consistent styling across the Padel Buddy app.

### Identified Dependencies
- **utils/design-tokens.js** - Existing design tokens (TOKENS, getColor(), getFontSize())
- **hmUI API** - Zepp OS v1.0 widget creation API
- **hmSetting API** - Screen dimension access for responsive calculations

### System Impact
- **No breaking changes** - New utility file, additive only
- **Design tokens extension** - Two new tokens required in design-tokens.js
- **Future pages** - Can use these factories for consistent UI
- **Refactoring opportunity** - Existing pages could be incrementally updated to use these utilities

---

## Chosen Approach

### Proposed Solution
Create a utility module with pure factory functions that return widget configuration objects. Each factory:
1. Validates required parameters
2. Applies TOKENS defaults for colors, sizing, and typography
3. Returns a configuration object ready for `hmUI.createWidget()`

**Why configuration objects instead of widget wrappers:**
- Maintains flexibility for callers to modify configurations before creation
- Avoids tight coupling to hmUI lifecycle management
- Aligns with existing page patterns (they already use configuration objects)
- Easier testing (no need to mock hmUI for unit tests)

### Justification for Simplicity
- **No class-based abstractions** - Simple functions are sufficient
- **No state management** - Factories are stateless, predictable
- **No widget lifecycle management** - Caller retains full control
- **Token-first defaults** - All defaults come from TOKENS, ensuring consistency

### Components to be Modified/Created

#### New Files
| File | Purpose |
|------|---------|
| `utils/ui-components.js` | Main utility module with factory functions |

#### Modified Files
| File | Changes |
|------|---------|
| `utils/design-tokens.js` | Add `cardBackground` color token and `cardRadiusRatio` sizing token |

---

## Implementation Steps

### Step 1: Update Design Tokens (Pre-requisite)
**File**: `utils/design-tokens.js`

**Changes**:
1. Add `cardBackground: 0x1a1c20` to `TOKENS.colors`
   - Color chosen: Slightly lighter than `secondaryButton` (0x24262b) for visual hierarchy
   - Provides subtle contrast against the black background
2. Add `cardRadiusRatio: 0.07` to `TOKENS.sizing`
   - 7% ratio provides subtle rounding without being too rounded

**Validation Checkpoint**:
- [ ] File compiles without syntax errors
- [ ] TOKENS.colors.cardBackground equals 0x1a1c20
- [ ] TOKENS.sizing.cardRadiusRatio equals 0.07
- [ ] Existing tests continue to pass

---

### Step 2: Create ui-components.js File Structure
**File**: `utils/ui-components.js`

**Structure**:
```javascript
/**
 * @fileoverview Reusable UI component factories using design tokens.
 * 
 * Provides factory functions that return widget configuration objects
 * for consistent UI elements across the Padel Buddy app.
 * 
 * @module utils/ui-components
 */

import { TOKENS, getColor, getFontSize } from './design-tokens.js'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that a required parameter is provided.
 * @param {*} value - The value to check
 * @param {string} paramName - Parameter name for error message
 * @throws {Error} If value is null or undefined
 */
function requireParam(value, paramName) { ... }

/**
 * Gets screen dimensions safely with fallback.
 * @returns {{width: number, height: number}}
 */
function getScreenDimensions() { ... }

// ============================================================================
// SHAPE FACTORIES
// ============================================================================

export function createBackground() { ... }
export function createCard(config) { ... }
export function createDivider(config) { ... }

// ============================================================================
// TEXT FACTORIES
// ============================================================================

export function createText(config) { ... }
export function createPageTitle(config) { ... }
export function createSectionTitle(config) { ... }
export function createBodyText(config) { ... }

// ============================================================================
// BUTTON FACTORIES
// ============================================================================

export function createButton(config) { ... }
```

**Validation Checkpoint**:
- [ ] File created at correct location
- [ ] Imports resolve correctly
- [ ] File compiles without syntax errors

---

### Step 3: Implement Helper Functions

**3.1 requireParam Helper**
```javascript
function requireParam(value, paramName) {
  if (value === null || value === undefined) {
    throw new Error(`Missing required parameter: ${paramName}`)
  }
}
```

**3.2 getScreenDimensions Helper**
```javascript
function getScreenDimensions() {
  if (typeof hmSetting === 'undefined' || typeof hmSetting.getDeviceInfo !== 'function') {
    return { width: 390, height: 450 } // Default fallback
  }
  const { width, height } = hmSetting.getDeviceInfo()
  return { width: width ?? 390, height: height ?? 450 }
}
```

**Validation Checkpoint**:
- [ ] requireParam throws Error for null/undefined
- [ ] requireParam does not throw for valid values (including 0, '', false)
- [ ] getScreenDimensions returns fallback when hmSetting unavailable
- [ ] getScreenDimensions returns actual dimensions when hmSetting available

---

### Step 4: Implement Shape Widget Factories

**4.1 createBackground**
```javascript
/**
 * Creates a full-screen background widget configuration.
 * 
 * @param {Object} [options] - Optional overrides
 * @param {number} [options.color] - Background color (default: TOKENS.colors.background)
 * @returns {Object} Widget configuration for hmUI.widget.FILL_RECT
 */
export function createBackground(options = {}) {
  const { width, height } = getScreenDimensions()
  
  return {
    widgetType: hmUI.widget.FILL_RECT,
    config: {
      x: 0,
      y: 0,
      w: width,
      h: height,
      color: options.color ?? TOKENS.colors.background
    }
  }
}
```

**4.2 createCard**
```javascript
/**
 * Creates a card widget configuration with rounded corners.
 * 
 * @param {Object} config - Card configuration
 * @param {number} config.x - X position (required)
 * @param {number} config.y - Y position (required)
 * @param {number} config.w - Width (required)
 * @param {number} config.h - Height (required)
 * @param {number} [config.color] - Card background color (default: TOKENS.colors.cardBackground)
 * @param {number} [config.radius] - Corner radius (default: h * TOKENS.sizing.cardRadiusRatio)
 * @returns {Object} Widget configuration for hmUI.widget.FILL_RECT
 * @throws {Error} If x, y, w, or h is missing
 */
export function createCard(config) {
  requireParam(config?.x, 'x')
  requireParam(config?.y, 'y')
  requireParam(config?.w, 'w')
  requireParam(config?.h, 'h')
  
  const radius = config.radius ?? Math.round(config.h * TOKENS.sizing.cardRadiusRatio)
  
  return {
    widgetType: hmUI.widget.FILL_RECT,
    config: {
      x: config.x,
      y: config.y,
      w: config.w,
      h: config.h,
      color: config.color ?? TOKENS.colors.cardBackground,
      radius
    }
  }
}
```

**4.3 createDivider**
```javascript
/**
 * Creates a horizontal or vertical divider widget configuration.
 * 
 * @param {Object} config - Divider configuration
 * @param {number} config.x - X position (required)
 * @param {number} config.y - Y position (required)
 * @param {number} [config.w] - Width (for horizontal divider)
 * @param {number} [config.h] - Height (for vertical divider, default: 1)
 * @param {number} [config.thickness] - Divider thickness (default: 1)
 * @param {number} [config.color] - Divider color (default: TOKENS.colors.divider)
 * @param {'horizontal'|'vertical'} [config.orientation] - Divider orientation (default: 'horizontal')
 * @returns {Object} Widget configuration for hmUI.widget.FILL_RECT
 * @throws {Error} If x or y is missing
 */
export function createDivider(config) {
  requireParam(config?.x, 'x')
  requireParam(config?.y, 'y')
  
  const orientation = config.orientation ?? 'horizontal'
  const thickness = config.thickness ?? 1
  const { width } = getScreenDimensions()
  
  const dividerConfig = {
    x: config.x,
    y: config.y,
    color: config.color ?? TOKENS.colors.divider
  }
  
  if (orientation === 'horizontal') {
    dividerConfig.w = config.w ?? width
    dividerConfig.h = thickness
  } else {
    dividerConfig.w = thickness
    dividerConfig.h = config.h ?? thickness
  }
  
  return {
    widgetType: hmUI.widget.FILL_RECT,
    config: dividerConfig
  }
}
```

**Validation Checkpoint**:
- [ ] createBackground returns FILL_RECT with full-screen bounds
- [ ] createCard calculates radius as h * cardRadiusRatio
- [ ] createCard throws Error when required params missing
- [ ] createDivider creates horizontal divider by default
- [ ] createDivider creates vertical divider when orientation='vertical'

---

### Step 5: Implement Text Widget Factories

**5.1 createText (Generic Factory)**
```javascript
/**
 * Creates a text widget configuration with style-based sizing.
 * 
 * @param {Object} config - Text configuration
 * @param {string} config.text - Text content (required)
 * @param {string} config.style - Typography style from TOKENS.typography (required)
 * @param {number} [config.x] - X position (default: 0)
 * @param {number} [config.y] - Y position (default: 0)
 * @param {number} [config.w] - Width (default: screen width)
 * @param {number} [config.h] - Height (default: calculated from style)
 * @param {number} [config.color] - Text color (default: TOKENS.colors.text)
 * @param {string} [config.align_h] - Horizontal alignment (default: hmUI.align.CENTER_H)
 * @param {string} [config.align_v] - Vertical alignment (default: hmUI.align.CENTER_V)
 * @returns {Object} Widget configuration for hmUI.widget.TEXT
 * @throws {Error} If text or style is missing
 */
export function createText(config) {
  requireParam(config?.text, 'text')
  requireParam(config?.style, 'style')
  
  const { width } = getScreenDimensions()
  const textHeight = Math.round(getFontSize(config.style) * 1.4) // Line height factor
  
  return {
    widgetType: hmUI.widget.TEXT,
    config: {
      x: config.x ?? 0,
      y: config.y ?? 0,
      w: config.w ?? width,
      h: config.h ?? textHeight,
      text: config.text,
      text_size: getFontSize(config.style),
      color: config.color ?? TOKENS.colors.text,
      align_h: config.align_h ?? hmUI.align.CENTER_H,
      align_v: config.align_v ?? hmUI.align.CENTER_V
    }
  }
}
```

**5.2 Text Helper Wrappers**
```javascript
/**
 * Creates a page title text widget configuration.
 * Uses TOKENS.typography.pageTitle style.
 * 
 * @param {Object} config - Text configuration (text required)
 * @returns {Object} Widget configuration for hmUI.widget.TEXT
 */
export function createPageTitle(config) {
  return createText({
    ...config,
    style: 'pageTitle',
    color: config?.color ?? TOKENS.colors.text
  })
}

/**
 * Creates a section title text widget configuration.
 * Uses TOKENS.typography.sectionTitle style.
 * 
 * @param {Object} config - Text configuration (text required)
 * @returns {Object} Widget configuration for hmUI.widget.TEXT
 */
export function createSectionTitle(config) {
  return createText({
    ...config,
    style: 'sectionTitle',
    color: config?.color ?? TOKENS.colors.text
  })
}

/**
 * Creates a body text widget configuration.
 * Uses TOKENS.typography.body style with muted text color.
 * 
 * @param {Object} config - Text configuration (text required)
 * @returns {Object} Widget configuration for hmUI.widget.TEXT
 */
export function createBodyText(config) {
  return createText({
    ...config,
    style: 'body',
    color: config?.color ?? TOKENS.colors.mutedText
  })
}
```

**Validation Checkpoint**:
- [ ] createText throws Error when text or style missing
- [ ] createText applies default color from TOKENS.colors.text
- [ ] createText applies default alignment hmUI.align.CENTER_H
- [ ] createPageTitle uses 'pageTitle' style
- [ ] createSectionTitle uses 'sectionTitle' style
- [ ] createBodyText uses 'body' style with mutedText color

---

### Step 6: Implement Button Factory with Variants

**6.1 Variant Configuration Map**
```javascript
/**
 * Button variant configurations mapping to design tokens.
 */
const BUTTON_VARIANTS = {
  primary: {
    normalColor: 'primaryButton',
    pressColor: 'primaryButton', // Could add pressed variant to tokens
    textColor: 'text'
  },
  secondary: {
    normalColor: 'secondaryButton',
    pressColor: 'secondaryButton',
    textColor: 'text'
  },
  danger: {
    normalColor: 'danger',
    pressColor: 'danger',
    textColor: 'text'
  },
  icon: {
    // Icon buttons use normal_src/press_src instead of colors
    normalColor: null,
    pressColor: null,
    textColor: null
  }
}
```

**6.2 createButton Factory**
```javascript
/**
 * Creates a button widget configuration with variant support.
 * 
 * @param {Object} config - Button configuration
 * @param {string} config.text - Button text content (required for non-icon buttons)
 * @param {Function} config.onClick - Click handler (required)
 * @param {string} [config.variant] - Button variant: 'primary', 'secondary', 'danger', 'icon' (default: 'primary')
 * @param {number} [config.x] - X position (default: 0)
 * @param {number} [config.y] - Y position (required)
 * @param {number} [config.w] - Width (default: calculated)
 * @param {number} [config.h] - Height (default: screen height * TOKENS.sizing.buttonHeight)
 * @param {number} [config.radius] - Corner radius (default: h * TOKENS.sizing.buttonRadiusRatio)
 * @param {boolean} [config.disabled] - Whether button is disabled
 * @param {string} [config.normal_src] - Normal state image for icon variant
 * @param {string} [config.press_src] - Pressed state image for icon variant
 * @returns {Object} Widget configuration for hmUI.widget.BUTTON
 * @throws {Error} If onClick is missing, or if text is missing for non-icon variants
 */
export function createButton(config) {
  requireParam(config?.onClick, 'onClick')
  
  const variant = config.variant ?? 'primary'
  const { width, height } = getScreenDimensions()
  const variantConfig = BUTTON_VARIANTS[variant]
  
  // Validate text requirement for non-icon variants
  if (variant !== 'icon') {
    requireParam(config?.text, 'text')
  } else {
    requireParam(config?.normal_src, 'normal_src')
  }
  
  // Calculate default dimensions
  const buttonHeight = config.h ?? Math.round(height * TOKENS.sizing.buttonHeight)
  const buttonWidth = config.w ?? Math.round(width * 0.85)
  const radius = config.radius ?? Math.round(buttonHeight * TOKENS.sizing.buttonRadiusRatio)
  
  // Build button configuration
  const buttonConfig = {
    x: config.x ?? Math.round((width - buttonWidth) / 2),
    y: config.y,
    w: buttonWidth,
    h: buttonHeight,
    radius,
    click_func: config.onClick
  }
  
  // Handle disabled state
  if (config.disabled) {
    buttonConfig.normal_color = TOKENS.colors.disabled
    buttonConfig.press_color = TOKENS.colors.disabled
    buttonConfig.color = TOKENS.colors.mutedText
    if (config.text) {
      buttonConfig.text = config.text
      buttonConfig.text_size = getFontSize('buttonLarge', buttonWidth)
    }
    return {
      widgetType: hmUI.widget.BUTTON,
      config: buttonConfig
    }
  }
  
  // Apply variant-specific configuration
  if (variant === 'icon') {
    buttonConfig.normal_src = config.normal_src
    buttonConfig.press_src = config.press_src ?? config.normal_src
    buttonConfig.w = config.w ?? -1 // -1 for auto-sizing icon buttons
    buttonConfig.h = config.h ?? -1
    delete buttonConfig.radius // Icon buttons typically don't have radius
  } else {
    buttonConfig.normal_color = TOKENS.colors[variantConfig.normalColor]
    buttonConfig.press_color = TOKENS.colors[variantConfig.pressColor]
    buttonConfig.color = TOKENS.colors[variantConfig.textColor]
    buttonConfig.text = config.text
    buttonConfig.text_size = getFontSize('buttonLarge')
  }
  
  return {
    widgetType: hmUI.widget.BUTTON,
    config: buttonConfig
  }
}
```

**Validation Checkpoint**:
- [ ] createButton throws Error when onClick missing
- [ ] createButton throws Error when text missing for non-icon variants
- [ ] createButton supports 'primary' variant with correct colors
- [ ] createButton supports 'secondary' variant with correct colors
- [ ] createButton supports 'danger' variant with correct colors
- [ ] createButton supports 'icon' variant with normal_src/press_src
- [ ] createButton applies disabled appearance correctly
- [ ] createButton calculates radius as h * buttonRadiusRatio
- [ ] createButton uses TOKENS.sizing.buttonHeight as default height

---

### Step 7: Export All Functions

Ensure all factory functions are exported at the end of the file:

```javascript
// Re-export for convenience
export { TOKENS, getColor, getFontSize } from './design-tokens.js'
```

**Validation Checkpoint**:
- [ ] All 8 factory functions are exported
- [ ] TOKENS, getColor, getFontSize are re-exported
- [ ] ES module exports are correctly formatted

---

### Step 8: Final Integration Verification

**Test Script** (create `tests/ui-components.test.js`):
```javascript
// Import all factories
import {
  createBackground,
  createCard,
  createDivider,
  createText,
  createPageTitle,
  createSectionTitle,
  createBodyText,
  createButton,
  TOKENS,
  getColor,
  getFontSize
} from '../utils/ui-components.js'

// Test imports exist
console.assert(typeof createBackground === 'function')
console.assert(typeof createCard === 'function')
console.assert(typeof createDivider === 'function')
console.assert(typeof createText === 'function')
console.assert(typeof createPageTitle === 'function')
console.assert(typeof createSectionTitle === 'function')
console.assert(typeof createBodyText === 'function')
console.assert(typeof createButton === 'function')

// Test TOKENS extensions
console.assert(TOKENS.colors.cardBackground === 0x1a1c20)
console.assert(TOKENS.sizing.cardRadiusRatio === 0.07)

console.log('All ui-components tests passed!')
```

**Validation Checkpoint**:
- [ ] Test script runs without errors
- [ ] All factory functions are importable
- [ ] New tokens are accessible
- [ ] `npm run complete-check` passes

---

## Validation

### Success Criteria
1. **Syntax Verification**: File compiles without syntax errors
2. **Import Test**: All 8+ factory functions are importable
3. **TOKENS Integration**: Each component correctly references TOKENS values
4. **Parameter Validation**: Required parameters validated with appropriate errors
5. **Defaults Applied**: Optional parameters use TOKENS defaults correctly
6. **Component Output**: Each factory produces correct widget type and configuration
7. **Button Variants**: All four variants (primary, secondary, icon, danger) work correctly
8. **Helper Functions**: Text helpers call createText with correct presets

### Checkpoints

| Step | Checkpoint | Validation Method |
|------|------------|-------------------|
| 1 | Design tokens extended | Unit test assertions |
| 2 | File structure created | Import test |
| 3 | Helpers work correctly | Unit test edge cases |
| 4 | Shape factories produce correct output | Mock hmUI.createWidget |
| 5 | Text factories produce correct output | Mock hmUI.createWidget |
| 6 | Button variants work correctly | Mock hmUI.createWidget |
| 7 | All exports accessible | Import test |
| 8 | Integration verified | `npm run complete-check` |

### Rollback Notes
- If issues arise, the changes are additive only
- Revert `utils/design-tokens.js` to original state
- Delete `utils/ui-components.js`
- No other files are modified

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| hmUI undefined in tests | Medium | Low | getScreenDimensions has fallback |
| Missing hmUI widget types | Low | Medium | Factories return config, caller creates widget |
| Token naming conflicts | Low | Low | Using new unique names (cardBackground, cardRadiusRatio) |
| Breaking existing code | Very Low | Low | No modifications to existing files except design-tokens |

---

## Files Summary

### Created
- `utils/ui-components.js` - Main utility module (~250 lines)

### Modified
- `utils/design-tokens.js` - Add 2 new tokens (~5 lines)

### Total Changes
- **Lines Added**: ~255
- **Lines Modified**: ~5
- **New Functions**: 10 (8 factories + 2 helpers)
- **New Tokens**: 2
