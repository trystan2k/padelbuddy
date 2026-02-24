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
  console.log('overwriteWithNull:', filename, 'result:', result)
  return result
}

/**
 * Clear match history by overwriting with empty data (more reliable than hmFS.remove).
 * @returns {boolean}
 */
function clearMatchHistoryReliable() {
  console.log('clearMatchHistoryReliable: starting')

  // First try the standard remove method
  const removeResult = clearHistoryViaRemove()
  console.log('clearMatchHistoryReliable: remove result:', removeResult)

  // Also overwrite with empty data to ensure it's cleared
  // Use the same filename generation as loadMatchHistory
  const filename = keyToFilename(HISTORY_STORAGE_KEY)
  console.log('clearMatchHistoryReliable: filename:', filename)

  try {
    const emptyData = {
      matches: [],
      schemaVersion: MATCH_HISTORY_SCHEMA_VERSION
    }
    const writeResult = saveToFile(filename, JSON.stringify(emptyData))
    console.log('clearMatchHistoryReliable: overwrite result:', writeResult)
  } catch (e) {
    console.log('clearMatchHistoryReliable: overwrite error:', e)
  }

  return true
}

/**
 * Clear all app data and return to home screen.
 * @returns {boolean} True if clear was successful
 */
export function clearAllAppData() {
  console.log('clearAllAppData: starting')
  let success = true

  // Clear active match state - BOTH storage systems!
  // The app writes to both storage.js and match-storage.js

  // 1. Clear 'padel-buddy.match-state' from storage.js
  try {
    clearState()
    console.log('clearAllAppData: clearState() done')
  } catch (e) {
    console.log('clearAllAppData: clearState error:', e)
    success = false
  }
  // Also overwrite the file directly (more reliable than remove)
  overwriteWithNull('padel-buddy_match-state.json')

  // 2. Clear 'ACTIVE_MATCH_SESSION' from match-storage.js
  try {
    clearMatchState()
    console.log('clearAllAppData: clearMatchState() done')
  } catch (e) {
    console.log('clearAllAppData: clearMatchState error:', e)
    success = false
  }
  // Also overwrite the file directly (more reliable than remove)
  overwriteWithNull('ACTIVE_MATCH_SESSION.json')

  // 3. Clear match history
  try {
    clearMatchHistoryReliable()
    console.log('clearAllAppData: clearMatchHistoryReliable() done')
  } catch (e) {
    console.log('clearAllAppData: clearMatchHistoryReliable error:', e)
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
        console.log('clearAllAppData: globalData cleared')
      }
    }
  } catch (e) {
    console.log('clearAllAppData: globalData error:', e)
  }

  console.log('clearAllAppData: done, success =', success)
  return success
}
