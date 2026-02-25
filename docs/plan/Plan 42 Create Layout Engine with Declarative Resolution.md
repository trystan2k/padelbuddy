# Task Analysis
- **Main objective**: Create `utils/layout-engine.js` implementing a declarative layout system that resolves schemas to pixel coordinates, supporting sections and elements with percentage, pixel, and reference-based positioning
- **Identified dependencies**:
  - Task #41 (completed): `utils/screen-utils.js` providing `getScreenMetrics`, `clamp`, `ensureNumber`, `pct`, `getRoundSafeInset`, `getRoundSafeSectionInset`
  - Zepp OS v1.0 JavaScript runtime
  - JavaScript Math APIs: `Math.round()`, `Math.max()`, `Math.min()`
- **System impact**:
  - Foundation utility for all screen layouts
  - Enables declarative UI definitions across pages
  - Replaces manual coordinate calculations
  - Low risk: new file with no immediate consumers

## Chosen Approach

### Proposed Solution
Create a two-pass layout resolution engine:

1. **Pass 1 - Section Resolution**: Resolve all section coordinates first, storing them in a lookup table
2. **Pass 2 - Element Resolution**: Use resolved sections to position elements with alignment support

The engine exposes a single function: `resolveLayout(schema, metrics)` returning `{ sections: {...}, elements: {...} }`

### Justification for Simplicity
- **Two-pass approach**: Natural fit for the dependency graph (elements depend on sections)
- **Regex-based parsing**: Simple, performant, no AST complexity
- **Single export**: Minimal API surface reduces cognitive load
- **Graceful degradation**: Never throws - always returns valid coordinates
- **Testable phases**: Each pass can be validated independently

### Components to Be Modified/Created

| Component | Action | File |
|-----------|--------|------|
| Layout Engine | Create new file | utils/layout-engine.js |
| Layout Engine Tests | Create new file | tests/layout-engine.test.js |

## Implementation Steps

### Step 1: Create File Structure and Main Function Skeleton (Subtask 42.1)

Create `utils/layout-engine.js` with file header and main function skeleton:

```javascript
/**
 * @fileoverview Declarative layout engine for resolving UI schemas to pixel coordinates.
 *
 * Provides a two-pass resolution system:
 * 1. Section pass: Resolves vertical sections with percentage/fill height support
 * 2. Element pass: Positions elements within sections using references and alignment
 *
 * @module utils/layout-engine
 */

import {
  getScreenMetrics,
  clamp,
  ensureNumber,
  pct,
  getRoundSafeSectionInset
} from './screen-utils.js'

/**
 * Resolves a layout schema to pixel coordinates.
 *
 * @param {Object} schema - The layout schema
 * @param {Object} schema.sections - Map of section definitions
 * @param {Object} schema.elements - Map of element definitions
 * @param {Object} [metrics] - Screen metrics (optional, uses getScreenMetrics() if not provided)
 * @returns {{sections: Object, elements: Object}} Resolved coordinates
 *
 * @example
 * const layout = resolveLayout({
 *   sections: {
 *     header: { height: '15%', top: 0 },
 *     content: { height: 'fill', after: 'header' },
 *     footer: { height: '60px', bottom: 0 }
 *   },
 *   elements: {
 *     title: { section: 'header', x: 'center', y: '10%', width: '80%', height: '50%' }
 *   }
 * })
 */
export function resolveLayout(schema, metrics) {
  const resolvedMetrics = metrics || getScreenMetrics()
  const { width, height, isRound } = resolvedMetrics

  // Initialize result containers
  const resolvedSections = {}
  const resolvedElements = {}

  // Validate schema
  const safeSchema = ensureSchema(schema)

  // Pass 1: Resolve sections
  resolveSections(safeSchema.sections, resolvedSections, width, height, isRound)

  // Pass 2: Resolve elements
  resolveElements(safeSchema.elements, resolvedElements, resolvedSections, width, height)

  return {
    sections: resolvedSections,
    elements: resolvedElements
  }
}
```

