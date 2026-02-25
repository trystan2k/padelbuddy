/**
 * @fileoverview Reusable widget factory functions for UI components.
 *
 * This module provides standardized factory functions for creating common UI
 * widgets using design tokens for consistent styling across the application.
 *
 * @module utils/ui-components
 */

import { getFontSize, TOKENS } from './design-tokens.js'

/**
 * Validates that a bounds object has valid numeric properties.
 * @param {Object} bounds - The bounds object to validate
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @returns {boolean} True if bounds are valid
 */
function isValidBounds(bounds) {
  return (
    typeof bounds === 'object' &&
    bounds !== null &&
    typeof bounds.x === 'number' &&
    typeof bounds.y === 'number' &&
    typeof bounds.w === 'number' &&
    typeof bounds.h === 'number'
  )
}

/**
 * Creates a full-screen background FILL_RECT widget.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} metrics - Screen metrics
 * @param {number} metrics.width - Screen width
 * @param {number} metrics.height - Screen height
 * @param {number} [color] - Optional background color (defaults to TOKENS.colors.background)
 * @returns {Object|null} The created widget or null if hmUI unavailable
 *
 * @example
 * createBackground(hmUI, { width: 390, height: 450 })
 * createBackground(hmUI, { width: 390, height: 450 }, 0x111111)
 */
export function createBackground(widget, metrics, color) {
  if (typeof widget === 'undefined' || widget === null) {
    return null
  }

  if (
    typeof metrics !== 'object' ||
    metrics === null ||
    typeof metrics.width !== 'number' ||
    typeof metrics.height !== 'number'
  ) {
    return null
  }

  const backgroundColor =
    typeof color === 'number' ? color : TOKENS.colors.background

  return widget.createWidget(widget.widget.FILL_RECT, {
    x: 0,
    y: 0,
    w: metrics.width,
    h: metrics.height,
    color: backgroundColor
  })
}

/**
 * Creates a rounded card container using FILL_RECT.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.color] - Card background color (defaults to TOKENS.colors.cardBackground or background)
 * @param {number} [options.radiusRatio] - Radius as ratio of height (defaults to 0.07)
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * createCard(hmUI, { x: 20, y: 50, w: 350, h: 200 })
 * createCard(hmUI, { x: 20, y: 50, w: 350, h: 200 }, { color: 0x222222, radiusRatio: 0.1 })
 */
export function createCard(widget, bounds, options) {
  if (typeof widget === 'undefined' || widget === null) {
    return null
  }

  if (!isValidBounds(bounds)) {
    return null
  }

  const opts = typeof options === 'object' && options !== null ? options : {}
  const cardColor =
    typeof opts.color === 'number'
      ? opts.color
      : (TOKENS.colors.cardBackground ?? TOKENS.colors.background)
  const radiusRatio =
    typeof opts.radiusRatio === 'number' ? opts.radiusRatio : 0.07
  const radius = Math.round(bounds.h * radiusRatio)

  return widget.createWidget(widget.widget.FILL_RECT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    radius,
    color: cardColor
  })
}

/**
 * Creates a horizontal or vertical divider line using FILL_RECT.
 * Orientation is determined by bounds: width > height = horizontal, else vertical.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {number} [color] - Divider color (defaults to TOKENS.colors.divider)
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * // Horizontal divider
 * createDivider(hmUI, { x: 0, y: 100, w: 390, h: 1 })
 * // Vertical divider
 * createDivider(hmUI, { x: 194, y: 50, w: 1, h: 300 })
 */
export function createDivider(widget, bounds, color) {
  if (typeof widget === 'undefined' || widget === null) {
    return null
  }

  if (!isValidBounds(bounds)) {
    return null
  }

  const dividerColor = typeof color === 'number' ? color : TOKENS.colors.divider

  return widget.createWidget(widget.widget.FILL_RECT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    color: dividerColor
  })
}

/**
 * Gets the button radius ratio from TOKENS with fallback.
 * @returns {number} The button radius ratio
 */
function getButtonRadiusRatio() {
  return TOKENS.sizing?.buttonRadiusRatio ?? 0.2
}

/**
 * Creates a unified button supporting multiple variants.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} options - Button configuration
 * @param {string} options.text - Button text (required for non-icon variants)
 * @param {Function} options.onClick - Click handler (required)
 * @param {string} [options.variant='primary'] - Button variant: 'primary', 'secondary', 'icon', 'danger'
 * @param {boolean} [options.visible=true] - Initial visibility
 * @param {boolean} [options.disabled=false] - Disabled state
 * @param {string} [options.icon] - Icon asset name (required for 'icon' variant)
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * // Primary button
 * createButton(hmUI, { x: 20, y: 100, w: 350, h: 50 }, {
 *   text: 'Start Match',
 *   onClick: () => handleStart()
 * })
 *
 * // Icon button
 * createButton(hmUI, { x: 170, y: 200, w: 48, h: 48 }, {
 *   variant: 'icon',
 *   icon: 'home-icon.png',
 *   onClick: () => navigateHome()
 * })
 */
