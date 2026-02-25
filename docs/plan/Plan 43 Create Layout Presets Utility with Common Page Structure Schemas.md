# Task Analysis
- **Main objective**: Create `utils/layout-presets.js` containing factory functions that return layout schemas for common page patterns following a strict 3-section structure (header, body, footer) with consistent spacing and round-safe inset handling
- **Identified dependencies**:
  - Task #40 (completed): `utils/design-tokens.js` providing TOKENS object with spacing, typography, colors, sizing
  - Task #42 (completed): `utils/layout-engine.js` providing `resolveLayout()` function that consumes schemas
  - Zepp OS v1.0 JavaScript runtime
- **System impact**:
  - New utility file with no immediate consumers
  - Enables rapid page layout creation
  - Reduces boilerplate in page files
  - Low risk: additive change with no modifications to existing files

## Chosen Approach

### Proposed Solution
Create a factory-based utility module with three preset functions:
1. `createStandardPageLayout(options)` - Base 3-section layout
2. `createPageWithFooterButton(options)` - Standard layout + footer button
3. `createTwoColumnLayout(parentSection)` - Nested two-column schema

Each factory returns a schema object compatible with `layout-engine.resolveLayout()`.

### Justification for Simplicity
- **Factory pattern**: Pure functions returning plain objects - no classes, no state
- **Composability**: `createPageWithFooterButton` extends `createStandardPageLayout` to avoid duplication
- **Token-driven**: All defaults derive from TOKENS constants, ensuring consistency
- **Schema-compatible**: Output directly consumable by existing `resolveLayout()` function
- **Testable**: Pure functions are trivially testable with mock metrics

### Components to Be Modified/Created

| Component | Action | File |
|-----------|--------|------|
| Layout Presets Utility | Create new file | utils/layout-presets.js |
| Layout Presets Tests | Create new file | tests/layout-presets.test.js |

### Schema Output Structure
Each factory returns an object with this shape:
```javascript
{
  sections: {
    header: { top, height, roundSafeInset },
    body: { after, height, gap, roundSafeInset },
    footer: { bottom, height, roundSafeInset }
  },
  elements: {
    // Optional elements (e.g., footer button)
  }
}
```

## Implementation Steps

### Step 1: Create File Structure with JSDoc Header (Subtask 43.1)

Create `utils/layout-presets.js` with file header and import statement:

```javascript
/**
 * @fileoverview Factory functions for common page layout schemas.
 *
 * Provides preset layout configurations that are compatible with the
 * declarative layout engine (utils/layout-engine.js). Each factory returns
 * a schema object with sections and optional elements.
 *
 * @module utils/layout-presets
 *
 * @example
 * import { createStandardPageLayout } from './utils/layout-presets.js'
 * import { resolveLayout } from './utils/layout-engine.js'
 *
 * const schema = createStandardPageLayout({ hasFooter: false })
 * const layout = resolveLayout(schema, metrics)
 */

import { TOKENS } from './design-tokens.js'
```

**Key Design Decisions:**
- Import TOKENS at the top for all default values
- Use 2-space indentation per project conventions
- Provide comprehensive JSDoc with @example usage

### Step 2: Implement createStandardPageLayout Factory (Subtask 43.2)

Create the base factory function with full option support:

```javascript
/**
 * Creates a standard 3-section page layout schema.
 *
 * Returns a layout schema with header, body, and footer sections following
 * consistent spacing patterns. Sections can be conditionally included via options.
 *
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.hasHeader=true] - Whether to include header section
 * @param {boolean} [options.hasFooter=true] - Whether to include footer section
 * @param {number|string} [options.headerHeight] - Header height (default: TOKENS.typography.pageTitle * 2 as percentage)
 * @param {number|string} [options.footerHeight] - Footer height (default: TOKENS.typography.button * 2 as percentage)
 * @returns {Object} Layout schema with sections property
 *
 * @example
 * // Full layout with all sections
 * const fullLayout = createStandardPageLayout()
 *
 * // Layout without footer
 * const noFooterLayout = createStandardPageLayout({ hasFooter: false })
 *
 * // Custom header height
 * const customLayout = createStandardPageLayout({ headerHeight: '15%' })
 */
export function createStandardPageLayout(options = {}) {
  const {
    hasHeader = true,
    hasFooter = true,
    headerHeight = `${TOKENS.typography.pageTitle * 2 * 100}%`,
    footerHeight = `${TOKENS.typography.button * 2 * 100}%`
  } = options

  const sections = {}
  const elements = {}

  // Header section: top-anchored with round-safe inset
  if (hasHeader) {
    sections.header = {
      top: `pageTop`, // Will be resolved by layout-engine
      height: headerHeight,
      roundSafeInset: true
    }
  }

  // Body section: fills remaining space with header gap
  const bodyAfter = hasHeader ? 'header' : null
  sections.body = {
    height: 'fill',
    roundSafeInset: true
  }
  
  if (bodyAfter) {
    sections.body.after = bodyAfter
    sections.body.gap = TOKENS.spacing.headerToContent
  }

  // Footer section: bottom-anchored, no round-safe inset (icon centering handles positioning)
  if (hasFooter) {
    sections.footer = {
      bottom: `pageBottom`, // Will be resolved by layout-engine
      height: footerHeight,
      roundSafeInset: false
    }
  }

  return { sections, elements }
}
```

