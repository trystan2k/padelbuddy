/**
 * @fileoverview Layout preset factory functions for common page patterns.
 *
 * Provides reusable layout schemas that follow a strict 3-section structure
 * (header, body, footer) with consistent spacing and round-safe inset handling.
 * All schemas are compatible with layout-engine.resolveLayout().
 *
 * @module utils/layout-presets
 */

import { TOKENS } from './design-tokens.js'

/**
 * Default options for createStandardPageLayout.
 * @constant {Object}
 */
const DEFAULT_PAGE_LAYOUT_OPTIONS = {
  hasHeader: true,
  hasFooter: true,
  headerHeight: undefined,
  footerHeight: undefined
}

/**
 * Creates a standard page layout schema with header, body, and footer sections.
 *
 * The layout follows a 3-section vertical structure:
 * - Header: Positioned at pageTop with configurable height
 * - Body: Fills remaining space between header and footer
 * - Footer: Anchored at footerBottom with configurable height
 *
 * @param {Object} [options={}] - Layout configuration options
 * @param {boolean} [options.hasHeader=true] - Include header section
 * @param {boolean} [options.hasFooter=true] - Include footer section
 * @param {number} [options.headerHeight] - Override header height in pixels
 * @param {number} [options.footerHeight] - Override footer height in pixels
 * @returns {Object} Layout schema compatible with resolveLayout()
 *
 * @example
 * // Full layout with header and footer
 * const schema = createStandardPageLayout()
 *
 * @example
 * // Layout without header (body starts from top)
 * const schema = createStandardPageLayout({ hasHeader: false })
 *
 * @example
 * // Layout without footer (body extends to bottom)
 * const schema = createStandardPageLayout({ hasFooter: false })
 *
 * @example
 * // Custom header height
 * const schema = createStandardPageLayout({ headerHeight: 80 })
 */
export function createStandardPageLayout(options = {}) {
  const opts = { ...DEFAULT_PAGE_LAYOUT_OPTIONS, ...options }
  const sections = {}

  // Calculate heights using typography tokens as ratios
  // These will be resolved by layout-engine based on screen width
  const headerHeight =
    opts.headerHeight !== undefined
      ? opts.headerHeight
      : `${TOKENS.typography.pageTitle * 2 * 100}%`

  const footerHeight =
    opts.footerHeight !== undefined
      ? opts.footerHeight
      : `${TOKENS.typography.button * 2 * 100}%`

  // Header section - positioned at pageTop
  if (opts.hasHeader) {
    sections.header = {
      top: `${TOKENS.spacing.pageTop * 100}%`,
      height: headerHeight,
      roundSafeInset: true
    }
  }

  // Body section - fills remaining space
  const bodyConfig = {
    height: 'fill',
    roundSafeInset: true
  }

  if (opts.hasHeader) {
    bodyConfig.after = 'header'
    bodyConfig.gap = `${TOKENS.spacing.headerToContent * 100}%`
  } else {
    // No header - body starts from page top
    bodyConfig.top = `${TOKENS.spacing.pageTop * 100}%`
  }

  sections.body = bodyConfig

  // Footer section - anchored at bottom
  if (opts.hasFooter) {
    sections.footer = {
      bottom: `${TOKENS.spacing.footerBottom * 100}%`,
      height: footerHeight,
      roundSafeInset: false // Icon centering handles positioning
    }
  }

  return { sections, elements: {} }
}

/**
 * Default options for createPageWithFooterButton.
 * @constant {Object}
 */
const DEFAULT_FOOTER_BUTTON_OPTIONS = {
  icon: 'home-icon.png',
  onClick: undefined,
  hasHeader: true,
  hasFooter: true,
  headerHeight: undefined,
  footerHeight: undefined
}

