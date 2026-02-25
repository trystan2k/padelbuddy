# Task Analysis
- **Main objective**: Create a centralized design tokens utility file (`utils/design-tokens.js`) that consolidates colors, typography, spacing, and sizing values with helper functions for dynamic access
- **Identified dependencies**: 
  - Existing utility patterns (`Object.freeze()`, ES6 exports) from `utils/scoring-constants.js`
  - Screen dimension pattern via `hmSetting.getDeviceInfo()` returning `{ width, height }`
  - `ensureNumber` fallback pattern used across page files
- **System impact**: 
  - Foundation file with no pages consuming it yet (minimal immediate impact)
  - Future migration path for page-specific tokens (HOME_TOKENS, GAME_TOKENS, etc.)
  - No breaking changes to existing functionality

## Chosen Approach

### Proposed Solution
Create a single `utils/design-tokens.js` file with:
1. A `TOKENS` object containing four categories (colors, typography, spacing, sizing)
2. Two helper functions: `getColor(path)` and `getFontSize(typographyKey)`
3. All values standardized (not preserving page-specific differences)
4. Flat object structure to prepare for future theming capabilities

### Justification for Simplicity
- **Matches existing patterns**: Follows the exact pattern from `utils/scoring-constants.js` with `Object.freeze()` and ES6 exports
- **Single responsibility**: One file, one purpose - centralized token access
- **Future-ready**: Flat structure enables easy theming implementation later
- **Minimal API surface**: Only two helper functions, keeping the interface simple

### Components to Be Created

| Component | Action | File |
|-----------|--------|------|
| Design Tokens Utility | Create new file | utils/design-tokens.js |

### Design Token Structure

```javascript
export const TOKENS = Object.freeze({
  colors: {
    background: 0x000000,
    text: 0xffffff,
    mutedText: 0x888888,
    accent: 0x1eb98c,
    danger: 0xff6d78,
    primaryButton: 0x1eb98c,
    secondaryButton: 0x24262b,
    disabled: 0x444444,
    divider: 0x333333
  },
  typography: {
    pageTitle: 0.0825,
    sectionTitle: 0.068,
    body: 0.055,
    bodyLarge: 0.08,
    score: 0.11,
    scoreDisplay: 0.28,
    caption: 0.036,
    button: 0.05,
    buttonLarge: 0.055
  },
  spacing: {
    pageTop: 0.05,
    pageBottom: 0.06,
    pageSide: 0.07,
    pageSideRound: 0.12,
    sectionGap: 0.02,
    headerTop: 0.04,
    headerToContent: 0.06,
    footerBottom: 0.07
  },
  sizing: {
    iconSmall: 24,
    iconMedium: 32,
    iconLarge: 48,
    buttonHeight: 0.105,
    buttonHeightLarge: 0.15,
    buttonRadiusRatio: 0.5,
    minTouchTarget: 48
  }
})
```

## Implementation Steps

### Step 1: Create File Structure with JSDoc Comments
Create `utils/design-tokens.js` with:
- File header comment explaining purpose
- Note about future theming plans (documented but not implemented)
- `@fileoverview` JSDoc for API documentation

```javascript
/**
 * @fileoverview Centralized design tokens for the Padel Buddy app.
 * 
 * This module provides standardized design values for colors, typography,
 * spacing, and sizing. All values are centralized to ensure consistency
 * across the application.
 * 
 * @module utils/design-tokens
 * 
 * NOTE: Future theming capability is planned but not yet implemented.
 * The flat structure of TOKENS prepares for easy theming support.
 */
```

### Step 2: Implement TOKENS Object with All Categories
Define the TOKENS constant with `Object.freeze()`:

**Colors Category:**
| Token | Value | Description |
|-------|-------|-------------|
| background | 0x000000 | Primary background (black) |
| text | 0xffffff | Primary text (white) |
| mutedText | 0x888888 | Secondary/subdued text |
| accent | 0x1eb98c | Brand accent color (green) |
| danger | 0xff6d78 | Error/destructive actions |
| primaryButton | 0x1eb98c | Primary button background |
| secondaryButton | 0x24262b | Secondary button background |
| disabled | 0x444444 | Disabled state |
| divider | 0x333333 | Separator lines |

