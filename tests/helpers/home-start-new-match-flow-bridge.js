export async function startNewMatchFlow(...args) {
  if (typeof globalThis.__homeScreenStartNewMatchFlow !== 'function') {
    throw new Error('Missing home startNewMatchFlow bridge.')
  }

  return globalThis.__homeScreenStartNewMatchFlow(...args)
}

export async function clearActiveMatchSession(...args) {
  if (typeof globalThis.__homeScreenClearActiveMatchSession !== 'function') {
    throw new Error('Missing home clearActiveMatchSession bridge.')
  }

  return globalThis.__homeScreenClearActiveMatchSession(...args)
}

export async function resetMatchStateManager(...args) {
  if (typeof globalThis.__homeScreenResetMatchStateManager !== 'function') {
    throw new Error('Missing home resetMatchStateManager bridge.')
  }

  return globalThis.__homeScreenResetMatchStateManager(...args)
}