**Key Design Decisions:**
- Schema validation happens upfront with fallbacks
- Metrics parameter optional (uses `getScreenMetrics()` as default)
- Two-phase resolution (sections → elements)

### Step 2: Implement Value Parsing Helper Functions (Subtask 42.2)

Create parsing utilities for different value types:

```javascript
/**
 * Parses a value that may be a percentage, reference, expression, or pixel value.
 *
 * @param {*} value - The value to parse
 * @param {Object} context - Resolution context with dimensions and resolved sections
 * @param {number} context.baseDimension - Base dimension for percentage calculation
 * @param {Object} [context.sections] - Resolved sections for reference lookup
 * @param {string} [context.refType] - 'y' for vertical references, 'x' for horizontal
 * @returns {number} The resolved pixel value
 */
function parseValue(value, context) {
  // Null/undefined → 0
  if (value == null) return 0

  // Number → treat as pixels
  if (typeof value === 'number') {
    return ensureNumber(value, 0)
  }

  // String parsing
  if (typeof value === 'string') {
    // Percentage: "10%", "2.5%"
    const percentMatch = value.match(/^(\d+(?:\.\d+)?)%$/)
    if (percentMatch) {
      const percentage = parseFloat(percentMatch[1])
      const clampedPct = clamp(percentage, 0, 100)
      return Math.round(pct(context.baseDimension, clampedPct))
    }

    // Expression with reference and offset: "header.bottom + 2%", "content.top - 10px"
    const exprMatch = value.match(/^(\w+)\.(\w+)\s*([+-])\s*(\d+(?:\.\d+)?)(%|px)?$/)
    if (exprMatch && context.sections) {
      const [, sectionName, property, operator, offset, unit] = exprMatch
      const baseValue = getSectionProperty(context.sections, sectionName, property, context.refType)
      const offsetValue = unit === '%'
        ? Math.round(pct(context.baseDimension, clamp(parseFloat(offset), 0, 100)))
        : ensureNumber(parseFloat(offset), 0)

      return operator === '+' ? baseValue + offsetValue : baseValue - offsetValue
    }

    // Simple reference: "header.bottom", "content.top"
    const refMatch = value.match(/^(\w+)\.(\w+)$/)
    if (refMatch && context.sections) {
      const [, sectionName, property] = refMatch
      return getSectionProperty(context.sections, sectionName, property, context.refType)
    }

    // 'fill' keyword - handled specially in section resolution
    if (value === 'fill') {
      return null // Signal for fill calculation
    }

    // 'center' keyword - handled in element alignment
    if (value === 'center') {
      return null // Signal for centering
    }
  }

  // Fallback
  return 0
}

/**
 * Gets a property value from a resolved section.
 *
 * @param {Object} sections - Resolved sections lookup
 * @param {string} sectionName - Name of the section
 * @param {string} property - Property name (top, bottom, left, right)
 * @param {string} refType - 'y' or 'x' for dimension context
 * @returns {number} The property value or 0 if not found
 */
function getSectionProperty(sections, sectionName, property, refType) {
  const section = sections[sectionName]
  if (!section) return 0

  switch (property) {
    case 'top':
      return section.y
    case 'bottom':
      return section.y + section.h
    case 'left':
      return section.x
    case 'right':
      return section.x + section.w
    default:
      return 0
  }
}

/**
 * Validates and normalizes a schema object.
 *
 * @param {*} schema - The schema to validate
 * @returns {Object} Normalized schema with sections and elements
 */
function ensureSchema(schema) {
  if (!schema || typeof schema !== 'object') {
    return { sections: {}, elements: {} }
  }
  return {
    sections: schema.sections || {},
    elements: schema.elements || {}
  }
}
```

