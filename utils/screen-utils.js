/**
 * @fileoverview Screen utilities for adaptive layouts across device shapes.
 *
 * Provides essential screen measurement utilities and round screen geometry
 * calculations to support adaptive layouts for both square and round screens.
 *
 * @module utils/screen-utils
 */

/**
 * Retrieves screen metrics including dimensions and round screen detection.
 * Uses hmSetting.getDeviceInfo() to obtain screen dimensions.
 *
 * @returns {{width: number, height: number, isRound: boolean}} Screen metrics object
 *
 * @example
 * const { width, height, isRound } = getScreenMetrics()
 * // width: 466 (GTR 3), height: 466 (GTR 3), isRound: true
 * // width: 390 (GTS 3), height: 450 (GTS 3), isRound: false
 */
export function getScreenMetrics() {
  // Default fallback for test environments
  if (
    typeof hmSetting === 'undefined' ||
    typeof hmSetting.getDeviceInfo !== 'function'
  ) {
    return { width: 390, height: 450, isRound: false }
  }

  const { width, height } = hmSetting.getDeviceInfo()
  const isRound = Math.abs(width - height) <= Math.round(width * 0.04)

  return { width, height, isRound }
}

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
 * @param {number} [padding=4] - Additional padding from edge (default: 4)
 * @returns {number} The safe inset value from the left edge
 *
 * @example
 * // For a 466x466 round screen at y=233 (center)
 * getRoundSafeInset(466, 466, 233, 4)  // Returns 4 (minimum at center)
 *
 * // At y=0 (top edge)
 * getRoundSafeInset(466, 466, 0, 4)    // Returns ~237 (large inset at edge)
 */
function getRoundSafeInset(width, height, y, padding = 4) {
  const centerX = width / 2
  const radius = width / 2
  const yFromCenter = y - height / 2
  const halfChord = Math.sqrt(radius * radius - yFromCenter * yFromCenter)
  return Math.max(0, centerX - halfChord + padding)
}

/**
 * Calculates the safe inset for an entire section on round screens.
 * Computes insets for both top and bottom of section, returns the maximum.
 *
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @param {number} sectionTop - The Y position of section top
 * @param {number} sectionHeight - The height of the section
 * @param {number} [padding=4] - Additional padding from edge (default: 4)
 * @returns {number} The maximum safe inset value for the entire section
 *
 * @example
 * // For a section spanning y=100 to y=200 on a 466x466 screen
 * getRoundSafeSectionInset(466, 466, 100, 100, 4)
 * // Returns max of insets at y=100 and y=200
 */
export function getRoundSafeSectionInset(
  width,
  height,
  sectionTop,
  sectionHeight,
  padding = 4
) {
  const sectionBottom = sectionTop + sectionHeight
  const topInset = getRoundSafeInset(width, height, sectionTop, padding)
  const bottomInset = getRoundSafeInset(width, height, sectionBottom, padding)
  return Math.max(topInset, bottomInset)
}
