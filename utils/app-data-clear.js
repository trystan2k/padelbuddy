import {
  clearHapticFeedbackEnabled,
  HAPTIC_FEEDBACK_STORAGE_KEY
} from './haptic-feedback-settings.js'
import {
  clearMatchHistory,
  HISTORY_STORAGE_KEY
} from './match-history-storage.js'
import { clearMatchState } from './match-storage.js'
import {
  clearStateKeys,
  STORAGE_SCHEMA_META_KEY,
  STORAGE_SCHEMA_VERSION_KEY
} from './persistence.js'

const APP_STORAGE_KEYS = [
  HISTORY_STORAGE_KEY,
  HAPTIC_FEEDBACK_STORAGE_KEY,
  STORAGE_SCHEMA_VERSION_KEY,
  STORAGE_SCHEMA_META_KEY
]

export function clearAllAppData() {
  let success = true

  try {
    if (clearMatchState() !== true) {
      success = false
    }
  } catch {
    success = false
  }

  try {
    if (clearMatchHistory() !== true) {
      success = false
    }
  } catch {
    success = false
  }

  try {
    if (clearHapticFeedbackEnabled() !== true) {
      success = false
    }
  } catch {
    success = false
  }

  try {
    if (clearStateKeys(APP_STORAGE_KEYS) !== true) {
      success = false
    }
  } catch {
    success = false
  }

  try {
    if (typeof getApp === 'function') {
      const app = getApp()

      if (app?.globalData) {
        app.globalData.matchState = null
        app.globalData.matchHistory = null
        app.globalData._lastPersistedSchemaState = null
      }
    }
  } catch {
    // Ignore in-memory cleanup errors.
  }

  return success
}