**Parsing Rules:**
| Pattern | Example | Resolution |
|---------|---------|------------|
| Percentage | `"10%"` | `Math.round(dimension * 10 / 100)` |
| Pixel number | `50` | `50` (literal pixels) |
| Reference | `"header.bottom"` | `sections.header.y + sections.header.h` |
| Expression | `"header.bottom + 2%"` | `ref + Math.round(dimension * 2 / 100)` |
| Fill | `"fill"` | Calculated in section pass |
| Center | `"center"` | Calculated in element pass |

### Step 3: Implement Section Resolution Pass (Subtask 42.3)

Resolve all sections in declaration order:

```javascript
/**
 * Resolves all sections to pixel coordinates.
 *
 * @param {Object} sections - Section definitions
 * @param {Object} resolved - Output object for resolved sections
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {boolean} isRound - Whether screen is round
 */
function resolveSections(sections, resolved, width, height, isRound) {
  // Track Y position for sequential sections
  let currentY = 0
  const sectionNames = Object.keys(sections)

  // First pass: resolve fixed and percentage heights, mark fill sections
  const fillSections = []
  let usedHeight = 0

  sectionNames.forEach((name) => {
    const section = sections[name]
    const safeSection = normalizeSection(section)

    // Calculate top position
    let top = 0
    if (safeSection.top != null) {
      top = parseValue(safeSection.top, { baseDimension: height })
    } else if (safeSection.after) {
      const afterSection = resolved[safeSection.after]
      top = afterSection ? afterSection.y + afterSection.h + parseGap(safeSection.gap, height) : 0
    } else if (safeSection.bottom != null) {
      // Bottom-anchored: calculate height first, then derive top
      // Handled in second pass
    }

    // Calculate height
    let sectionHeight = 0
    if (safeSection.height === 'fill') {
      fillSections.push({ name, top, section: safeSection })
      resolved[name] = { x: 0, y: top, w: width, h: 0 } // Placeholder
      return
    } else if (typeof safeSection.height === 'string' && safeSection.height.endsWith('%')) {
      sectionHeight = parseValue(safeSection.height, { baseDimension: height })
    } else if (typeof safeSection.height === 'number') {
      sectionHeight = safeSection.height
    } else {
      sectionHeight = parseValue(safeSection.height, { baseDimension: height })
    }

    usedHeight += sectionHeight + parseGap(safeSection.gap, height)

    // Calculate side inset for round screens
    const sideInset = calculateSideInset(safeSection, width, height, top, sectionHeight, isRound)

    resolved[name] = {
      x: sideInset,
      y: top,
      w: width - (sideInset * 2),
      h: sectionHeight
    }
  })

  // Second pass: distribute remaining space to fill sections
  if (fillSections.length > 0) {
    const remainingHeight = Math.max(0, height - usedHeight)
    const fillHeightEach = Math.floor(remainingHeight / fillSections.length)

    fillSections.forEach(({ name, top, section }, index) => {
      const isLast = index === fillSections.length - 1
      const sectionHeight = isLast
        ? remainingHeight - (fillHeightEach * index)
        : fillHeightEach

      const sideInset = calculateSideInset(section, width, height, top, sectionHeight, isRound)

      resolved[name] = {
        x: sideInset,
        y: top,
        w: width - (sideInset * 2),
        h: Math.max(0, sectionHeight)
      }

      // Update currentY for subsequent sections
      currentY = top + sectionHeight + parseGap(section.gap, height)
    })
  }

  // Third pass: handle bottom-anchored sections
  sectionNames.forEach((name) => {
    const section = sections[name]
    if (section.bottom != null && resolved[name].h === 0) {
      const bottom = parseValue(section.bottom, { baseDimension: height })
      const sectionHeight = typeof section.height === 'number'
        ? section.height
        : parseValue(section.height || '0', { baseDimension: height })

      const sideInset = calculateSideInset(normalizeSection(section), width, height, bottom - sectionHeight, sectionHeight, isRound)

      resolved[name] = {
        x: sideInset,
        y: Math.max(0, bottom - sectionHeight),
        w: width - (sideInset * 2),
        h: sectionHeight
      }
    }
  })
}

/**
 * Normalizes a section definition with defaults.
 */
function normalizeSection(section) {
  if (!section || typeof section !== 'object') {
    return { roundSafeInset: true, sideInset: 0 }
  }
  return {
    top: section.top,
    bottom: section.bottom,
    after: section.after,
    gap: section.gap,
    height: section.height,
    sideInset: section.sideInset ?? 0,
    roundSafeInset: section.roundSafeInset ?? true
  }
}

/**
 * Parses gap value to pixels.
 */
function parseGap(gap, height) {
  if (gap == null) return 0
  if (typeof gap === 'number') return gap
  if (typeof gap === 'string' && gap.endsWith('%')) {
    return parseValue(gap, { baseDimension: height })
  }
  return 0
}

/**
 * Calculates side inset for a section.
 */
function calculateSideInset(section, width, height, top, sectionHeight, isRound) {
  // Explicit side inset takes precedence
  if (section.sideInset != null && section.sideInset !== 0) {
    if (typeof section.sideInset === 'string' && section.sideInset.endsWith('%')) {
      return parseValue(section.sideInset, { baseDimension: width })
    }
    return ensureNumber(section.sideInset, 0)
  }

  // Round screen safe inset
  if (isRound && section.roundSafeInset !== false) {
    return getRoundSafeSectionInset(width, height, top, sectionHeight)
  }

  return 0
}
```