export function createButton(widget, bounds, options) {
  if (typeof widget === 'undefined' || widget === null) {
    return null
  }

  if (!isValidBounds(bounds)) {
    return null
  }

  if (typeof options !== 'object' || options === null) {
    return null
  }

  const variant =
    typeof options.variant === 'string' ? options.variant : 'primary'
  const isDisabled = options.disabled === true
  const icon = typeof options.icon === 'string' ? options.icon : null
  const onClick =
    typeof options.onClick === 'function' ? options.onClick : () => {}

  const radiusRatio = getButtonRadiusRatio()
  const radius = Math.round(bounds.h * radiusRatio)

  // Icon variant uses BUTTON with normal_src/press_src
  if (variant === 'icon') {
    if (!icon) {
      return null
    }

    return widget.createWidget(widget.widget.BUTTON, {
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      normal_src: icon,
      press_src: icon,
      click_func: isDisabled ? () => {} : onClick
    })
  }

  // Text-based variants
  const text = typeof options.text === 'string' ? options.text : ''
  if (!text) {
    return null
  }

  const textSize = getFontSize('buttonLarge')

  // Variant-specific colors
  let normalColor
  let pressColor
  let textColor

  if (isDisabled) {
    normalColor = TOKENS.colors.disabled
    pressColor = TOKENS.colors.disabled
    textColor = TOKENS.colors.mutedText
  } else {
    switch (variant) {
      case 'secondary':
        normalColor = TOKENS.colors.secondaryButton
        pressColor =
          TOKENS.colors.secondaryButtonPressed ?? TOKENS.colors.secondaryButton
        textColor = TOKENS.colors.text
        break
      case 'danger':
        normalColor = TOKENS.colors.dangerButton ?? TOKENS.colors.danger
        pressColor = TOKENS.colors.dangerButtonPressed ?? TOKENS.colors.danger
        textColor = TOKENS.colors.text
        break
      default:
        normalColor = TOKENS.colors.primaryButton
        pressColor =
          TOKENS.colors.primaryButtonPressed ?? TOKENS.colors.primaryButton
        textColor = TOKENS.colors.text
        break
    }
  }

  return widget.createWidget(widget.widget.BUTTON, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    radius,
    normal_color: normalColor,
    press_color: pressColor,
    color: textColor,
    text_size: textSize,
    text,
    click_func: isDisabled ? () => {} : onClick
  })
}

/**
 * Creates a generic text element.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {number} bounds.x - X position
 * @param {number} bounds.y - Y position
 * @param {number} bounds.w - Width
 * @param {number} bounds.h - Height
 * @param {Object} options - Text configuration
 * @param {string} options.text - Text content (required)
 * @param {string} [options.style] - Typography style key (e.g., 'body', 'pageTitle')
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment (defaults to CENTER_H)
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * createText(hmUI, { x: 20, y: 50, w: 350, h: 40 }, {
 *   text: 'Hello World',
 *   style: 'body',
 *   color: 0xffffff
 * })
 */
export function createText(widget, bounds, options) {
  if (typeof widget === 'undefined' || widget === null) {
    return null
  }

  if (!isValidBounds(bounds)) {
    return null
  }

  if (typeof options !== 'object' || options === null) {
    return null
  }

  const text = typeof options.text === 'string' ? options.text : ''
  if (!text) {
    return null
  }

  const style = typeof options.style === 'string' ? options.style : 'body'
  const textColor =
    typeof options.color === 'number' ? options.color : TOKENS.colors.text
  const align =
    typeof options.align === 'number' ? options.align : widget.align.CENTER_H

  const textSize = getFontSize(style)

  return widget.createWidget(widget.widget.TEXT, {
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    color: textColor,
    text,
    text_size: textSize,
    align_h: align,
    align_v: widget.align.CENTER_V
  })
}

/**
 * Creates a page-level title text element.
 * Wraps createText with predefined 'pageTitle' style.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {string} text - Title text
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * createPageTitle(hmUI, { x: 0, y: 20, w: 390, h: 50 }, 'Match Setup')
 */
export function createPageTitle(widget, bounds, text, options) {
  if (typeof text !== 'string' || !text) {
    return null
  }

  const opts = typeof options === 'object' && options !== null ? options : {}
  const textColor =
    typeof opts.color === 'number' ? opts.color : TOKENS.colors.text

  return createText(widget, bounds, {
    text,
    style: 'pageTitle',
    color: textColor,
    align: opts.align
  })
}

/**
 * Creates a section header text element.
 * Wraps createText with predefined 'sectionTitle' style.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {string} text - Section title text
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.mutedText)
 * @param {number} [options.align] - Horizontal alignment
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * createSectionTitle(hmUI, { x: 20, y: 100, w: 350, h: 30 }, 'Team Selection')
 */
export function createSectionTitle(widget, bounds, text, options) {
  if (typeof text !== 'string' || !text) {
    return null
  }

  const opts = typeof options === 'object' && options !== null ? options : {}
  const textColor =
    typeof opts.color === 'number' ? opts.color : TOKENS.colors.mutedText

  return createText(widget, bounds, {
    text,
    style: 'sectionTitle',
    color: textColor,
    align: opts.align
  })
}

/**
 * Creates a body paragraph text element.
 * Wraps createText with predefined 'body' style.
 *
 * @param {Object} widget - The hmUI widget API
 * @param {Object} bounds - Position and size
 * @param {string} text - Body text content
 * @param {Object} [options] - Optional configuration
 * @param {number} [options.color] - Text color (defaults to TOKENS.colors.text)
 * @param {number} [options.align] - Horizontal alignment
 * @returns {Object|null} The created widget or null if invalid
 *
 * @example
 * createBodyText(hmUI, { x: 20, y: 150, w: 350, h: 60 }, 'Select the number of sets to play.')
 */
export function createBodyText(widget, bounds, text, options) {
  if (typeof text !== 'string' || !text) {
    return null
  }

  const opts = typeof options === 'object' && options !== null ? options : {}
  const textColor =
    typeof opts.color === 'number' ? opts.color : TOKENS.colors.text

  return createText(widget, bounds, {
    text,
    style: 'body',
    color: textColor,
    align: opts.align
  })
}
