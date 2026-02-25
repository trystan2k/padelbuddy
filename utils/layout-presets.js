/**
 * @fileoverview Layout preset factories for common page structure schemas.
 *
 * Provides factory functions that generate layout schemas compatible with
 * the layout-engine.js resolveLayout function. All presets follow a consistent
 * 3-section structure (header, body, footer) with proper spacing and
 * round-safe inset handling for round screens.
 *
 * @module utils/layout-presets
 */

import { TOKENS } from './design-tokens.js'

/**
 * Converts a ratio value (0-1) to a percentage string.
 * @param {number} ratio - The ratio value (e.g., 0.05)
 * @returns {string} The percentage string (e.g., '5%')
 */
function ratioToPercent(ratio) {
  return `${ratio * 100}%`
}

/**
 * Creates a standard page layout schema with header, body, and footer sections.
 *
 * @param {Object} [options={}] - Configuration options
 * @param {boolean} [options.hasHeader=true] - Whether to include a header section
 * @param {boolean} [options.hasFooter=true] - Whether to include a footer section
 * @param {number|string} [options.headerHeight] - Header height (ratio or percentage string)
 *   Defaults to TOKENS.typography.pageTitle * 2 as percentage
 * @param {number|string} [options.footerHeight] - Footer height (ratio or percentage string)
 *   Defaults to TOKENS.typography.button * 2 as percentage
 * @returns {Object} Layout schema with sections property
 *
 * @example
 * // Default layout with header and footer
 * const schema = createStandardPageLayout()
 *
 * @example
 * // Layout without header
 * const schema = createStandardPageLayout({ hasHeader: false })
 *
 * @example
 * // Custom header height
 * const schema = createStandardPageLayout({ headerHeight: '20%' })
 */
export function createStandardPageLayout(options = {}) {
  const {
    hasHeader = true,
    hasFooter = true,
    headerHeight = ratioToPercent(TOKENS.typography.pageTitle * 2),
    footerHeight = ratioToPercent(TOKENS.typography.button * 2)
  } = options

  const sections = {}

  // Header section - positioned from top with pageTop spacing
  if (hasHeader) {
    sections.header = {
      top: ratioToPercent(TOKENS.spacing.pageTop),
      height: headerHeight,
      roundSafeInset: true
    }
  }

  // Body section - fills remaining space between header and footer
  sections.body = {
    height: 'fill',
    roundSafeInset: true
  }

  // Set body positioning based on header presence
  if (hasHeader) {
    sections.body.after = 'header'
    sections.body.gap = ratioToPercent(TOKENS.spacing.headerToContent)
  } else {
    sections.body.top = ratioToPercent(TOKENS.spacing.pageTop)
  }

  // Footer section - anchored to bottom
  if (hasFooter) {
    sections.footer = {
      bottom: ratioToPercent(TOKENS.spacing.footerBottom),
      height: footerHeight,
      roundSafeInset: false // Icon centering handles positioning
    }
  }

  return { sections }
}

/**
 * Creates a page layout schema with a centered footer button.
 *
 * Extends createStandardPageLayout with an icon button element in the footer.
 * The button is centered horizontally within the footer section.
 *
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.icon='home-icon.png'] - Icon asset path for the button
 * @param {Function} [options.onClick] - Click callback function (not included in schema)
 * @param {boolean} [options.hasHeader=true] - Whether to include a header section
 * @param {number|string} [options.headerHeight] - Header height
 * @param {number|string} [options.footerHeight] - Footer height
 * @returns {Object} Layout schema with sections and elements properties
 *
 * @example
 * // Layout with home button in footer
 * const schema = createPageWithFooterButton({
 *   icon: 'home-icon.png',
 *   onClick: () => router.back()
 * })
 */
export function createPageWithFooterButton(options = {}) {
  const { icon = 'home-icon.png', onClick, ...layoutOptions } = options

  // Get the standard layout
  const layout = createStandardPageLayout(layoutOptions)

  // Add footer button element if footer exists
  if (layout.sections.footer) {
    layout.elements = {
      footerButton: {
        section: 'footer',
        x: 'center',
        y: 'center',
        width: TOKENS.sizing.iconMedium,
        height: TOKENS.sizing.iconMedium,
        align: 'center'
      }
    }

    // Store icon reference for use by the page (not part of layout resolution)
    layout.footerButtonIcon = icon

    // Store click handler reference (not part of layout resolution)
    if (onClick) {
      layout.footerButtonOnClick = onClick
    }
  }

  return layout
}

/**
 * Creates a two-column layout schema for nested sections.
 *
 * Returns a schema with leftColumn and rightColumn sections, each at 50% width.
 * Designed to be nested within a parent section (typically the body).
 *
 * @param {string} parentSection - The parent section name to nest columns under
 * @returns {Object} Layout schema with nested column sections
 *
 * @example
 * // Create two columns within the body section
 * const layout = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 *
 * // Merge into main layout
 * layout.sections = { ...layout.sections, ...columns.sections }
 *
 * @example
 * // Access resolved column positions
 * const resolved = resolveLayout(layout)
 * const leftCol = resolved.sections.leftColumn
 * const rightCol = resolved.sections.rightColumn
 */
export function createTwoColumnLayout(parentSection) {
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
    }
  }
}

/**
 * Helper to merge multiple layout schemas into one.
 *
 * @param {...Object} schemas - Layout schemas to merge
 * @returns {Object} Combined layout schema
 *
 * @example
 * const standard = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 * const combined = mergeLayouts(standard, columns)
 */
export function mergeLayouts(...schemas) {
  const result = { sections: {}, elements: {} }

  schemas.forEach((schema) => {
    if (schema.sections) {
      result.sections = { ...result.sections, ...schema.sections }
    }
    if (schema.elements) {
      result.elements = { ...result.elements, ...schema.elements }
    }
    // Copy other properties (like footerButtonIcon, footerButtonOnClick)
    Object.keys(schema).forEach((key) => {
      if (key !== 'sections' && key !== 'elements') {
        result[key] = schema[key]
      }
    })
  })

  return result
}