**Section Resolution Algorithm:**
1. First pass: Resolve fixed and percentage heights, identify fill sections
2. Second pass: Distribute remaining space to fill sections
3. Third pass: Handle bottom-anchored sections

### Step 4: Implement Element Resolution Pass (Subtask 42.4)

Resolve elements within their parent sections:

```javascript
/**
 * Resolves all elements to pixel coordinates.
 *
 * @param {Object} elements - Element definitions
 * @param {Object} resolved - Output object for resolved elements
 * @param {Object} sections - Resolved sections for reference
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 */
function resolveElements(elements, resolved, sections, width, height) {
  Object.keys(elements).forEach((name) => {
    const element = elements[name]
    const safeElement = normalizeElement(element)

    // Get parent section or use full screen
    const parentSection = safeElement.section && sections[safeElement.section]
      ? sections[safeElement.section]
      : { x: 0, y: 0, w: width, h: height }

    // Parse dimensions
    const elemWidth = parseValue(safeElement.width, {
      baseDimension: parentSection.w,
      sections
    })

    const elemHeight = parseValue(safeElement.height, {
      baseDimension: parentSection.h,
      sections
    })

    // Parse position (relative to section origin)
    let x = parseValue(safeElement.x, {
      baseDimension: parentSection.w,
      sections,
      refType: 'x'
    })

    let y = parseValue(safeElement.y, {
      baseDimension: parentSection.h,
      sections,
      refType: 'y'
    })

    // Apply alignment
    x = applyAlignment(safeElement.align, x, elemWidth, parentSection)

    // Final coordinates (relative to screen origin)
    resolved[name] = {
      x: clamp(parentSection.x + x, 0, width - elemWidth),
      y: clamp(parentSection.y + y, 0, height - elemHeight),
      w: clamp(elemWidth, 0, width),
      h: clamp(elemHeight, 0, height)
    }
  })
}

/**
 * Normalizes an element definition with defaults.
 */
function normalizeElement(element) {
  if (!element || typeof element !== 'object') {
    return { x: 0, y: 0, width: 0, height: 0, align: 'left' }
  }
  return {
    section: element.section,
    x: element.x ?? 0,
    y: element.y ?? 0,
    width: element.width ?? 0,
    height: element.height ?? 0,
    align: element.align ?? 'left'
  }
}

/**
 * Applies horizontal alignment to element position.
 *
 * @param {string} align - Alignment mode ('left', 'center', 'right')
 * @param {number} x - Current x position
 * @param {number} width - Element width
 * @param {Object} section - Parent section bounds
 * @returns {number} Adjusted x position
 */
function applyAlignment(align, x, width, section) {
  switch (align) {
    case 'center':
      return (section.w - width) / 2
    case 'right':
      return section.w - width
    case 'left':
    default:
      return x
  }
}
```

