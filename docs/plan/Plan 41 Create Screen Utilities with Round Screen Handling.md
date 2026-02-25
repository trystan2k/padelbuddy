# Task Analysis
- **Main objective**: Create `utils/screen-utils.js` providing essential screen measurement utilities and round screen geometry calculations to support adaptive layouts across different device shapes (square vs round screens)
- **Identified dependencies**:
  - Zepp OS v1.0 `hmUI.getScreenMetrics()` API for screen dimensions (as specified in task)
  - No dependencies on other utility files (standalone module)
  - JavaScript Math APIs: `Math.abs()`, `Math.round()`, `Math.max()`, `Math.min()`, `Math.sqrt()`
- **System impact**:
  - Foundation utility file with no immediate consumers (low risk)
  - Enables future pages to handle round screen layouts correctly
  - No breaking changes to existing functionality

## Chosen Approach

### Proposed Solution
Create a single `utils/screen-utils.js` file with 6 utility functions using named exports:
1. **getScreenMetrics()** - Returns screen dimensions and round screen detection
2. **clamp(value, min, max)** - Constrains values within bounds
3. **ensureNumber(value, fallback)** - Safe number validation with fallback
4. **pct(screenDimension, percentage)** - Percentage to pixel conversion
5. **getRoundSafeInset(width, height, y, padding)** - Round screen safe area calculation
6. **getRoundSafeSectionInset(width, height, sectionTop, sectionHeight, padding)** - Section-level safe inset

### Justification for Simplicity
- **Minimal API surface**: Only 6 focused functions with single responsibilities
- **No external dependencies**: Pure JavaScript, no imports required
- **Follows task specification exactly**: Implements all specified algorithms verbatim
- **Named exports**: Simple import pattern `import { func1, func2 } from 'utils/screen-utils.js'`

### Components to Be Created

| Component | Action | File |
|-----------|--------|------|
| Screen Utilities | Create new file | utils/screen-utils.js |

## Implementation Steps

### Step 1: Create File with JSDoc Header (Subtask 41.1)
Create `utils/screen-utils.js` with file header documentation:

```javascript
/**
 * @fileoverview Screen utilities for adaptive layouts across device shapes.
 *
 * Provides essential screen measurement utilities and round screen geometry
 * calculations to support adaptive layouts for both square and round screens.
 *
 * @module utils/screen-utils
 */
```

### Step 2: Implement getScreenMetrics() (Subtask 41.2)
Returns screen dimensions with round screen detection:

```javascript
/**
 * Retrieves screen metrics including dimensions and round screen detection.
 * Uses hmUI.getScreenMetrics() to obtain screen dimensions.
 *
 * @returns {{width: number, height: number, isRound: boolean}} Screen metrics object
 *
 * @example
 * const { width, height, isRound } = getScreenMetrics()
 * // width: 466 (GTR 3), height: 466 (GTR 3), isRound: true
 * // width: 390 (GTS 3), height: 450 (GTS 3), isRound: false
 */
export function getScreenMetrics() {
  const metrics = hmUI.getScreenMetrics()
  const width = metrics.width
  const height = metrics.height
  const isRound = Math.abs(width - height) <= Math.round(width * 0.04)

  return { width, height, isRound }
}
```

**Algorithm Details:**
- Calls `hmUI.getScreenMetrics()` to retrieve native screen dimensions
- Calculates `isRound` using: `Math.abs(width - height) <= Math.round(width * 0.04)`
- Returns object with `width`, `height`, and `isRound` properties

### Step 3: Implement clamp() (Subtask 41.1)
Constrains a value within a specified range:

```javascript
/**
 * Constrains a value within a specified range.
 *
 * @param {number} value - The value to constrain
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @returns {number} The constrained value
 *
 * @example
 * clamp(150, 0, 100)  // Returns 100
 * clamp(-10, 0, 100)  // Returns 0
 * clamp(50, 0, 100)   // Returns 50
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
```

### Step 4: Implement ensureNumber() (Subtask 41.1)
Validates and returns a number with fallback:

```javascript
/**
 * Validates that a value is a valid number, returning a fallback if not.
 *
 * @param {*} value - The value to validate
 * @param {number} [fallback=0] - The fallback value if invalid (defaults to 0)
 * @returns {number} The validated number or fallback
 *
 * @example
 * ensureNumber(42)         // Returns 42
 * ensureNumber('invalid')  // Returns 0
 * ensureNumber(null, 10)   // Returns 10
 * ensureNumber(NaN, 5)     // Returns 5
 */
export function ensureNumber(value, fallback = 0) {
  return typeof value === 'number' && !Number.isNaN(value) ? value : fallback
}
```

### Step 5: Implement pct() (Subtask 41.1)
Converts percentage to pixels, handling both 0-1 and 0-100 formats:

```javascript
/**
 * Converts a percentage to pixels based on a screen dimension.
 * Handles both 0-1 (decimal) and 0-100 (percentage) formats.
 *
 * @param {number} screenDimension - The base dimension (width or height)
 * @param {number} percentage - The percentage value (0-1 or 0-100)
 * @returns {number} The calculated pixel value
 *
 * @example
 * pct(400, 0.1)   // Returns 40 (decimal format)
 * pct(400, 10)    // Returns 40 (percentage format)
 * pct(400, 50)    // Returns 200
 */
export function pct(screenDimension, percentage) {
  // Handle both 0-1 and 0-100 formats
  const normalizedPercentage = percentage > 1 ? percentage / 100 : percentage
  return screenDimension * normalizedPercentage
}
```

### Step 6: Implement getRoundSafeInset() (Subtask 41.3)
Calculates safe inset for round screens at a specific Y position using circle geometry:

```javascript
/**
 * Calculates the safe inset for round screens at a specific Y position.
 * Uses circle geometry to find the chord at the given Y position.
 *
 * Algorithm:
 * - centerX = width / 2
 * - radius = width / 2
 * - yFromCenter = y - (height / 2)
 * - halfChord = Math.sqrt(radius * radius - yFromCenter * yFromCenter)
 * - Return Math.max(0, centerX - halfChord + padding)
 *
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} y - The Y position to calculate inset for
 * @param {number} padding - Additional padding from edge (default: 4)
 * @returns {number} The safe inset value from the left edge
 *
 * @example
 * // For a 466x466 round screen at y=233 (center)
 * getRoundSafeInset(466, 466, 233, 4)  // Returns 4 (minimum at center)
 *
 * // At y=0 (top edge)
 * getRoundSafeInset(466, 466, 0, 4)    // Returns ~237 (large inset at edge)
 */
export function getRoundSafeInset(width, height, y, padding = 4) {
  const centerX = width / 2
  const radius = width / 2
  const yFromCenter = y - (height / 2)
  const halfChord = Math.sqrt(radius * radius - yFromCenter * yFromCenter)
  return Math.max(0, centerX - halfChord + padding)
}
```

**Geometry Explanation:**
```
Round screen (top-down view):
        _______
       /       \
      |    •    |  ← y position, chord width varies
       \_______/
       
At y=height/2 (center): chord = diameter, inset = padding only
At y=0 (top): chord = small, inset = large
```

### Step 7: Implement getRoundSafeSectionInset() (Subtask 41.4)
Calculates safe inset for an entire section by finding maximum inset:

```javascript
/**
 * Calculates the safe inset for an entire section on round screens.
 * Computes insets for both top and bottom of section, returns the maximum.
 *
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} sectionTop - The Y position of section top
 * @param {number} sectionHeight - The height of the section
 * @param {number} padding - Additional padding from edge (default: 4)
 * @returns {number} The maximum safe inset value for the entire section
 *
 * @example
 * // For a section spanning y=100 to y=200 on a 466x466 screen
 * getRoundSafeSectionInset(466, 466, 100, 100, 4)
 * // Returns max of insets at y=100 and y=200
 */
export function getRoundSafeSectionInset(width, height, sectionTop, sectionHeight, padding = 4) {
  const sectionBottom = sectionTop + sectionHeight
  const topInset = getRoundSafeInset(width, height, sectionTop, padding)
  const bottomInset = getRoundSafeInset(width, height, sectionBottom, padding)
  return Math.max(topInset, bottomInset)
}
```

### Step 8: Final File Assembly
Complete file structure:

```
utils/screen-utils.js
├── File header JSDoc
├── getScreenMetrics()     [Lines ~15-30]
├── clamp()                [Lines ~35-50]
├── ensureNumber()         [Lines ~55-75]
├── pct()                  [Lines ~80-100]
├── getRoundSafeInset()    [Lines ~105-140]
└── getRoundSafeSectionInset() [Lines ~145-170]
```

### Step 9: Testing and Validation (Subtask 41.5)
Verify all functions work correctly:

```javascript
// Test script for validation
import {
  getScreenMetrics,
  clamp,
  ensureNumber,
  pct,
  getRoundSafeInset,
  getRoundSafeSectionInset
} from './utils/screen-utils.js'

// Test clamp
console.assert(clamp(150, 0, 100) === 100, 'clamp: upper bound')
console.assert(clamp(-10, 0, 100) === 0, 'clamp: lower bound')
console.assert(clamp(50, 0, 100) === 50, 'clamp: within range')

// Test ensureNumber
console.assert(ensureNumber(42) === 42, 'ensureNumber: valid number')
console.assert(ensureNumber('invalid') === 0, 'ensureNumber: invalid string')
console.assert(ensureNumber(null, 10) === 10, 'ensureNumber: null with fallback')
console.assert(ensureNumber(NaN, 5) === 5, 'ensureNumber: NaN with fallback')

// Test pct
console.assert(pct(400, 0.1) === 40, 'pct: decimal format')
console.assert(pct(400, 10) === 40, 'pct: percentage format')
console.assert(pct(400, 50) === 200, 'pct: 50 percent')

// Test getRoundSafeInset (466x466 round screen)
// At center (y=233): inset should be minimal (just padding)
const centerInset = getRoundSafeInset(466, 466, 233, 4)
console.assert(centerInset === 4, 'getRoundSafeInset: center position')

// Test getRoundSafeSectionInset
const sectionInset = getRoundSafeSectionInset(466, 466, 100, 100, 4)
console.assert(sectionInset > 0, 'getRoundSafeSectionInset: returns positive value')
```

## Validation

### Pre-Implementation Checks
- [ ] Verify `utils/` directory exists
- [ ] Confirm Zepp OS v1.0 API availability for `hmUI.getScreenMetrics()`
- [ ] No conflicts with existing utility files

### During Implementation Checks
- [ ] All 6 functions use `export` keyword
- [ ] Default padding value is `4` where applicable
- [ ] `isRound` calculation matches: `Math.abs(width - height) <= Math.round(width * 0.04)`
- [ ] `pct()` handles both 0-1 and 0-100 percentage formats
- [ ] `getRoundSafeInset()` uses correct circle geometry formula
- [ ] `getRoundSafeSectionInset()` calls `getRoundSafeInset()` for top and bottom

### Post-Implementation Verification
- [ ] File compiles without syntax errors
- [ ] Run `npm run complete-check` - all QA checks pass
- [ ] All 6 functions are exported and accessible
- [ ] Biome linting passes (2-space indentation, semicolons)

### Acceptance Criteria Validation
| Criteria | Verification Method |
|----------|---------------------|
| File utils/screen-utils.js exists | File system check |
| Exports all 6 functions | Import test |
| Functions behave per specification | Unit tests |
| File compiles without errors | Build/syntax check |
| QA checks pass | `npm run complete-check` |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| `hmUI.getScreenMetrics()` unavailable in test environment | Functions are pure utilities; mock metrics for testing |
| `ensureNumber` duplicates design-tokens.js | Task specifies fresh implementation; acceptable duplication |
| Round screen calculation edge cases | Formula handles edge positions; `Math.max(0, ...)` prevents negative |
| Percentage format ambiguity | `pct()` auto-detects format (0-1 vs 0-100) |

## Rollback Plan
Since this is a new file with no consumers:
1. Delete `utils/screen-utils.js` if issues arise
2. No page modifications required to revert
3. No impact on existing functionality

## Subtask Summary

| Subtask | Description | Dependencies | Status |
|---------|-------------|--------------|--------|
| 41.1 | Create screen-utils.js with basic utility functions | None | Pending |
| 41.2 | Implement getScreenMetrics function | None | Pending |
| 41.3 | Implement getRoundSafeInset function | None | Pending |
| 41.4 | Implement getRoundSafeSectionInset function | None | Pending |
| 41.5 | Test and validate all functions | 41.1-41.4 | Pending |