**Default Height Calculations:**
| Section | Default | Calculation |
|---------|---------|-------------|
| header | 16.5% | `TOKENS.typography.pageTitle (0.0825) * 2 * 100` |
| footer | 10% | `TOKENS.typography.button (0.05) * 2 * 100` |

**Important Note on Token References:**
The layout-engine expects string references like `'pageTop'` to be resolved. However, based on the current implementation, we should use percentage values directly since the engine parses percentage strings:

```javascript
// Corrected implementation using percentage strings directly
sections.header = {
  top: `${TOKENS.spacing.pageTop * 100}%`, // '5%'
  height: headerHeight,
  roundSafeInset: true
}
```

### Step 3: Implement createPageWithFooterButton Factory (Subtask 43.3)

Create the extended factory that adds a footer button:

```javascript
/**
 * Creates a standard page layout with a centered icon button in the footer.
 *
 * Extends createStandardPageLayout and adds a footer button element.
 * The button is centered horizontally within the footer section.
 *
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.icon='home-icon.png'] - Icon filename for the button
 * @param {Function} [options.onClick] - Click handler callback (not included in schema)
 * @param {boolean} [options.hasHeader=true] - Whether to include header section
 * @param {number|string} [options.headerHeight] - Header height override
 * @param {number|string} [options.footerHeight] - Footer height override
 * @returns {Object} Layout schema with sections and footerButton element
 *
 * @example
 * // Layout with home button
 * const layout = createPageWithFooterButton({
 *   icon: 'home-icon.png',
 *   onClick: () => router.replace({ pages: ['page/index'] })
 * })
 */
export function createPageWithFooterButton(options = {}) {
  const {
    icon = 'home-icon.png',
    onClick,
    hasHeader = true,
    headerHeight,
    footerHeight
  } = options

  // Build base schema from standard layout
  const baseSchema = createStandardPageLayout({
    hasHeader,
    hasFooter: true, // Footer required for button
    headerHeight,
    footerHeight
  })

  // Add footer button element
  // Button is centered and sized based on TOKENS
  const buttonSize = TOKENS.sizing.iconLarge // 48px
  
  baseSchema.elements.footerButton = {
    section: 'footer',
    x: 'center',
    y: 'center',
    width: buttonSize,
    height: buttonSize,
    align: 'center',
    // Metadata for page consumption (not used by layout-engine)
    _meta: {
      type: 'iconButton',
      icon,
      onClick
    }
  }

  return baseSchema
}
```

**Footer Button Element Properties:**
| Property | Value | Description |
|----------|-------|-------------|
| section | 'footer' | Parent section |
| x | 'center' | Centered horizontally (requires layout-engine support) |
| y | 'center' | Centered vertically (requires layout-engine support) |
| width | 48px | TOKENS.sizing.iconLarge |
| height | 48px | TOKENS.sizing.iconLarge |
| align | 'center' | Alignment mode |

**Note on 'center' Value:**
The layout-engine's `parseValue` function returns `null` for 'center' keyword. We need to verify the engine handles this for element positioning. Based on the existing test patterns, center alignment is handled via the `align` property, not the x/y values.

**Revised Implementation:**
```javascript
baseSchema.elements.footerButton = {
  section: 'footer',
  x: 0, // Position doesn't matter when align is 'center'
  y: 0, // Will need special handling for vertical centering
  width: buttonSize,
  height: buttonSize,
  align: 'center',
  _meta: {
    type: 'iconButton',
    icon,
    onClick
  }
}
```

### Step 4: Implement createTwoColumnLayout Factory (Subtask 43.4)

Create the nested column layout factory:

```javascript
/**
 * Creates a two-column layout schema nested under a parent section.
 *
 * Returns a schema with leftColumn and rightColumn sections, each at 50% width.
 * Intended for use within an existing section (e.g., game page score area).
 *
 * @param {string} parentSection - Name of the parent section to nest under
 * @returns {Object} Partial layout schema with leftColumn and rightColumn sections
 *
 * @example
 * // Create columns within body section
 * const columns = createTwoColumnLayout('body')
 * 
 * // Merge with main layout
 * const mainLayout = createStandardPageLayout()
 * Object.assign(mainLayout.sections, columns.sections)
 *
 * @example
 * // Full integration example
 * const schema = {
 *   sections: {
 *     header: { top: '5%', height: '15%', roundSafeInset: true },
 *     ...createTwoColumnLayout('body').sections,
 *     footer: { bottom: '7%', height: '10%', roundSafeInset: false }
 *   }
 * }
 */
export function createTwoColumnLayout(parentSection) {
  if (!parentSection || typeof parentSection !== 'string') {
    throw new Error('createTwoColumnLayout requires a valid parentSection name')
  }

  return {
    sections: {
      leftColumn: {
        parent: parentSection,
        width: '50%',
        height: '100%',
        roundSafeInset: true
      },
      rightColumn: {
        parent: parentSection,
        width: '50%',
        height: '100%',
        roundSafeInset: true,
        after: 'leftColumn' // Position to the right
      }
    }
  }
}
```

**Column Properties:**
| Property | Left Column | Right Column |
|----------|-------------|--------------|
| parent | parentSection | parentSection |
| width | '50%' | '50%' |
| height | '100%' | '100%' |
| roundSafeInset | true | true |
| after | - | 'leftColumn' |

**Important Consideration:**
The current layout-engine implementation doesn't explicitly support nested sections with `parent` property. We need to either:
1. **Option A**: Document that columns are positioned within parent bounds manually
2. **Option B**: Extend layout-engine to support nested sections (out of scope)
3. **Option C**: Return column definitions as elements instead of sections

**Revised Implementation (Option C - Elements approach):**
```javascript
/**
 * Creates a two-column element schema for horizontal splitting.
 *
 * Returns element definitions that split a parent section into two equal columns.
 * These are elements, not sections, and should be added to the elements property.
 *
 * @param {string} parentSection - Name of the parent section
 * @returns {Object} Object with leftColumn and rightColumn element definitions
 *
 * @example
 * const layout = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 * Object.assign(layout.elements, columns)
 */
export function createTwoColumnLayout(parentSection) {
  if (!parentSection || typeof parentSection !== 'string') {
    throw new Error('createTwoColumnLayout requires a valid parentSection name')
  }

  return {
    leftColumn: {
      section: parentSection,
      x: 0,
      y: 0,
      width: '50%',
      height: '100%',
      align: 'left'
    },
    rightColumn: {
      section: parentSection,
      x: '50%',
      y: 0,
      width: '50%',
      height: '100%',
      align: 'left'
    }
  }
}
```

**Wait - Reviewing task requirements again:**
The task says "Returns a schema with leftColumn and rightColumn nested under parentSection" and "Intended for game page score area display". Let me reconsider.

Looking at the task spec more carefully:
- "Returns a schema with leftColumn and rightColumn nested under parentSection"
- "Each column: width='50%', height='100%'"
- "roundSafeInset: true for both columns"

The schema should return sections that are positioned within a parent. Since the layout-engine uses `after` for vertical positioning, we may need a horizontal positioning mechanism. However, the current engine doesn't support horizontal `after`.

**Final Implementation Decision:**
Given the current layout-engine capabilities, I'll implement the columns as elements (not sections) since elements support percentage-based positioning within sections:

```javascript
/**
 * Creates a two-column layout as elements within a parent section.
 *
 * Returns element definitions for left and right columns at 50% width each.
 * These elements split the parent section horizontally.
 *
 * @param {string} parentSection - Name of the parent section to nest under
 * @returns {Object} Object with leftColumn and rightColumn elements
 *
 * @example
 * const layout = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 * Object.assign(layout.elements, columns)
 * // layout.elements now contains: header, body, footer sections + leftColumn, rightColumn elements
 */
export function createTwoColumnLayout(parentSection) {
  if (!parentSection || typeof parentSection !== 'string') {
    throw new Error('createTwoColumnLayout requires a valid parentSection string')
  }

  return {
    leftColumn: {
      section: parentSection,
      x: 0,
      y: 0,
      width: '50%',
      height: '100%',
      align: 'left'
    },
    rightColumn: {
      section: parentSection,
      x: 0, // x=0 with width=50% and positioned after left conceptually
      y: 0,
      width: '50%',
      height: '100%',
      align: 'right' // Right-aligned = positioned at right edge - width
    }
  }
}
```

