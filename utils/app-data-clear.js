import { clearHapticFeedbackEnabled } from './haptic-feedback-settings.js'
import { clearMatchHistory } from './match-history-storage.js'
import { clearMatchState } from './match-storage.js'
import { clearAllState } from './persistence.js'

export function clearAllAppData() {
  try {
    clearMatchState()
  } catch {
    // Ignore key-level cleanup errors and continue with broader clear.
  }

  try {
    clearMatchHistory()
  } catch {
    // Ignore key-level cleanup errors and continue with broader clear.
  }

  try {
    clearHapticFeedbackEnabled()
  } catch {
    // Ignore key-level cleanup errors and continue with broader clear.
  }

  let didClearStorage = false

  try {
    didClearStorage = clearAllState() === true
  } catch {
    didClearStorage = false
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

  return didClearStorage
}
