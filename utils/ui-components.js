/**
 * @fileoverview Reusable widget factory functions for common UI elements.
 *
 * This module provides standardized widget factory functions for creating
 * UI components using design tokens for consistent styling. All functions
 * use TOKENS from design-tokens.js and return the created widget.
 *
 * @module utils/ui-components
 */

import { getFontSize, TOKENS } from './design-tokens.js'

/**
 * Validates that a bounds object contains required properties.
 * @param {Object} bounds - The bounds object to validate
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {string} context - Context string for error messages
 * @throws {Error} If bounds is invalid or missing required properties
 */
function validateBounds(bounds, context) {
  if (!bounds || typeof bounds !== 'object') {
    throw new Error(
      `${context}: bounds must be an object with x, y, w, h properties`
    )
  }
  const { x, y, w, h } = bounds
  if (
    typeof x !== 'number' ||
    typeof y !== 'number' ||
    typeof w !== 'number' ||
    typeof h !== 'number'
  ) {
    throw new Error(
      `${context}: bounds must contain numeric x, y, w, h properties`
    )
  }
}

/**
 * Validates that a metrics object contains required properties.
 * @param {Object} metrics - The metrics object to validate
 * @param {number} metrics.width - Screen width
 * @param {number} metrics.height - Screen height
 * @param {string} context - Context string for error messages
 * @throws {Error} If metrics is invalid or missing required properties
 */
function validateMetrics(metrics, context) {
  if (!metrics || typeof metrics !== 'object') {
    throw new Error(
      `${context}: metrics must be an object with width and height properties`
    )
  }
  const { width, height } = metrics
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new Error(
      `${context}: metrics must contain numeric width and height properties`
    )
  }
}

/**
 * Gets the appropriate widget creation function.
 * @param {Object} widget - Page context with createWidget method or undefined
 * @returns {Function} The widget creation function
 */
function getCreateWidgetFn(widget) {
  if (widget && typeof widget.createWidget === 'function') {
    return (type, props) => widget.createWidget(type, props)
  }
  if (typeof hmUI !== 'undefined' && typeof hmUI.createWidget === 'function') {
    return (type, props) => hmUI.createWidget(type, props)
  }
  return () => null
}

/**
 * Creates a full-screen FILL_RECT widget for use as a background.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} metrics - Screen metrics
 * @param {number} metrics.width - Screen width
 * @param {number} metrics.height - Screen height
 * @param {number} [color] - Background color (defaults to TOKENS.colors.background)
 * @returns {Object|null} The created FILL_RECT widget or null if creation failed
 * @throws {Error} If metrics is invalid
 *
 * @example
 * const bg = createBackground(this, { width: 390, height: 450 })
 * const bgCustom = createBackground(this, metrics, 0x111111)
 */
export function createBackground(page, metrics, color) {
  validateMetrics(metrics, 'createBackground')

  const backgroundColor = color !== undefined ? color : TOKENS.colors.background
  const createWidget = getCreateWidgetFn(page)

  return createWidget(hmUI.widget.FILL_RECT, {
    x: 0,
    y: 0,
    w: metrics.width,
    h: metrics.height,
    color: backgroundColor
  })
}

/**
 * Creates a rounded FILL_RECT container widget for use as a card.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Card bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} [options] - Card options
 * @param {number} [options.color] - Card color (defaults to TOKENS.colors.cardBackground or TOKENS.colors.background)
 * @param {number} [options.radiusRatio] - Radius as ratio of height (defaults to 0.07)
 * @returns {Object|null} The created FILL_RECT widget or null if creation failed
 * @throws {Error} If bounds is invalid
 *
 * @example
 * const card = createCard(this, { x: 10, y: 10, w: 370, h: 100 })
 * const cardCustom = createCard(this, bounds, { color: 0x222222, radiusRatio: 0.1 })
 */
export function createCard(page, bounds, options = {}) {
  validateBounds(bounds, 'createCard')

  const cardColor =
    options.color !== undefined
      ? options.color
      : TOKENS.colors.cardBackground || TOKENS.colors.background
  const radiusRatio =
    typeof options.radiusRatio === 'number' ? options.radiusRatio : 0.07
  const radius = Math.round(bounds.h * radiusRatio)

  const createWidget = getCreateWidgetFn(page)

  return createWidget(hmUI.widget.FILL_RECT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    color: cardColor,
    radius
  })
}