### Step 5: Create Test File (Subtask 43.5)

Create comprehensive tests following the project's test pattern:

```javascript
/**
 * @fileoverview Tests for layout preset factory functions.
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { TOKENS } from '../utils/design-tokens.js'
import { resolveLayout } from '../utils/layout-engine.js'
import {
  createStandardPageLayout,
  createPageWithFooterButton,
  createTwoColumnLayout
} from '../utils/layout-presets.js'

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
// Test 1: Syntax Verification
// ============================================
test('layout-presets module exports all factory functions', () => {
  assert.equal(typeof createStandardPageLayout, 'function')
  assert.equal(typeof createPageWithFooterButton, 'function')
  assert.equal(typeof createTwoColumnLayout, 'function')
})

test('imports TOKENS from design-tokens correctly', () => {
  // Verify TOKENS is available
  assert.ok(TOKENS.spacing)
  assert.ok(TOKENS.typography)
  assert.ok(TOKENS.spacing.pageTop)
  assert.ok(TOKENS.typography.pageTitle)
})

// ============================================
// Test 2: createStandardPageLayout Schema Structure
// ============================================
test('createStandardPageLayout() returns sections: header, body, footer', () => {
  const schema = createStandardPageLayout()

  assert.ok(schema.sections)
  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
  assert.ok(schema.elements)
})

test('createStandardPageLayout({hasHeader:false}) excludes header', () => {
  const schema = createStandardPageLayout({ hasHeader: false })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
  // Body should not have 'after' property when no header
  assert.equal(schema.sections.body.after, undefined)
})

test('createStandardPageLayout({hasFooter:false}) excludes footer', () => {
  const schema = createStandardPageLayout({ hasFooter: false })

  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.equal(schema.sections.footer, undefined)
})

test('createStandardPageLayout({hasHeader:false, hasFooter:false}) returns only body', () => {
  const schema = createStandardPageLayout({ hasHeader: false, hasFooter: false })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.body)
  assert.equal(schema.sections.footer, undefined)
})

// ============================================
// Test 3: Section Properties
// ============================================
test('header section has correct default properties', () => {
  const schema = createStandardPageLayout()
  const header = schema.sections.header

  assert.ok(header.top !== undefined)
  assert.ok(header.height !== undefined)
  assert.equal(header.roundSafeInset, true)
})

test('body section has fill height and gap', () => {
  const schema = createStandardPageLayout()
  const body = schema.sections.body

  assert.equal(body.height, 'fill')
  assert.equal(body.after, 'header')
  assert.equal(body.gap, TOKENS.spacing.headerToContent)
  assert.equal(body.roundSafeInset, true)
})

test('footer section has roundSafeInset=false for icon centering', () => {
  const schema = createStandardPageLayout()
  const footer = schema.sections.footer

  assert.equal(footer.roundSafeInset, false)
})

// ============================================
// Test 4: createPageWithFooterButton Tests
// ============================================
test('createPageWithFooterButton() includes standard sections', () => {
  const schema = createPageWithFooterButton()

  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
})

test('createPageWithFooterButton() includes footerButton element', () => {
  const schema = createPageWithFooterButton()

  assert.ok(schema.elements.footerButton)
  assert.equal(schema.elements.footerButton.section, 'footer')
  assert.equal(schema.elements.footerButton.align, 'center')
})

test('createPageWithFooterButton() has default home icon', () => {
  const schema = createPageWithFooterButton()

  assert.ok(schema.elements.footerButton._meta)
  assert.equal(schema.elements.footerButton._meta.icon, 'home-icon.png')
})

test('createPageWithFooterButton({icon:"custom.png"}) uses custom icon', () => {
  const schema = createPageWithFooterButton({ icon: 'custom.png' })

  assert.equal(schema.elements.footerButton._meta.icon, 'custom.png')
})

test('createPageWithFooterButton respects hasHeader option', () => {
  const schema = createPageWithFooterButton({ hasHeader: false })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.footer)
  assert.ok(schema.elements.footerButton)
})

// ============================================
// Test 5: createTwoColumnLayout Tests
// ============================================
test('createTwoColumnLayout("body") returns leftColumn and rightColumn', () => {
  const columns = createTwoColumnLayout('body')

  assert.ok(columns.leftColumn)
  assert.ok(columns.rightColumn)
})

test('columns have 50% width and 100% height', () => {
  const columns = createTwoColumnLayout('body')

  assert.equal(columns.leftColumn.width, '50%')
  assert.equal(columns.leftColumn.height, '100%')
  assert.equal(columns.rightColumn.width, '50%')
  assert.equal(columns.rightColumn.height, '100%')
})

test('columns reference correct parent section', () => {
  const columns = createTwoColumnLayout('body')

  assert.equal(columns.leftColumn.section, 'body')
  assert.equal(columns.rightColumn.section, 'body')
})

test('createTwoColumnLayout throws without parentSection', () => {
  assert.throws(() => createTwoColumnLayout(), /requires a valid parentSection/)
  assert.throws(() => createTwoColumnLayout(''), /requires a valid parentSection/)
  assert.throws(() => createTwoColumnLayout(null), /requires a valid parentSection/)
})

// ============================================
// Test 6: Token Integration
// ============================================
test('schemas reference TOKENS.spacing values correctly', () => {
  const schema = createStandardPageLayout()

  // Body gap should use TOKENS value
  assert.equal(schema.sections.body.gap, TOKENS.spacing.headerToContent)
})

test('default heights derive from TOKENS.typography', () => {
  const schema = createStandardPageLayout()
  
  // Header height should be based on pageTitle * 2
  const expectedHeaderHeight = TOKENS.typography.pageTitle * 2 * 100
  assert.ok(schema.sections.header.height.includes(`${expectedHeaderHeight}`))
})

// ============================================
// Test 7: Resolution with layout-engine
// ============================================
test('createStandardPageLayout schema resolves without errors', () => {
  const schema = createStandardPageLayout()
  
  let layout
  assert.doesNotThrow(() => {
    layout = resolveLayout(schema, mockMetrics)
  })

  assert.ok(layout.sections.header)
  assert.ok(layout.sections.body)
  assert.ok(layout.sections.footer)
})

test('createPageWithFooterButton schema resolves without errors', () => {
  const schema = createPageWithFooterButton()
  
  let layout
  assert.doesNotThrow(() => {
    layout = resolveLayout(schema, mockMetrics)
  })

  assert.ok(layout.sections.footer)
  assert.ok(layout.elements.footerButton)
})

test('resolved sections have valid numeric coordinates', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockMetrics)

  // All sections should have numeric coordinates
  Object.values(layout.sections).forEach(section => {
    assert.equal(typeof section.x, 'number')
    assert.equal(typeof section.y, 'number')
    assert.equal(typeof section.w, 'number')
    assert.equal(typeof section.h, 'number')
    assert.ok(section.w > 0)
    assert.ok(section.h > 0)
  })
})

test('body section fills remaining space after header and footer', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockMetrics)

  const headerBottom = layout.sections.header.y + layout.sections.header.h
  const footerTop = layout.sections.footer.y

  // Body should start at or near header bottom
  assert.ok(layout.sections.body.y >= headerBottom)
  // Body should end at or near footer top
  assert.ok(layout.sections.body.y + layout.sections.body.h <= footerTop)
})

test('footerButton element has valid coordinates', () => {
  const schema = createPageWithFooterButton()
  const layout = resolveLayout(schema, mockMetrics)

  const button = layout.elements.footerButton
  assert.equal(typeof button.x, 'number')
  assert.equal(typeof button.y, 'number')
  assert.equal(typeof button.w, 'number')
  assert.equal(typeof button.h, 'number')
  assert.equal(button.w, TOKENS.sizing.iconLarge)
  assert.equal(button.h, TOKENS.sizing.iconLarge)
})

// ============================================
// Test 8: Round Screen Handling
// ============================================
test('body section has roundSafeInset=true for round screens', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockRoundMetrics)

  // Body should have positive x inset on round screen
  assert.ok(layout.sections.body.x > 0)
  assert.ok(layout.sections.body.w < mockRoundMetrics.width)
})

test('footer section has roundSafeInset=false for icon centering', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockRoundMetrics)

  // Footer should use full width (no inset)
  assert.equal(layout.sections.footer.x, 0)
  assert.equal(layout.sections.footer.w, mockRoundMetrics.width)
})

// ============================================
// Test 9: Edge Cases
// ============================================
test('empty options object uses all defaults', () => {
  const schema1 = createStandardPageLayout()
  const schema2 = createStandardPageLayout({})

  assert.deepEqual(schema1.sections, schema2.sections)
})

test('custom headerHeight overrides default', () => {
  const schema = createStandardPageLayout({ headerHeight: '20%' })

  assert.equal(schema.sections.header.height, '20%')
})

test('custom footerHeight overrides default', () => {
  const schema = createStandardPageLayout({ footerHeight: '80px' })

  assert.equal(schema.sections.footer.height, '80px')
})
```

