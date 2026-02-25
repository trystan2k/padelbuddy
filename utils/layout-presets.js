/**
 * @fileoverview Layout presets utility providing factory functions for common page structure schemas.
 *
 * This module provides reusable layout schemas that follow a strict 3-section structure
 * (header, body, footer) with consistent spacing and round-safe inset handling.
 * All schemas are compatible with the layout-engine.js resolveLayout function.
 *
 * @module utils/layout-presets
 */

import { TOKENS } from './design-tokens.js'

/**
 * Creates a standard page layout schema with header, body, and footer sections.
 *
 * The layout follows a 3-section vertical structure:
 * - Header: positioned at page top with configurable height
 * - Body: fills remaining space between header and footer
 * - Footer: anchored at page bottom with configurable height
 *
 * @param {Object} [options={}] - Layout configuration options
 * @param {boolean} [options.hasHeader=true] - Whether to include header section
 * @param {boolean} [options.hasFooter=true] - Whether to include footer section
 * @param {string|number} [options.headerHeight] - Header height (default: based on pageTitle typography)
 * @param {string|number} [options.footerHeight] - Footer height (default: based on button typography)
 * @returns {Object} Layout schema compatible with resolveLayout()
 *
 * @example
 * // Default layout with all sections
 * const schema = createStandardPageLayout()
 * // Returns: { sections: { header: {...}, body: {...}, footer: {...} } }
 *
 * @example
 * // Layout without header
 * const schema = createStandardPageLayout({ hasHeader: false })
 *
 * @example
 * // Custom header and footer heights
 * const schema = createStandardPageLayout({
 *   headerHeight: '15%',
 *   footerHeight: '80px'
 * })
 */
export function createStandardPageLayout(options = {}) {
  const {
    hasHeader = true,
    hasFooter = true,
    headerHeight = `${TOKENS.typography.pageTitle * 200}%`,
    footerHeight = `${TOKENS.typography.button * 200}%`
  } = options

  const sections = {}

  // Header section - at page top, round safe inset enabled
  if (hasHeader) {
    sections.header = {
      top: `${TOKENS.spacing.pageTop * 100}%`,
      height: headerHeight,
      roundSafeInset: true
    }
  }

  // Body section - fills remaining space, round safe inset enabled
  sections.body = {
    height: 'fill',
    roundSafeInset: true
  }

  // Set body positioning based on header presence
  if (hasHeader) {
    sections.body.after = 'header'
    sections.body.gap = `${TOKENS.spacing.headerToContent * 100}%`
  } else {
    sections.body.top = `${TOKENS.spacing.pageTop * 100}%`
  }

  // Footer section - anchored at bottom, round safe inset disabled
  // (icon centering handles positioning on round screens)
  if (hasFooter) {
    sections.footer = {
      bottom: `${TOKENS.spacing.footerBottom * 100}%`,
      height: footerHeight,
      roundSafeInset: false
    }
  }

  return { sections, elements: {} }
}

/**
 * Creates a standard page layout with a centered icon button in the footer.
 *
 * Extends createStandardPageLayout with an additional footer button element.
 * The button is centered within the footer area for consistent positioning.
 *
 * @param {Object} [options={}] - Layout configuration options
 * @param {string} [options.icon='home-icon.png'] - Icon filename for the button
 * @param {Function} [options.onClick] - Click callback function (not included in schema)
 * @param {boolean} [options.hasHeader=true] - Whether to include header section
 * @param {string|number} [options.headerHeight] - Header height
 * @param {string|number} [options.footerHeight] - Footer height
 * @returns {Object} Layout schema with footer button element
 *
 * @example
 * // Layout with home button in footer
 * const schema = createPageWithFooterButton({
 *   icon: 'home-icon.png',
 *   onClick: () => navigateHome()
 * })
 *
 * @example
 * // Layout with custom icon
 * const schema = createPageWithFooterButton({
 *   icon: 'settings-icon.png',
 *   hasHeader: false
 * })
 */