/**
 * Creates a page layout with a centered icon button in the footer.
 *
 * Extends createStandardPageLayout with a footer button element.
 * The button is centered horizontally within the footer area.
 *
 * @param {Object} [options={}] - Layout configuration options
 * @param {string} [options.icon='home-icon.png'] - Icon image path for the button
 * @param {Function} [options.onClick] - Click handler callback for the button
 * @param {boolean} [options.hasHeader=true] - Include header section
 * @param {boolean} [options.hasFooter=true] - Include footer section
 * @param {number} [options.headerHeight] - Override header height in pixels
 * @param {number} [options.footerHeight] - Override footer height in pixels
 * @returns {Object} Layout schema with footer button element
 *
 * @example
 * // Layout with home button in footer
 * const schema = createPageWithFooterButton({
 *   icon: 'home-icon.png',
 *   onClick: () => router.replace({ url: 'page/index' })
 * })
 *
 * @example
 * // Custom icon without header
 * const schema = createPageWithFooterButton({
 *   icon: 'back-arrow.png',
 *   onClick: goBack,
 *   hasHeader: false
 * })
 */
export function createPageWithFooterButton(options = {}) {
  const opts = { ...DEFAULT_FOOTER_BUTTON_OPTIONS, ...options }

  // Get base layout from standard page layout
  const schema = createStandardPageLayout({
    hasHeader: opts.hasHeader,
    hasFooter: opts.hasFooter,
    headerHeight: opts.headerHeight,
    footerHeight: opts.footerHeight
  })

  // Add footer button element if footer exists
  if (opts.hasFooter) {
    schema.elements.footerButton = {
      section: 'footer',
      x: 'center',
      y: 'center',
      width: TOKENS.sizing.iconMedium,
      height: TOKENS.sizing.iconMedium,
      align: 'center',
      icon: opts.icon,
      onClick: opts.onClick
    }
  }

  return schema
}

/**
 * Creates a two-column layout schema nested under a parent section.
 *
 * Generates leftColumn and rightColumn sections, each taking 50% width
 * and 100% height of the parent section. Used for game page score display.
 *
 * @param {string} parentSection - Name of the parent section to nest under (e.g., 'body')
 * @returns {Object} Layout schema with leftColumn and rightColumn sections
 *
 * @example
 * // Create two columns inside the body section
 * const schema = createTwoColumnLayout('body')
 * // Result: { sections: { leftColumn: {...}, rightColumn: {...} } }
 *
 * @example
 * // Combine with standard layout
 * const baseLayout = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 *
 * // Merge sections for full layout
 * const fullLayout = {
 *   sections: { ...baseLayout.sections, ...columns.sections },
 *   elements: { ...baseLayout.elements, ...columns.elements }
 * }
 */
export function createTwoColumnLayout(parentSection) {
  if (!parentSection || typeof parentSection !== 'string') {
    console.warn(
      'createTwoColumnLayout: Invalid parentSection, defaulting to "body"'
    )
    parentSection = 'body'
  }

  return {
    sections: {
      leftColumn: {
        section: parentSection,
        x: 0,
        y: 0,
        width: '50%',
        height: '100%',
        roundSafeInset: true
      },
      rightColumn: {
        section: parentSection,
        x: '50%',
        y: 0,
        width: '50%',
        height: '100%',
        roundSafeInset: true
      }
    },
    elements: {}
  }
}

/**
 * Merges multiple layout schemas into one.
 *
 * Useful for combining base layouts with column layouts or other extensions.
 * Later schemas override earlier ones for conflicting section/element names.
 *
 * @param {...Object} schemas - Layout schemas to merge
 * @returns {Object} Merged layout schema
 *
 * @example
 * const base = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 * const merged = mergeLayouts(base, columns)
 */
export function mergeLayouts(...schemas) {
  const merged = {
    sections: {},
    elements: {}
  }

  for (const schema of schemas) {
    if (schema && typeof schema === 'object') {
      if (schema.sections) {
        Object.assign(merged.sections, schema.sections)
      }
      if (schema.elements) {
        Object.assign(merged.elements, schema.elements)
      }
    }
  }

  return merged
}