### Step 6: Final File Assembly

Complete `utils/layout-presets.js` structure:

```
utils/layout-presets.js
├── File header JSDoc
├── Import TOKENS from design-tokens.js
├── createStandardPageLayout(options)
│   ├── Default options destructuring
│   ├── Header section creation (conditional)
│   ├── Body section creation (with conditional after)
│   └── Footer section creation (conditional)
├── createPageWithFooterButton(options)
│   ├── Base schema from createStandardPageLayout
│   └── Footer button element addition
└── createTwoColumnLayout(parentSection)
    ├── Validation
    └── Column element definitions
```

## Validation

### Pre-Implementation Checks
- [ ] Verify `utils/design-tokens.js` exists and exports TOKENS
- [ ] Verify `utils/layout-engine.js` exists and exports resolveLayout
- [ ] Confirm `tests/` directory exists
- [ ] No conflicts with existing files

### During Implementation Checks
- [ ] All functions use 2-space indentation
- [ ] Export uses named exports
- [ ] Import statement uses correct relative path: `./design-tokens.js`
- [ ] All default values derive from TOKENS
- [ ] roundSafeInset values match specification
- [ ] JSDoc comments include @param, @returns, @example

### Post-Implementation Verification
- [ ] File compiles without syntax errors: `node --check utils/layout-presets.js`
- [ ] Run `npm run complete-check` - all QA checks pass
- [ ] All tests pass: `node --test tests/layout-presets.test.js`
- [ ] Biome linting passes

