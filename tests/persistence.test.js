import assert from 'node:assert/strict'
import test from 'node:test'

import { loadState, saveState } from '../utils/persistence.js'
import {
  createLocalStorageMock,
  withMockLocalStorage
} from './helpers/local-storage-mock.js'

test('saveState reports success for null values and loadState falls back to null', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('nullable-key', null), true)
    assert.equal(has('nullable-key'), true)
    assert.equal(loadState('nullable-key'), null)
  })
})

test('saveState rejects values that cannot be serialized', () => {
  const { storage, has } = createLocalStorageMock()
  const circularValue = {}
  circularValue.self = circularValue

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('circular-key', circularValue), false)
    assert.equal(has('circular-key'), false)
  })
})
