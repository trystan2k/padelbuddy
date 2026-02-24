/**
 * App Data Clear Utility
 *
 * Clears all application data including:
 * - Active match session
 * - Match history
 * - In-memory data structures
 * - Filesystem storage
 */

/**
 * Returns a filesystem-based storage interface for clearing app data.
 * This abstraction provides a consistent API for removing files regardless
 * of the underlying storage mechanism.
 *
 * @returns {{ setItem: (key: string, value: string) => void, removeItem: (key: string) => void } | null}
 */
function getFilesystemRemover() {
  if (
    typeof hmFS !== 'undefined' &&
    typeof hmFS.open === 'function' &&
    typeof hmFS.close === 'function' &&
    typeof hmFS.remove === 'function'
  ) {
    return {
      setItem() {
        // Not needed for clearing
      },
      removeItem(key) {
        try {
          const filename = `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`
          hmFS.remove(filename)
        } catch {
          // Ignore errors
        }
      }
    }
  }

  return null
}

/**
 * Show a toast message to the user.
 * @param {string} message - The message to display
 */
function showToast(message) {
  if (typeof hmUI !== 'undefined' && typeof hmUI.showToast === 'function') {
    try {
      hmUI.showToast({
        text: message
      })
    } catch {
      // Ignore toast errors
    }
  }
}

/**
 * Clear all app data and return to home screen.
 */
export function clearAllAppData() {
  // Storage keys to clear
  const STORAGE_KEYS = ['padel-buddy.match-state', 'padel-buddy.match-history']

  // Clear storage keys using filesystem remover
  try {
    const remover = getFilesystemRemover()

    if (remover) {
      STORAGE_KEYS.forEach((key) => {
        remover.removeItem(key)
      })
    }
  } catch {
    // Ignore storage clear errors
  }

  // Clear in-memory data structures
  try {
    if (typeof getApp === 'function') {
      const app = getApp()

      if (app?.globalData) {
        // Clear all globalData properties
        app.globalData.matchState = null
        app.globalData.matchHistory = null
        app.globalData.pendingHomeMatchState = null
        app.globalData.pendingPersistedMatchState = null
        app.globalData.sessionHandoff = null
      }
    }
  } catch {
    // Ignore in-memory clear errors
  }

  // Show confirmation toast before navigating
  showToast('Data cleared')

  // Log confirmation
  console.log('App data cleared')

  // Return to home screen
  if (typeof hmApp !== 'undefined' && typeof hmApp.gotoPage === 'function') {
    try {
      hmApp.gotoPage({
        url: 'page/index'
      })
    } catch {
      // Ignore navigation errors
    }
  }
}