**Element Resolution Algorithm:**
1. Get parent section bounds (or full screen if section missing)
2. Parse dimensions relative to section size
3. Parse position relative to section origin
4. Apply alignment (center, left, right)
5. Convert to screen coordinates with clamping

### Step 5: Add Round Safe Inset Handling and Error Fallbacks (Subtask 42.5)

Add comprehensive error handling:

```javascript
/**
 * Safe wrapper for parseValue that never throws.
 *
 * @param {*} value - The value to parse
 * @param {Object} context - Resolution context
 * @returns {number} The resolved value or 0 on error
 */
function safeParseValue(value, context) {
  try {
    return parseValue(value, context)
  } catch {
    return 0
  }
}

/**
 * Safe wrapper for resolveLayout that never throws.
 *
 * @param {Object} schema - The layout schema
 * @param {Object} [metrics] - Screen metrics
 * @returns {{sections: Object, elements: Object}} Resolved coordinates (empty on error)
 */
export function safeResolveLayout(schema, metrics) {
  try {
    return resolveLayout(schema, metrics)
  } catch {
    return { sections: {}, elements: {} }
  }
}

// Update main resolveLayout with try-catch in critical sections
export function resolveLayout(schema, metrics) {
  try {
    const resolvedMetrics = metrics || getScreenMetrics()
    const { width, height, isRound } = resolvedMetrics

    // Validate and sanitize metrics
    const safeWidth = ensureNumber(width, 390)
    const safeHeight = ensureNumber(height, 450)
    const safeIsRound = Boolean(isRound)

    // Initialize result containers
    const resolvedSections = {}
    const resolvedElements = {}

    // Validate schema
    const safeSchema = ensureSchema(schema)

    // Pass 1: Resolve sections (with error handling)
    try {
      resolveSections(safeSchema.sections, resolvedSections, safeWidth, safeHeight, safeIsRound)
    } catch (sectionError) {
      // Log in development, continue with empty sections
      console.error('Section resolution error:', sectionError)
    }

    // Pass 2: Resolve elements (with error handling)
    try {
      resolveElements(safeSchema.elements, resolvedElements, resolvedSections, safeWidth, safeHeight)
    } catch (elementError) {
      // Log in development, continue with empty elements
      console.error('Element resolution error:', elementError)
    }

    return {
      sections: resolvedSections,
      elements: resolvedElements
    }
  } catch (fatalError) {
    // Ultimate fallback - return empty layout
    return { sections: {}, elements: {} }
  }
}
```

**Error Handling Strategy:**
| Error Scenario | Handling |
|----------------|----------|
| Invalid schema | Return empty sections/elements |
| Missing section reference | Use 0 for coordinates |
| Invalid percentage | Clamp to 0-100% |
| Negative dimensions | Clamp to 0 |
| Out-of-bounds position | Clamp to screen bounds |
| Circular section reference | Use 0 (detected by undefined lookup) |
| Parse errors | Return default value (0) |

### Step 6: Create Test File (tests/layout-engine.test.js)

Create comprehensive tests following the project's test pattern:

```javascript
/**
 * @fileoverview Tests for the declarative layout engine.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { resolveLayout, safeResolveLayout } from '../utils/layout-engine.js'

// Mock metrics for consistent testing
const mockMetrics = {
  width: 400,
  height: 500,
  isRound: false
}

const mockRoundMetrics = {
  width: 466,
  height: 466,
  isRound: true
}

// ============================================
// Test 1: File compiles and basic resolution
// ============================================
test('resolveLayout returns plausible numeric coordinates', () => {
  const layout = resolveLayout({
    sections: {
      header: { height: '15%', top: 0 }
    },
    elements: {
      title: { section: 'header', x: 0, y: 0, width: '100%', height: '50%' }
    }
  }, mockMetrics)

  // Section should have numeric coordinates
  assert.equal(typeof layout.sections.header.x, 'number')
  assert.equal(typeof layout.sections.header.y, 'number')
  assert.equal(typeof layout.sections.header.w, 'number')
  assert.equal(typeof layout.sections.header.h, 'number')

  // Header should be 15% of 500 = 75px
  assert.equal(layout.sections.header.h, 75)
  assert.equal(layout.sections.header.y, 0)

  // Element should have numeric coordinates
  assert.equal(typeof layout.elements.title.x, 'number')
  assert.equal(typeof layout.elements.title.y, 'number')
  assert.equal(typeof layout.elements.title.w, 'number')
  assert.equal(typeof layout.elements.title.h, 'number')
})

// ============================================
// Test 2: Reference resolution
// ============================================
test('section references like "header.bottom" resolve to correct coordinates', () => {
  const layout = resolveLayout({
    sections: {
      header: { height: '10%', top: 0 },
      content: { height: '80%', after: 'header' }
    }
  }, mockMetrics)

  // Header bottom = header.y + header.h = 0 + 50 = 50
  const headerBottom = layout.sections.header.y + layout.sections.header.h

  // Content should start at header bottom
  assert.equal(layout.sections.content.y, headerBottom)
  assert.equal(layout.sections.content.y, 50)
})

test('expression parsing with offset computes correctly', () => {
  // Expression like "header.bottom + 2%" should add 2% of height
  const layout = resolveLayout({
    sections: {
      header: { height: '10%', top: 0 },
      content: { height: '70%', top: 'header.bottom + 2%' }
    }
  }, mockMetrics)

  // header.bottom = 50
  // 2% of 500 = 10
  // Expected content.y = 60
  assert.equal(layout.sections.content.y, 60)
})

// ============================================
// Test 3: Fill height calculation
// ============================================
test('"fill" height correctly calculates remaining space', () => {
  const layout = resolveLayout({
    sections: {
      header: { height: '20%', top: 0 },
      content: { height: 'fill', after: 'header' },
      footer: { height: '15%', bottom: 0 }
    }
  }, mockMetrics)

  // Total fixed: 20% (100px) + 15% (75px) = 175px
  // Remaining for fill: 500 - 175 = 325px
  assert.equal(layout.sections.header.h, 100)
  assert.equal(layout.sections.footer.h, 75)
  assert.equal(layout.sections.content.h, 325)
})

test('multiple fill sections distribute space evenly', () => {
  const layout = resolveLayout({
    sections: {
      top: { height: '20%', top: 0 },
      fill1: { height: 'fill', after: 'top' },
      fill2: { height: 'fill', after: 'fill1' }
    }
  }, mockMetrics)

  // Fixed: 20% = 100px
  // Remaining: 400px split between two fills = 200px each
  assert.equal(layout.sections.fill1.h, 200)
  assert.equal(layout.sections.fill2.h, 200)
})

// ============================================
// Test 4: Error handling
// ============================================
test('invalid section references fallback to 0', () => {
  const layout = resolveLayout({
    sections: {
      content: { height: '50%', after: 'nonexistent' }
    }
  }, mockMetrics)

  // Should not throw, should use 0 for missing section reference
  assert.equal(layout.sections.content.y, 0)
})

test('invalid percentages get clamped to 0-100', () => {
  const layout = resolveLayout({
    sections: {
      header: { height: '150%', top: 0 }, // Invalid > 100
      footer: { height: '-20%', bottom: 0 } // Invalid < 0
    }
  }, mockMetrics)

  // 150% should clamp to 100% = 500px
  assert.equal(layout.sections.header.h, 500)

  // -20% should clamp to 0% = 0px
  assert.equal(layout.sections.footer.h, 0)
})

test('missing parent sections cause elements to use full screen bounds', () => {
  const layout = resolveLayout({
    sections: {},
    elements: {
      orphan: { section: 'nonexistent', x: '10%', y: '10%', width: '50%', height: '30%' }
    }
  }, mockMetrics)

  // Element should be positioned relative to full screen (0,0)
  assert.equal(layout.elements.orphan.x, 40) // 10% of 400
  assert.equal(layout.elements.orphan.y, 50) // 10% of 500
  assert.equal(layout.elements.orphan.w, 200) // 50% of 400
  assert.equal(layout.elements.orphan.h, 150) // 30% of 500
})

test('null schema returns empty layout without throwing', () => {
  const layout = resolveLayout(null, mockMetrics)

  assert.deepEqual(layout.sections, {})
  assert.deepEqual(layout.elements, {})
})

test('safeResolveLayout never throws on any input', () => {
  // These should not throw
  assert.doesNotThrow(() => safeResolveLayout(null, null))
  assert.doesNotThrow(() => safeResolveLayout(undefined, undefined))
  assert.doesNotThrow(() => safeResolveLayout('invalid', 'invalid'))
  assert.doesNotThrow(() => safeResolveLayout({ sections: 'bad' }, null))
})

// ============================================
// Test 5: Alignment
// ============================================
test('left alignment positions element at section.x', () => {
  const layout = resolveLayout({
    sections: {
      content: { height: '100%', top: 0, sideInset: 20 }
    },
    elements: {
      box: {
        section: 'content',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        align: 'left'
      }
    }
  }, mockMetrics)

  // Element should be at section origin + 0
  assert.equal(layout.elements.box.x, 20)
})

test('center alignment centers element horizontally within section', () => {
  const layout = resolveLayout({
    sections: {
      content: { height: '100%', top: 0, sideInset: 0 }
    },
    elements: {
      box: {
        section: 'content',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        align: 'center'
      }
    }
  }, mockMetrics)

  // Center: (section.w - element.w) / 2 = (400 - 100) / 2 = 150
  assert.equal(layout.elements.box.x, 150)
})

test('right alignment positions element at right edge of section', () => {
  const layout = resolveLayout({
    sections: {
      content: { height: '100%', top: 0, sideInset: 0 }
    },
    elements: {
      box: {
        section: 'content',
        x: 0,
        y: 0,
        width: 100,
        height: 50,
        align: 'right'
      }
    }
  }, mockMetrics)

  // Right: section.w - element.w = 400 - 100 = 300
  assert.equal(layout.elements.box.x, 300)
})

// ============================================
// Test 6: Round screen safe insets
// ============================================
test('round screen sections apply safe inset by default', () => {
  const layout = resolveLayout({
    sections: {
      center: { height: '20%', top: '40%' } // Center of screen
    }
  }, mockRoundMetrics)

  // Round screen should have positive side inset
  assert.ok(layout.sections.center.x > 0)
  assert.ok(layout.sections.center.w < mockRoundMetrics.width)
})

test('roundSafeInset: false disables safe inset calculation', () => {
  const layout = resolveLayout({
    sections: {
      full: { height: '100%', top: 0, roundSafeInset: false }
    }
  }, mockRoundMetrics)

  // Should use full width
  assert.equal(layout.sections.full.x, 0)
  assert.equal(layout.sections.full.w, mockRoundMetrics.width)
})

// ============================================
// Test 7: Complex layout scenario
// ============================================
test('complex layout with mixed units resolves correctly', () => {
  const layout = resolveLayout({
    sections: {
      header: { height: '12%', top: 0 },
      nav: { height: 48, after: 'header' }, // Fixed pixel height
      content: { height: 'fill', after: 'nav', gap: '2%' },
      footer: { height: '10%', bottom: 0 }
    },
    elements: {
      title: {
        section: 'header',
        x: 'center',
        y: '25%',
        width: '80%',
        height: '50%',
        align: 'center'
      },
      button: {
        section: 'footer',
        x: '10%',
        y: '20%',
        width: '80%',
        height: '60%',
        align: 'left'
      }
    }
  }, mockMetrics)

  // Verify all coordinates are valid numbers
  assert.ok(Number.isFinite(layout.sections.header.y))
  assert.ok(Number.isFinite(layout.sections.nav.y))
  assert.ok(Number.isFinite(layout.sections.content.y))
  assert.ok(Number.isFinite(layout.sections.footer.y))

  // Verify title is centered
  const titleExpectedX = layout.sections.header.x + (layout.sections.header.w - layout.elements.title.w) / 2
  assert.equal(layout.elements.title.x, titleExpectedX)
})
```