/**
 * Creates a FILL_RECT widget for use as a horizontal or vertical divider.
 * Orientation is determined by bounds: width > height = horizontal, else vertical.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Divider bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {number} [color] - Divider color (defaults to TOKENS.colors.divider)
 * @returns {Object|null} The created FILL_RECT widget or null if creation failed
 * @throws {Error} If bounds is invalid
 *
 * @example
 * // Horizontal divider
 * const hDivider = createDivider(this, { x: 10, y: 50, w: 370, h: 1 })
 * // Vertical divider
 * const vDivider = createDivider(this, { x: 195, y: 100, w: 1, h: 200 })
 */
export function createDivider(page, bounds, color) {
  validateBounds(bounds, 'createDivider')

  const dividerColor = color !== undefined ? color : TOKENS.colors.divider
  const createWidget = getCreateWidgetFn(page)

  return createWidget(hmUI.widget.FILL_RECT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    color: dividerColor
  })
}

/**
 * Creates a BUTTON widget with support for multiple variants.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Button bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} options - Button options
 * @param {string} options.text - Button text (required for non-icon variants)
 * @param {Function} options.onClick - Click handler function (required)
 * @param {string} [options.variant] - Button variant: 'primary', 'secondary', 'icon', 'danger' (defaults to 'primary')
 * @param {boolean} [options.visible] - Visibility (defaults to true)
 * @param {boolean} [options.disabled] - Disabled state (defaults to false)
 * @param {string} [options.icon] - Icon asset name for icon variant
 * @returns {Object|null} The created BUTTON widget or null if creation failed
 * @throws {Error} If bounds is invalid or required options are missing
 *
 * @example
 * const btn = createButton(this, { x: 10, y: 10, w: 370, h: 50 }, {
 *   text: 'Click Me',
 *   onClick: () => console.log('clicked'),
 *   variant: 'primary'
 * })
 */
export function createButton(page, bounds, options = {}) {
  validateBounds(bounds, 'createButton')

  if (!options || typeof options !== 'object') {
    throw new Error('createButton: options must be an object')
  }

  const variant = options.variant || 'primary'
  const visible = options.visible !== false
  const disabled = options.disabled === true

  // Validate required options based on variant
  if (variant !== 'icon' && !options.text) {
    throw new Error('createButton: text is required for non-icon variants')
  }
  if (typeof options.onClick !== 'function') {
    throw new Error('createButton: onClick must be a function')
  }
  if (variant === 'icon' && !options.icon) {
    throw new Error('createButton: icon is required for icon variant')
  }

  // Calculate text size and radius
  const textSize = getFontSize('buttonLarge', bounds.w)
  const radiusRatio = TOKENS.sizing.buttonRadiusRatio || 0.2
  const radius = Math.round(bounds.h * radiusRatio)

  const createWidget = getCreateWidgetFn(page)

  // Handle disabled state with grayed-out appearance
  if (disabled) {
    return createWidget(hmUI.widget.BUTTON, {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      radius,
      normal_color: TOKENS.colors.disabled,
      press_color: TOKENS.colors.disabled,
      color: TOKENS.colors.mutedText,
      text_size: textSize,
      text: options.text || '',
      visible
    })
  }

  // Handle icon variant
  if (variant === 'icon') {
    return createWidget(hmUI.widget.BUTTON, {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      normal_src: options.icon,
      press_src: options.icon,
      click_func: options.onClick,
      visible
    })
  }

  // Determine colors based on variant
  let normalColor, pressColor
  switch (variant) {
    case 'secondary':
      normalColor = TOKENS.colors.secondaryButton
      pressColor =
        TOKENS.colors.secondaryButtonPressed || TOKENS.colors.secondaryButton
      break
    case 'danger':
      normalColor = TOKENS.colors.dangerButton || TOKENS.colors.danger
      pressColor = TOKENS.colors.dangerButtonPressed || TOKENS.colors.danger
      break
    default:
      normalColor = TOKENS.colors.primaryButton
      pressColor =
        TOKENS.colors.primaryButtonPressed || TOKENS.colors.primaryButton
  }

  return createWidget(hmUI.widget.BUTTON, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    radius,
    normal_color: normalColor,
    press_color: pressColor,
    color: TOKENS.colors.text,
    text_size: textSize,
    text: options.text,
    click_func: options.onClick,
    visible
  })
}

