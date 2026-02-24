/**
 * App Data Clear Utility
 *
 * Clears all application data including:
 * - Active match session (dual storage: storage.js + match-storage.js)
 * - Match history
 * - In-memory data structures
 */

import {
  clearMatchHistory as clearHistoryViaRemove,
  HISTORY_STORAGE_KEY,
  keyToFilename,
  saveToFile
} from './match-history-storage.js'
import { MATCH_HISTORY_SCHEMA_VERSION } from './match-history-types.js'
import { clearMatchState } from './match-storage.js'
import { clearState } from './storage.js'

/**
 * Overwrite a file with null to effectively "delete" it.
 * More reliable than hmFS.remove() on some Zepp OS devices.
 * @param {string} filename
 */
function overwriteWithNull(filename) {
  const result = saveToFile(filename, 'null')
  return result
}

/**
 * Clear match history by overwriting with empty data (more reliable than hmFS.remove).
 * @returns {boolean}
 */
function clearMatchHistoryReliable() {
  // First try the standard remove method
  clearHistoryViaRemove()

  // Also overwrite with empty data to ensure it's cleared
  // Use the same filename generation as loadMatchHistory
  const filename = keyToFilename(HISTORY_STORAGE_KEY)

  try {
    const emptyData = {
      matches: [],
      schemaVersion: MATCH_HISTORY_SCHEMA_VERSION
    }
    saveToFile(filename, JSON.stringify(emptyData))
  } catch (_e) {
    // Ignore error
  }

  return true
}

/**
 * Clear all app data and return to home screen.
 * @returns {boolean} True if clear was successful
 */
export function clearAllAppData() {
  let success = true

  // Clear active match state - BOTH storage systems!
  // The app writes to both storage.js and match-storage.js

  // 1. Clear 'padel-buddy.match-state' from storage.js
  try {
    clearState()
  } catch (_e) {
    success = false
  }
  // Also overwrite the file directly (more reliable than remove)
  overwriteWithNull('padel-buddy_match-state.json')

  // 2. Clear 'ACTIVE_MATCH_SESSION' from match-storage.js
  try {
    clearMatchState()
  } catch (_e) {
    success = false
  }
  // Also overwrite the file directly (more reliable than remove)
  overwriteWithNull('ACTIVE_MATCH_SESSION.json')

  // 3. Clear match history
  try {
    clearMatchHistoryReliable()
  } catch (_e) {
    success = false
  }

  // 4. Clear in-memory data structures
  try {
    if (typeof getApp === 'function') {
      const app = getApp()

      if (app?.globalData) {
        app.globalData.matchState = null
        app.globalData.matchHistory = null
        app.globalData.pendingHomeMatchState = null
        app.globalData.pendingPersistedMatchState = null
        app.globalData.sessionHandoff = null
        app.globalData._lastPersistedSchemaState = null
      }
    }
  } catch (_e) {
    // Ignore error
  }

  return success
}