export function createPageWithFooterButton(options = {}) {
  const { icon = 'home-icon.png', onClick, ...layoutOptions } = options

  // Get base layout from createStandardPageLayout
  const baseLayout = createStandardPageLayout({
    hasHeader: layoutOptions.hasHeader ?? true,
    hasFooter: true, // Always include footer for button
    headerHeight: layoutOptions.headerHeight,
    footerHeight: layoutOptions.footerHeight
  })

  // Add footer button element
  // The button is centered in the footer area
  baseLayout.elements.footerButton = {
    section: 'footer',
    x: 'center',
    y: 'center',
    width: 48, // Standard icon size
    height: 48,
    align: 'center',
    // Custom properties for button rendering (not used by layout-engine)
    _icon: icon,
    _onClick: onClick
  }

  return baseLayout
}

/**
 * Creates a two-column layout schema nested under a parent section.
 *
 * Returns a schema with leftColumn and rightColumn sections, each taking
 * 50% width and 100% height of the parent section. Useful for game page
 * score area displays and other split-screen layouts.
 *
 * @param {string} parentSection - Name of the parent section to nest columns under
 * @returns {Object} Schema fragment with leftColumn and rightColumn elements
 *
 * @example
 * // Create two columns within the body section
 * const columns = createTwoColumnLayout('body')
 * // Returns: { elements: { leftColumn: {...}, rightColumn: {...} } }
 *
 * @example
 * // Use with standard page layout
 * const pageLayout = createStandardPageLayout()
 * const columnLayout = createTwoColumnLayout('body')
 * pageLayout.elements = { ...pageLayout.elements, ...columnLayout.elements }
 */
export function createTwoColumnLayout(parentSection) {
  if (typeof parentSection !== 'string' || parentSection.length === 0) {
    return { elements: {} }
  }

  return {
    elements: {
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
}

/**
 * Creates a complete game page layout schema with header, two-column score area, and footer button.
 *
 * Combines createStandardPageLayout, createTwoColumnLayout, and createPageWithFooterButton
 * into a single convenient factory for the game scoring screen.
 *
 * @param {Object} [options={}] - Layout configuration options
 * @param {string} [options.footerIcon='home-icon.png'] - Icon for footer button
 * @param {Function} [options.onFooterClick] - Click callback for footer button
 * @returns {Object} Complete game page layout schema
 *
 * @example
 * const gameLayout = createGamePageLayout({
 *   footerIcon: 'home-icon.png',
 *   onFooterClick: () => navigateHome()
 * })
 */
export function createGamePageLayout(options = {}) {
  const { footerIcon = 'home-icon.png', onFooterClick } = options

  // Start with standard layout
  const layout = createStandardPageLayout({
    hasHeader: true,
    hasFooter: true
  })

  // Add two-column layout to body
  const columnLayout = createTwoColumnLayout('body')

  // Add footer button
  layout.elements.footerButton = {
    section: 'footer',
    x: 'center',
    y: 'center',
    width: 48,
    height: 48,
    align: 'center',
    _icon: footerIcon,
    _onClick: onFooterClick
  }

  // Merge column elements
  layout.elements = {
    ...layout.elements,
    ...columnLayout.elements
  }

  return layout
}

/**
 * Merges multiple layout schemas into a single schema.
 *
 * Useful for combining preset layouts with custom sections and elements.
 * Later schemas override earlier ones for conflicting keys.
 *
 * @param {...Object} schemas - Layout schemas to merge
 * @returns {Object} Merged layout schema
 *
 * @example
 * const baseLayout = createStandardPageLayout()
 * const customLayout = {
 *   sections: { customSection: { height: '10%', after: 'body' } },
 *   elements: { customElement: { section: 'customSection', ... } }
 * }
 * const merged = mergeLayouts(baseLayout, customLayout)
 */
export function mergeLayouts(...schemas) {
  const result = { sections: {}, elements: {} }

  for (const schema of schemas) {
    if (!schema || typeof schema !== 'object') continue

    if (schema.sections && typeof schema.sections === 'object') {
      result.sections = { ...result.sections, ...schema.sections }
    }

    if (schema.elements && typeof schema.elements === 'object') {
      result.elements = { ...result.elements, ...schema.elements }
    }
  }

  return result
}
