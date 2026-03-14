import assert from 'node:assert/strict'
import test from 'node:test'

import { clearAllAppData } from '../utils/app-data-clear.js'
import {
  clearHapticFeedbackEnabled,
  HAPTIC_FEEDBACK_STORAGE_KEY,
  loadHapticFeedbackEnabled,
  saveHapticFeedbackEnabled
} from '../utils/haptic-feedback-settings.js'
import {
  createLocalStorageMock,
  withMockLocalStorage
} from './helpers/local-storage-mock.js'

test('loadHapticFeedbackEnabled defaults to true when key is missing', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(loadHapticFeedbackEnabled(), true)
  })
})

test('saveHapticFeedbackEnabled persists boolean preferences', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveHapticFeedbackEnabled(false), false)
    assert.equal(has(HAPTIC_FEEDBACK_STORAGE_KEY), true)
    assert.equal(loadHapticFeedbackEnabled(), false)

    assert.equal(saveHapticFeedbackEnabled(true), true)
    assert.equal(loadHapticFeedbackEnabled(), true)
  })
})

test('clearHapticFeedbackEnabled resets the preference to default', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    saveHapticFeedbackEnabled(false)
    assert.equal(loadHapticFeedbackEnabled(), false)

    assert.equal(clearHapticFeedbackEnabled(), true)
    assert.equal(has(HAPTIC_FEEDBACK_STORAGE_KEY), false)
    assert.equal(loadHapticFeedbackEnabled(), true)
  })
})

test('clearAllAppData clears the haptic preference', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    saveHapticFeedbackEnabled(false)
    assert.equal(loadHapticFeedbackEnabled(), false)

    assert.equal(clearAllAppData(), true)
    assert.equal(has(HAPTIC_FEEDBACK_STORAGE_KEY), false)
    assert.equal(loadHapticFeedbackEnabled(), true)
  })
})
