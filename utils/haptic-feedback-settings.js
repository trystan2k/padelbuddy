import { deleteState, loadState, saveState } from './persistence.js'

export const HAPTIC_FEEDBACK_STORAGE_KEY = 'padel-buddy.haptic-feedback-enabled'

const HAPTIC_FEEDBACK_DEFAULT_ENABLED = true

function parseHapticFeedbackEnabled(value) {
  if (value === true || value === 1 || value === '1' || value === 'true') {
    return true
  }

  if (value === false || value === 0 || value === '0' || value === 'false') {
    return false
  }

  return HAPTIC_FEEDBACK_DEFAULT_ENABLED
}

export function loadHapticFeedbackEnabled() {
  try {
    const storedValue = loadState(HAPTIC_FEEDBACK_STORAGE_KEY)
    return parseHapticFeedbackEnabled(storedValue)
  } catch {
    return HAPTIC_FEEDBACK_DEFAULT_ENABLED
  }
}

export function saveHapticFeedbackEnabled(enabled) {
  const normalizedEnabled = enabled === true

  try {
    saveState(HAPTIC_FEEDBACK_STORAGE_KEY, normalizedEnabled)
  } catch {
    // Ignore persistence errors.
  }

  return normalizedEnabled
}

export function clearHapticFeedbackEnabled() {
  try {
    return deleteState(HAPTIC_FEEDBACK_STORAGE_KEY)
  } catch {
    return false
  }
}
