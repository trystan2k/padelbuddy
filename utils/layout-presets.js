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

import { TOKENS, toPercentage } from './design-tokens.js'

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
 * @example
 * // Layout without footer
 * const noFooterLayout = createStandardPageLayout({ hasFooter: false })
 *
 * @example
 * // Custom header height
 * const customLayout = createStandardPageLayout({ headerHeight: '15%' })
 */
export function createStandardPageLayout(options = {}) {
  const {
    hasHeader = true,
    hasFooter = true,
    top = 0,
    bottom = 0,
    bodyGap,
    headerRoundSafeInset = true,
    bodyRoundSafeInset = true,
    footerRoundSafeInset = false,
    headerHeight = `${TOKENS.typography.pageTitle * 2 * 100}%`,
    footerHeight = `${TOKENS.typography.button * 2 * 100}%`
  } = options

  const sections = {}
  const elements = {}

  // Header section: top-anchored with round-safe inset
  if (hasHeader) {
    sections.header = {
      top,
      height: headerHeight,
      roundSafeInset: headerRoundSafeInset
    }
  }

  // Body section: fills remaining space with header gap
  sections.body = {
    height: 'fill',
    roundSafeInset: bodyRoundSafeInset
  }

  if (hasHeader) {
    sections.body.after = 'header'
    if (bodyGap != null) {
      sections.body.gap = bodyGap
    } else {
      sections.body.gap = `${TOKENS.spacing.headerToContent * 100}%`
    }
  }

  // Footer section: bottom-anchored, no round-safe inset (icon centering handles positioning)
  if (hasFooter) {
    sections.footer = {
      bottom,
      height: footerHeight,
      roundSafeInset: footerRoundSafeInset
    }
  }

  return { sections, elements }
}

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
    footerButtonName = 'footerButton',
    onClick,
    hasHeader = true,
    top,
    bottom,
    bodyGap,
    headerRoundSafeInset,
    bodyRoundSafeInset,
    footerRoundSafeInset,
    headerHeight,
    footerHeight
  } = options

  // Build base schema from standard layout
  const baseSchema = createStandardPageLayout({
    hasHeader,
    hasFooter: true, // Footer required for button
    top,
    bottom,
    bodyGap,
    headerRoundSafeInset,
    bodyRoundSafeInset,
    footerRoundSafeInset,
    headerHeight,
    footerHeight
  })

  // Add footer button element
  // Button is centered and sized based on TOKENS
  const buttonSize = TOKENS.sizing.iconLarge // 48px

  baseSchema.elements[footerButtonName] = {
    section: 'footer',
    x: 0,
    y: 0,
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

/**
 * Creates a score-focused page layout schema.
 *
 * Returns a 3-section layout tailored for scoreboard screens:
 * header (top), scoreArea (middle fill), and footer (bottom).
 *
 * @param {Object} [options={}] - Configuration options
 * @param {number|string} [options.headerTop] - Top offset for header section
 * @param {number|string} [options.headerHeight='15%'] - Header height
 * @param {number|string} [options.scoreAreaGap] - Gap between header and score area
 * @param {number|string} [options.footerBottom] - Bottom offset for footer section
 * @param {number|string} [options.footerHeight='5%'] - Footer height
 * @param {boolean} [options.headerRoundSafeInset=false] - Header round screen inset behavior
 * @param {boolean} [options.scoreAreaRoundSafeInset=false] - Score area round screen inset behavior
 * @param {boolean} [options.footerRoundSafeInset=false] - Footer round screen inset behavior
 * @returns {Object} Layout schema with sections property
 */
export function createScorePageLayout(options = {}) {
  const {
    headerTop = toPercentage(TOKENS.spacing.headerTop),
    headerHeight = '15%',
    scoreAreaGap = toPercentage(TOKENS.spacing.headerToContent),
    footerBottom = toPercentage(TOKENS.spacing.footerBottom),
    footerHeight = '5%',
    headerRoundSafeInset = false,
    scoreAreaRoundSafeInset = false,
    footerRoundSafeInset = false
  } = options

  return {
    sections: {
      header: {
        top: headerTop,
        height: headerHeight,
        roundSafeInset: headerRoundSafeInset
      },
      scoreArea: {
        height: 'fill',
        after: 'header',
        gap: scoreAreaGap,
        roundSafeInset: scoreAreaRoundSafeInset
      },
      footer: {
        bottom: footerBottom,
        height: footerHeight,
        roundSafeInset: footerRoundSafeInset
      }
    },
    elements: {}
  }
}

/**
 * Creates a two-column layout as elements within a parent section.
 *
 * Returns element definitions for left and right columns at 50% width each.
 * These elements split the parent section horizontally.
 *
 * @param {string} parentSection - Name of the parent section to nest under
 * @returns {Object} Object with leftColumn and rightColumn elements
 * @throws {Error} If parentSection is not a valid string
 *
 * @example
 * const layout = createStandardPageLayout()
 * const columns = createTwoColumnLayout('body')
 * Object.assign(layout.elements, columns)
 * // layout.elements now contains: footerButton (if any) + leftColumn, rightColumn elements
 *
 * @example
 * // Full integration example
 * const schema = {
 *   sections: {
 *     header: { top: '5%', height: '15%', roundSafeInset: true },
 *     body: { height: 'fill', after: 'header', roundSafeInset: true },
 *     footer: { bottom: '7%', height: '10%', roundSafeInset: false }
 *   },
 *   elements: {
 *     ...createTwoColumnLayout('body')
 *   }
 * }
 */
export function createTwoColumnLayout(parentSection) {
  if (!parentSection || typeof parentSection !== 'string') {
    throw new Error(
      'createTwoColumnLayout requires a valid parentSection string'
    )
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
      x: 0,
      y: 0,
      width: '50%',
      height: '100%',
      align: 'right'
    }
  }
}