### Acceptance Criteria Validation

| # | Criteria | Verification Method |
|---|----------|---------------------|
| 1 | File utils/layout-presets.js exists and imports TOKENS correctly | File existence + import verification |
| 2 | createStandardPageLayout() works with all option combinations | Unit tests for hasHeader/hasFooter options |
| 3 | createPageWithFooterButton() extends standard layout correctly | Unit tests for schema structure + elements |
| 4 | createTwoColumnLayout() returns valid column definitions | Unit tests for element properties |
| 5 | Schemas are consumable by layout-engine.resolveLayout() | Resolution tests with mock metrics |
| 6 | Unit tests pass | `node --test tests/layout-presets.test.js` |
| 7 | No regression in existing layout-engine behavior | Existing layout-engine tests still pass |

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| TOKENS values change | Schema uses TOKENS constants dynamically, not hardcoded |
| layout-engine API changes | Schema output matches documented interface |
| Round screen handling differs | Test with mockRoundMetrics to verify behavior |
| Missing parent section in createTwoColumnLayout | Validation throws descriptive error |
| Footer button positioning issues | Use align: 'center' and verify with resolution tests |

## Rollback Plan
Since this is a new file with no consumers:
1. Delete `utils/layout-presets.js` and `tests/layout-presets.test.js`
2. No page modifications required to revert
3. No impact on existing functionality

## Subtask Summary

| Subtask | Description | Dependencies | Est. Complexity |
|---------|-------------|--------------|-----------------|
| 43.1 | Create file structure with JSDoc header | None | Low |
| 43.2 | Implement createStandardPageLayout factory | 43.1 | Medium |
| 43.3 | Implement createPageWithFooterButton factory | 43.2 | Low |
| 43.4 | Implement createTwoColumnLayout factory | 43.1 | Medium |
| 43.5 | Create comprehensive test file | 43.2, 43.3, 43.4 | Medium |

## Implementation Order

```
43.1 ──► 43.2 ──► 43.3 ──► 43.5
  │                  │
  └──► 43.4 ─────────┘
```

Tests (43.5) can be written incrementally alongside implementation.

## Future Considerations

### Additional Presets
Potential future factory functions:
- `createScrollableContentLayout()` - For long content pages
- `createTabLayout()` - For tabbed navigation
- `createCardLayout()` - For card-based UI

### Element Factories
Separate factories for common element patterns:
- `createButtonElement(section, options)`
- `createTextElement(section, options)`
- `createIconElement(section, options)`