/**
 * Creates a TEXT widget with customizable styling.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Text bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} options - Text options
 * @param {string} options.text - Text content (required)
 * @param {string} [options.style] - Typography style key (e.g., 'pageTitle', 'body')
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment (defaults to hmUI.align.CENTER_H)
 * @returns {Object|null} The created TEXT widget or null if creation failed
 * @throws {Error} If bounds is invalid or text is missing
 *
 * @example
 * const text = createText(this, { x: 0, y: 10, w: 390, h: 40 }, {
 *   text: 'Hello World',
 *   style: 'body',
 *   color: 0xffffff
 * })
 */
export function createText(page, bounds, options = {}) {
  validateBounds(bounds, 'createText')

  if (!options || typeof options !== 'object') {
    throw new Error('createText: options must be an object')
  }
  if (!options.text) {
    throw new Error('createText: text is required')
  }

  const textColor =
    options.color !== undefined ? options.color : TOKENS.colors.text
  const textAlign =
    options.align !== undefined ? options.align : hmUI.align.CENTER_H

  // Calculate text size based on style or use default
  let textSize
  if (options.style) {
    textSize = getFontSize(options.style, bounds.w)
  } else {
    textSize = getFontSize('body', bounds.w)
  }

  const createWidget = getCreateWidgetFn(page)

  return createWidget(hmUI.widget.TEXT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    color: textColor,
    text: options.text,
    text_size: textSize,
    align_h: textAlign,
    align_v: hmUI.align.CENTER_V
  })
}

/**
 * Creates a TEXT widget styled as a page-level title.
 * Uses 'pageTitle' typography style.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Title bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {string} text - Title text content
 * @param {Object} [options] - Additional options
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment (defaults to hmUI.align.CENTER_H)
 * @returns {Object|null} The created TEXT widget or null if creation failed
 * @throws {Error} If bounds is invalid or text is missing
 *
 * @example
 * const title = createPageTitle(this, { x: 0, y: 10, w: 390, h: 50 }, 'Settings')
 */
export function createPageTitle(page, bounds, text, options = {}) {
  if (!text) {
    throw new Error('createPageTitle: text is required')
  }

  return createText(page, bounds, {
    text,
    style: 'pageTitle',
    color: options.color !== undefined ? options.color : TOKENS.colors.text,
    align: options.align
  })
}

/**
 * Creates a TEXT widget styled as a section header.
 * Uses 'sectionTitle' typography style.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Title bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {string} text - Section title text content
 * @param {Object} [options] - Additional options
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.mutedText)
 * @param {number} [options.align] - Horizontal alignment (defaults to hmUI.align.CENTER_H)
 * @returns {Object|null} The created TEXT widget or null if creation failed
 * @throws {Error} If bounds is invalid or text is missing
 *
 * @example
 * const sectionTitle = createSectionTitle(this, { x: 10, y: 100, w: 370, h: 30 }, 'Match History')
 */
export function createSectionTitle(page, bounds, text, options = {}) {
  if (!text) {
    throw new Error('createSectionTitle: text is required')
  }

  return createText(page, bounds, {
    text,
    style: 'sectionTitle',
    color:
      options.color !== undefined ? options.color : TOKENS.colors.mutedText,
    align: options.align
  })
}

/**
 * Creates a TEXT widget styled as body paragraph text.
 * Uses 'body' typography style.
 *
 * @param {Object} page - Page context with createWidget method (optional, falls back to hmUI)
 * @param {Object} bounds - Text bounds
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {string} text - Body text content
 * @param {Object} [options] - Additional options
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment (defaults to hmUI.align.CENTER_H)
 * @returns {Object|null} The created TEXT widget or null if creation failed
 * @throws {Error} If bounds is invalid or text is missing
 *
 * @example
 * const body = createBodyText(this, { x: 10, y: 150, w: 370, h: 60 }, 'This is a description.')
 */
export function createBodyText(page, bounds, text, options = {}) {
  if (!text) {
    throw new Error('createBodyText: text is required')
  }

  return createText(page, bounds, {
    text,
    style: 'body',
    color: options.color !== undefined ? options.color : TOKENS.colors.text,
    align: options.align
  })
}