**Typography Category (ratios for screenWidth multiplication):**
| Token | Ratio | Description |
|-------|-------|-------------|
| pageTitle | 0.0825 | Main page titles |
| sectionTitle | 0.068 | Section headers |
| body | 0.055 | Standard body text |
| bodyLarge | 0.08 | Emphasized body text |
| score | 0.11 | Score labels |
| scoreDisplay | 0.28 | Large score numbers |
| caption | 0.036 | Small helper text |
| button | 0.05 | Button text |
| buttonLarge | 0.055 | Large button text |

**Spacing Category (ratios for screen dimension multiplication):**
| Token | Ratio | Description |
|-------|-------|-------------|
| pageTop | 0.05 | Top margin for page content |
| pageBottom | 0.06 | Bottom margin for page content |
| pageSide | 0.07 | Side padding (square screens) |
| pageSideRound | 0.12 | Side padding (round screens) |
| sectionGap | 0.02 | Gap between sections |
| headerTop | 0.04 | Header top margin |
| headerToContent | 0.06 | Gap from header to content |
| footerBottom | 0.07 | Footer bottom margin |

**Sizing Category (mix of absolute pixels and ratios):**
| Token | Value | Description |
|-------|-------|-------------|
| iconSmall | 24 | Small icon size (px) |
| iconMedium | 32 | Medium icon size (px) |
| iconLarge | 48 | Large icon size (px) |
| buttonHeight | 0.105 | Standard button height (ratio) |
| buttonHeightLarge | 0.15 | Large button height (ratio) |
| buttonRadiusRatio | 0.5 | Button corner radius (ratio of height) |
| minTouchTarget | 48 | Minimum touch target (px) |

### Step 3: Implement getColor Helper Function
```javascript
/**
 * Retrieves a color value from the TOKENS.colors object using dot notation.
 * 
 * @param {string} path - Dot-notation path to the color (e.g., 'colors.accent')
 * @returns {number} The color value as a hex number
 * @throws {Error} If the path is invalid or the color doesn't exist
 * 
 * @example
 * getColor('colors.accent')     // Returns 0x1eb98c
 * getColor('colors.primaryButton') // Returns 0x1eb98c
 * getColor('invalid.path')      // Throws Error
 */
export function getColor(path) {
  if (typeof path !== 'string' || !path.includes('.')) {
    throw new Error(`Invalid color path: "${path}". Expected format: "colors.tokenName"`)
  }
  
  const [category, key] = path.split('.')
  
  if (category !== 'colors') {
    throw new Error(`Invalid color path: "${path}". Must start with "colors."`)
  }
  
  if (!(key in TOKENS.colors)) {
    throw new Error(`Unknown color token: "${key}". Available colors: ${Object.keys(TOKENS.colors).join(', ')}`)
  }
  
  return TOKENS.colors[key]
}
```

### Step 4: Implement getFontSize Helper Function
```javascript
/**
 * Calculates the pixel font size for a typography token based on screen width.
 * Retrieves screen dimensions internally using hmSetting.getDeviceInfo().
 * 
 * @param {string} typographyKey - The typography token key (e.g., 'pageTitle', 'body')
 * @returns {number} The calculated font size in pixels, rounded to nearest integer
 * @throws {Error} If the typography key doesn't exist
 * 
 * @example
 * getFontSize('pageTitle')  // Returns Math.round(width * 0.0825)
 * getFontSize('body')       // Returns Math.round(width * 0.055)
 */
export function getFontSize(typographyKey) {
  if (!(typographyKey in TOKENS.typography)) {
    throw new Error(`Unknown typography token: "${typographyKey}". Available tokens: ${Object.keys(TOKENS.typography).join(', ')}`)
  }
  
  // Get screen width from device
  let screenWidth = 390 // Default fallback for square screens
  
  if (typeof hmSetting !== 'undefined' && typeof hmSetting.getDeviceInfo === 'function') {
    const deviceInfo = hmSetting.getDeviceInfo()
    screenWidth = ensureNumber(deviceInfo?.width, 390)
  }
  
  const ratio = TOKENS.typography[typographyKey]
  return Math.round(screenWidth * ratio)
}

/**
 * Validates that a value is a valid number, returning a fallback if not.
 * @param {*} value - The value to validate
 * @param {number} fallback - The fallback value if invalid
 * @returns {number} The validated number or fallback
 */
function ensureNumber(value, fallback) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback
}
```

