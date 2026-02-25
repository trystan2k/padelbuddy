/**
 * @fileoverview Tests for the layout presets utility.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import { TOKENS } from '../utils/design-tokens.js'
import { resolveLayout } from '../utils/layout-engine.js'
import {
  createGamePageLayout,
  createPageWithFooterButton,
  createStandardPageLayout,
  createTwoColumnLayout,
  mergeLayouts
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
// Test 1: createStandardPageLayout
// ============================================
test('createStandardPageLayout returns valid schema structure', () => {
  const schema = createStandardPageLayout()

  assert.ok(schema.sections)
  assert.ok(schema.elements)
  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
})

test('createStandardPageLayout includes all three sections by default', () => {
  const schema = createStandardPageLayout()

  assert.equal(typeof schema.sections.header, 'object')
  assert.equal(typeof schema.sections.body, 'object')
  assert.equal(typeof schema.sections.footer, 'object')
})

test('createStandardPageLayout with hasHeader: false excludes header', () => {
  const schema = createStandardPageLayout({ hasHeader: false })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
})

test('createStandardPageLayout with hasFooter: false excludes footer', () => {
  const schema = createStandardPageLayout({ hasFooter: false })

  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.equal(schema.sections.footer, undefined)
})

test('createStandardPageLayout with hasHeader: false and hasFooter: false only has body', () => {
  const schema = createStandardPageLayout({
    hasHeader: false,
    hasFooter: false
  })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.body)
  assert.equal(schema.sections.footer, undefined)
})

test('createStandardPageLayout sets roundSafeInset: true for body', () => {
  const schema = createStandardPageLayout()

  assert.equal(schema.sections.body.roundSafeInset, true)
})

test('createStandardPageLayout sets roundSafeInset: true for header', () => {
  const schema = createStandardPageLayout()

  assert.equal(schema.sections.header.roundSafeInset, true)
})

test('createStandardPageLayout sets roundSafeInset: false for footer', () => {
  const schema = createStandardPageLayout()

  assert.equal(schema.sections.footer.roundSafeInset, false)
})

test('createStandardPageLayout uses TOKENS.spacing values', () => {
  const schema = createStandardPageLayout()

  // Body should reference header via 'after' property with gap
  assert.equal(schema.sections.body.after, 'header')
  assert.ok(schema.sections.body.gap)
})

test('createStandardPageLayout schema resolves correctly with layout-engine', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockMetrics)

  // All sections should resolve to valid coordinates
  assert.ok(layout.sections.header)
  assert.ok(layout.sections.body)
  assert.ok(layout.sections.footer)

  assert.equal(typeof layout.sections.header.x, 'number')
  assert.equal(typeof layout.sections.header.y, 'number')
  assert.equal(typeof layout.sections.header.w, 'number')
  assert.equal(typeof layout.sections.header.h, 'number')
})

test('createStandardPageLayout without header resolves correctly', () => {
  const schema = createStandardPageLayout({ hasHeader: false })
  const layout = resolveLayout(schema, mockMetrics)

  assert.equal(layout.sections.header, undefined)
  assert.ok(layout.sections.body)
  assert.ok(layout.sections.footer)
})

test('createStandardPageLayout custom headerHeight is applied', () => {
  const schema = createStandardPageLayout({ headerHeight: '20%' })

  assert.equal(schema.sections.header.height, '20%')
})

test('createStandardPageLayout custom footerHeight is applied', () => {
  const schema = createStandardPageLayout({ footerHeight: '15%' })

  assert.equal(schema.sections.footer.height, '15%')
})

// ============================================
// Test 2: createPageWithFooterButton
// ============================================
test('createPageWithFooterButton returns schema with footer button', () => {
  const schema = createPageWithFooterButton()

  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
  assert.ok(schema.elements.footerButton)
})

test('createPageWithFooterButton button is in footer section', () => {
  const schema = createPageWithFooterButton()

  assert.equal(schema.elements.footerButton.section, 'footer')
})

test('createPageWithFooterButton button is centered', () => {
  const schema = createPageWithFooterButton()

  assert.equal(schema.elements.footerButton.x, 'center')
  assert.equal(schema.elements.footerButton.y, 'center')
  assert.equal(schema.elements.footerButton.align, 'center')
})

test('createPageWithFooterButton uses default icon', () => {
  const schema = createPageWithFooterButton()

  assert.equal(schema.elements.footerButton._icon, 'home-icon.png')
})

test('createPageWithFooterButton accepts custom icon', () => {
  const schema = createPageWithFooterButton({ icon: 'custom-icon.png' })

  assert.equal(schema.elements.footerButton._icon, 'custom-icon.png')
})

test('createPageWithFooterButton stores onClick callback', () => {
  const onClick = () => {}
  const schema = createPageWithFooterButton({ onClick })

  assert.equal(schema.elements.footerButton._onClick, onClick)
})

test('createPageWithFooterButton always has footer even if hasHeader is false', () => {
  const schema = createPageWithFooterButton({ hasHeader: false })

  assert.equal(schema.sections.header, undefined)
  assert.ok(schema.sections.footer)
})

test('createPageWithFooterButton schema resolves correctly', () => {
  const schema = createPageWithFooterButton()
  const layout = resolveLayout(schema, mockMetrics)

  assert.ok(layout.sections.footer)
  assert.ok(layout.elements.footerButton)
  assert.equal(typeof layout.elements.footerButton.x, 'number')
  assert.equal(typeof layout.elements.footerButton.y, 'number')
})

// ============================================
// Test 3: createTwoColumnLayout
// ============================================
test('createTwoColumnLayout returns elements with left and right columns', () => {
  const schema = createTwoColumnLayout('body')

  assert.ok(schema.elements)
  assert.ok(schema.elements.leftColumn)
  assert.ok(schema.elements.rightColumn)
})

test('createTwoColumnLayout columns have correct parent section', () => {
  const schema = createTwoColumnLayout('content')

  assert.equal(schema.elements.leftColumn.section, 'content')
  assert.equal(schema.elements.rightColumn.section, 'content')
})

test('createTwoColumnLayout columns are 50% width', () => {
  const schema = createTwoColumnLayout('body')

  assert.equal(schema.elements.leftColumn.width, '50%')
  assert.equal(schema.elements.rightColumn.width, '50%')
})

test('createTwoColumnLayout columns are 100% height', () => {
  const schema = createTwoColumnLayout('body')

  assert.equal(schema.elements.leftColumn.height, '100%')
  assert.equal(schema.elements.rightColumn.height, '100%')
})

test('createTwoColumnLayout left column starts at x: 0', () => {
  const schema = createTwoColumnLayout('body')

  assert.equal(schema.elements.leftColumn.x, 0)
})

test('createTwoColumnLayout right column starts at x: 50%', () => {
  const schema = createTwoColumnLayout('body')

  assert.equal(schema.elements.rightColumn.x, '50%')
})

test('createTwoColumnLayout with empty parent section returns empty elements', () => {
  const schema = createTwoColumnLayout('')

  assert.deepEqual(schema.elements, {})
})

test('createTwoColumnLayout with null parent section returns empty elements', () => {
  const schema = createTwoColumnLayout(null)

  assert.deepEqual(schema.elements, {})
})

test('createTwoColumnLayout with undefined parent section returns empty elements', () => {
  const schema = createTwoColumnLayout(undefined)

  assert.deepEqual(schema.elements, {})
})

test('createTwoColumnLayout resolves correctly with parent section', () => {
  const pageLayout = createStandardPageLayout()
  const columnLayout = createTwoColumnLayout('body')
  pageLayout.elements = { ...pageLayout.elements, ...columnLayout.elements }

  const layout = resolveLayout(pageLayout, mockMetrics)

  assert.ok(layout.elements.leftColumn)
  assert.ok(layout.elements.rightColumn)

  // Left column should be in left half
  assert.ok(layout.elements.leftColumn.x < mockMetrics.width / 2)

  // Right column should be in right half
  assert.ok(layout.elements.rightColumn.x >= mockMetrics.width / 2)
})

// ============================================
// Test 4: createGamePageLayout
// ============================================
test('createGamePageLayout returns complete schema', () => {
  const schema = createGamePageLayout()

  assert.ok(schema.sections.header)
  assert.ok(schema.sections.body)
  assert.ok(schema.sections.footer)
  assert.ok(schema.elements.footerButton)
  assert.ok(schema.elements.leftColumn)
  assert.ok(schema.elements.rightColumn)
})

test('createGamePageLayout uses default footer icon', () => {
  const schema = createGamePageLayout()

  assert.equal(schema.elements.footerButton._icon, 'home-icon.png')
})

test('createGamePageLayout accepts custom footer icon', () => {
  const schema = createGamePageLayout({ footerIcon: 'back-icon.png' })

  assert.equal(schema.elements.footerButton._icon, 'back-icon.png')
})

test('createGamePageLayout stores onFooterClick callback', () => {
  const onFooterClick = () => {}
  const schema = createGamePageLayout({ onFooterClick })

  assert.equal(schema.elements.footerButton._onClick, onFooterClick)
})

test('createGamePageLayout columns are in body section', () => {
  const schema = createGamePageLayout()

  assert.equal(schema.elements.leftColumn.section, 'body')
  assert.equal(schema.elements.rightColumn.section, 'body')
})

test('createGamePageLayout schema resolves correctly', () => {
  const schema = createGamePageLayout()
  const layout = resolveLayout(schema, mockMetrics)

  assert.ok(layout.sections.header)
  assert.ok(layout.sections.body)
  assert.ok(layout.sections.footer)
  assert.ok(layout.elements.leftColumn)
  assert.ok(layout.elements.rightColumn)
  assert.ok(layout.elements.footerButton)
})

// ============================================
// Test 5: mergeLayouts
// ============================================
test('mergeLayouts combines sections from multiple schemas', () => {
  const schema1 = { sections: { header: { height: '10%' } }, elements: {} }
  const schema2 = { sections: { footer: { height: '10%' } }, elements: {} }

  const merged = mergeLayouts(schema1, schema2)

  assert.ok(merged.sections.header)
  assert.ok(merged.sections.footer)
})

test('mergeLayouts combines elements from multiple schemas', () => {
  const schema1 = { sections: {}, elements: { title: { x: 0 } } }
  const schema2 = { sections: {}, elements: { button: { x: 100 } } }

  const merged = mergeLayouts(schema1, schema2)

  assert.ok(merged.elements.title)
  assert.ok(merged.elements.button)
})

test('mergeLayouts later schemas override earlier ones', () => {
  const schema1 = { sections: { header: { height: '10%' } }, elements: {} }
  const schema2 = { sections: { header: { height: '20%' } }, elements: {} }

  const merged = mergeLayouts(schema1, schema2)

  assert.equal(merged.sections.header.height, '20%')
})

test('mergeLayouts handles null schemas', () => {
  const schema = { sections: { header: {} }, elements: {} }

  const merged = mergeLayouts(null, schema, undefined)

  assert.ok(merged.sections.header)
})

test('mergeLayouts handles empty input', () => {
  const merged = mergeLayouts()

  assert.deepEqual(merged.sections, {})
  assert.deepEqual(merged.elements, {})
})

test('mergeLayouts with invalid schema types', () => {
  const merged = mergeLayouts('invalid', 123, {
    sections: { header: {} },
    elements: {}
  })

  assert.ok(merged.sections.header)
})

test('mergeLayouts preserves sections without elements', () => {
  const schema = { sections: { header: { height: '10%' } } }

  const merged = mergeLayouts(schema)

  assert.ok(merged.sections.header)
  assert.deepEqual(merged.elements, {})
})

// ============================================
// Test 6: Token Integration
// ============================================
test('createStandardPageLayout uses TOKENS.typography values', () => {
  const schema = createStandardPageLayout()

  // Default header height should be based on pageTitle token
  assert.ok(schema.sections.header.height)
  assert.ok(schema.sections.footer.height)
})

test('createStandardPageLayout uses TOKENS.spacing.pageTop', () => {
  const schema = createStandardPageLayout()

  // Header top should use pageTop token
  const expectedTop = `${TOKENS.spacing.pageTop * 100}%`
  assert.equal(schema.sections.header.top, expectedTop)
})

test('createStandardPageLayout uses TOKENS.spacing.footerBottom', () => {
  const schema = createStandardPageLayout()

  // Footer bottom should use footerBottom token
  const expectedBottom = `${TOKENS.spacing.footerBottom * 100}%`
  assert.equal(schema.sections.footer.bottom, expectedBottom)
})

test('createStandardPageLayout uses TOKENS.spacing.headerToContent for body gap', () => {
  const schema = createStandardPageLayout()

  const expectedGap = `${TOKENS.spacing.headerToContent * 100}%`
  assert.equal(schema.sections.body.gap, expectedGap)
})

// ============================================
// Test 7: Round Screen Handling
// ============================================
test('createStandardPageLayout body has roundSafeInset on round screens', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockRoundMetrics)

  // Body section should have side inset on round screen
  assert.ok(layout.sections.body.x > 0)
  assert.ok(layout.sections.body.w < mockRoundMetrics.width)
})

test('createStandardPageLayout header has roundSafeInset on round screens', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockRoundMetrics)

  // Header section should have side inset on round screen
  assert.ok(layout.sections.header.x > 0)
  assert.ok(layout.sections.header.w < mockRoundMetrics.width)
})

test('createStandardPageLayout footer does not have roundSafeInset', () => {
  const schema = createStandardPageLayout()
  const layout = resolveLayout(schema, mockRoundMetrics)

  // Footer should use full width (roundSafeInset: false)
  assert.equal(layout.sections.footer.x, 0)
  assert.equal(layout.sections.footer.w, mockRoundMetrics.width)
})

// ============================================
// Test 8: Complex Scenarios
// ============================================
test('merged layout with preset and custom sections resolves correctly', () => {
  const baseLayout = createStandardPageLayout()
  const customLayout = {
    sections: {
      customSection: { height: '10%', after: 'body' }
    },
    elements: {
      customElement: {
        section: 'customSection',
        x: '10%',
        y: '10%',
        width: '80%',
        height: '80%'
      }
    }
  }

  const merged = mergeLayouts(baseLayout, customLayout)
  const layout = resolveLayout(merged, mockMetrics)

  assert.ok(layout.sections.header)
  assert.ok(layout.sections.body)
  assert.ok(layout.sections.footer)
  assert.ok(layout.sections.customSection)
  assert.ok(layout.elements.customElement)
})

test('page with footer button resolves button position correctly', () => {
  const schema = createPageWithFooterButton()
  const layout = resolveLayout(schema, mockMetrics)

  // Button should be centered in footer
  const footerCenterX = layout.sections.footer.x + layout.sections.footer.w / 2
  const buttonCenterX =
    layout.elements.footerButton.x + layout.elements.footerButton.w / 2

  // Allow some tolerance for rounding
  assert.ok(Math.abs(footerCenterX - buttonCenterX) < 2)
})

test('two-column layout in body creates proper split', () => {
  const pageLayout = createStandardPageLayout()
  const columnLayout = createTwoColumnLayout('body')
  pageLayout.elements = { ...pageLayout.elements, ...columnLayout.elements }

  const layout = resolveLayout(pageLayout, mockMetrics)

  // Left and right columns should not overlap
  const leftRight = layout.elements.leftColumn.x + layout.elements.leftColumn.w
  assert.ok(leftRight <= layout.elements.rightColumn.x + 1) // +1 for rounding tolerance

  // Combined width should equal body width
  const combinedWidth =
    layout.elements.leftColumn.w + layout.elements.rightColumn.w
  assert.equal(combinedWidth, layout.sections.body.w)
})