## Validation

### Pre-Implementation Checks
- [ ] Verify `utils/screen-utils.js` exists and exports required functions
- [ ] Confirm `tests/` directory exists
- [ ] No conflicts with existing files

### During Implementation Checks
- [ ] All functions use 2-space indentation
- [ ] Export uses named exports: `export function resolveLayout(...)`
- [ ] Import statement uses correct relative path: `./screen-utils.js`
- [ ] All percentage calculations use `Math.round()`
- [ ] All values use `clamp()` and `ensureNumber()` for safety
- [ ] No console.log in production code (console.error for error logging is acceptable)

### Post-Implementation Verification
- [ ] File compiles without syntax errors
- [ ] Run `npm run complete-check` - all QA checks pass
- [ ] All tests pass: `node --test tests/layout-engine.test.js`
- [ ] Biome linting passes

### Acceptance Criteria Validation

| # | Criteria | Verification Method |
|---|----------|---------------------|
| 1 | File compiles without syntax errors | `node --check utils/layout-engine.js` |
| 2 | Basic resolution produces plausible numeric x,y,w,h | Unit test: 'resolveLayout returns plausible numeric coordinates' |
| 3 | Section references resolve correctly | Unit test: 'section references like "header.bottom" resolve to correct coordinates' |
| 4 | 'fill' height calculates remaining space | Unit test: '"fill" height correctly calculates remaining space' |
| 5 | Error handling: invalid refs → 0, invalid % → clamped, missing section → full screen | Unit tests in 'Error handling' section |
| 6 | Expression parsing computes correctly | Unit test: 'expression parsing with offset computes correctly' |
| 7 | Alignment validates center/left/right | Unit tests in 'Alignment' section |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Complex expression parsing edge cases | Regex patterns are strict; unsupported formats fall back to 0 |
| Circular section references | Sections resolve in order; forward references return 0 |
| Round screen inset calculation errors | Inset uses proven `getRoundSafeSectionInset` from task #41 |
| Performance with many elements | Two-pass O(n) algorithm; no recursion |
| Integer overflow on small screens | All values clamped to valid ranges |

## Rollback Plan
Since this is a new file with no consumers:
1. Delete `utils/layout-engine.js` and `tests/layout-engine.test.js`
2. No page modifications required to revert
3. No impact on existing functionality

## Subtask Summary

| Subtask | Description | Dependencies | Est. Complexity |
|---------|-------------|--------------|-----------------|
| 42.1 | Create file structure and main function skeleton | None | Low |
| 42.2 | Implement value parsing helper functions | 42.1 | Medium |
| 42.3 | Implement section resolution pass | 42.2 | High |
| 42.4 | Implement element resolution pass | 42.3 | Medium |
| 42.5 | Add roundSafeInset handling and error fallbacks | 42.4 | Medium |

## Implementation Order

```
42.1 ──► 42.2 ──► 42.3 ──► 42.4 ──► 42.5
 │                              │
 └──────── Tests ───────────────┘
```

Tests should be written incrementally as each subtask is completed.