### Step 5: Add Export Statements
Ensure all exports are properly defined:
```javascript
// Main exports
export { TOKENS, getColor, getFontSize }
```

### Step 6: Final File Assembly
Combine all components into the final file structure:

```
utils/design-tokens.js
├── File header JSDoc
├── TOKENS constant (Object.freeze)
│   ├── colors (9 tokens)
│   ├── typography (9 tokens)
│   ├── spacing (8 tokens)
│   └── sizing (7 tokens)
├── ensureNumber helper (private)
├── getColor function
├── getFontSize function
└── Export statements
```

## Validation

### Pre-Implementation Checks
- [ ] Verify `utils/` directory exists
- [ ] Confirm existing utility patterns in `utils/scoring-constants.js`
- [ ] Document `hmSetting.getDeviceInfo()` usage pattern

### During Implementation Checks
- [ ] TOKENS object uses `Object.freeze()` for immutability
- [ ] All color values are hex numbers (0xRRGGBB format)
- [ ] Typography ratios match specification exactly
- [ ] Spacing ratios match specification exactly
- [ ] Sizing values include both absolute (px) and ratio values
- [ ] `getColor()` throws descriptive errors for invalid paths
- [ ] `getFontSize()` retrieves screen width internally
- [ ] `getFontSize()` uses `ensureNumber` fallback pattern

### Post-Implementation Verification
- [ ] File compiles without syntax errors
- [ ] TOKENS object structure matches requirements exactly
- [ ] Manual verification: Import file and test helper functions

### Manual Verification Test Script
```javascript
// Test script (run in Node.js or Zepp environment)
import { TOKENS, getColor, getFontSize } from './utils/design-tokens.js'

// Verify TOKENS structure
console.log('Colors:', Object.keys(TOKENS.colors))
console.log('Typography:', Object.keys(TOKENS.typography))
console.log('Spacing:', Object.keys(TOKENS.spacing))
console.log('Sizing:', Object.keys(TOKENS.sizing))

// Test getColor
console.log('Accent color:', getColor('colors.accent')) // Should return 0x1eb98c
console.log('Primary button:', getColor('colors.primaryButton')) // Should return 0x1eb98c

// Test error handling
try {
  getColor('invalid')
} catch (e) {
  console.log('Expected error:', e.message)
}

// Test getFontSize (mock hmSetting if needed)
console.log('Page title size:', getFontSize('pageTitle'))
console.log('Body size:', getFontSize('body'))
```

## Future Considerations

### Theming Support (Planned, Not Implemented)
The flat structure of TOKENS prepares for future theming:
```javascript
// Future implementation (not now):
// const TOKENS = Object.freeze(THEMES[activeTheme])
```

### Migration Path
When pages are ready to adopt centralized tokens:
1. Import `TOKENS` from `utils/design-tokens.js`
2. Replace page-specific token objects (HOME_TOKENS, GAME_TOKENS, etc.)
3. Use helper functions for dynamic values

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Token values don't match existing page tokens | Values are standardized per task spec - document differences |
| `hmSetting` unavailable in test environment | Use fallback default (390px) with `ensureNumber` |
| Invalid path passed to `getColor` | Throw descriptive error with available options |
| Typography key not found | Throw descriptive error with available tokens |

## Rollback Plan
Since this is a new file with no consumers:
1. Simply delete `utils/design-tokens.js` if issues arise
2. No page modifications required to revert
3. No impact on existing functionality
