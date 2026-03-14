import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  clearAllState,
  clearStateKeys,
  loadState,
  STORAGE_SCHEMA_META_KEY,
  STORAGE_SCHEMA_VERSION_KEY,
  saveState
} from '../utils/persistence.js'
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

test('loadState returns fallback when key is missing', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(loadState('missing-key', { fallback: 'fallback' }), 'fallback')
  })
})

test('loadState applies revive and validate options', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('match-status', { status: 'active' }), true)

    const revived = loadState('match-status', {
      revive(value) {
        if (value?.status === 'active') {
          return { ...value, revived: true }
        }

        return null
      },
      validate(value) {
        return value?.revived === true
      }
    })

    assert.deepEqual(revived, { status: 'active', revived: true })
  })
})

test('loadState returns fallback when revive returns null or validation fails', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('invalid-state', { value: 10 }), true)

    const rejectedByRevive = loadState('invalid-state', {
      fallback: 'revive-fallback',
      revive() {
        return null
      }
    })

    const rejectedByValidate = loadState('invalid-state', {
      fallback: 'validate-fallback',
      validate(value) {
        return value?.value === 999
      }
    })

    assert.equal(rejectedByRevive, 'revive-fallback')
    assert.equal(rejectedByValidate, 'validate-fallback')
  })
})

test('ensureStorageSchema metadata is written when persistence runs', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('schema-smoke', { ok: true }), true)

    assert.equal(
      loadState(STORAGE_SCHEMA_VERSION_KEY),
      CURRENT_STORAGE_SCHEMA_VERSION
    )

    const schemaMeta = loadState(STORAGE_SCHEMA_META_KEY)
    assert.equal(schemaMeta?.currentVersion, CURRENT_STORAGE_SCHEMA_VERSION)
    assert.equal(typeof schemaMeta?.ensuredAt, 'number')
  })
})

test('clearStateKeys reports partial failures and continues clearing', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveState('good', { ok: true }), true)
    assert.equal(saveState('bad', { ok: false }), true)

    const originalRemoveItem = globalThis.localStorage.removeItem
    globalThis.localStorage.removeItem = (key) => {
      if (String(key) === 'bad') {
        throw new Error('remove failed')
      }

      originalRemoveItem.call(globalThis.localStorage, key)
    }

    const didClearAllKeys = clearStateKeys(['good', 'bad'])

    assert.equal(didClearAllKeys, false)
    assert.equal(loadState('good'), null)
    assert.deepEqual(loadState('bad'), { ok: false })
  })
})

test('clearAllState removes all entries and remains usable for subsequent writes', () => {
  const { storage, snapshot } = createLocalStorageMock({
    keyA: JSON.stringify({ value: 1 }),
    keyB: JSON.stringify({ value: 2 })
  })

  withMockLocalStorage(storage, () => {
    assert.equal(clearAllState(), true)
    assert.deepEqual(snapshot(), {})

    assert.equal(saveState('after-clear', { restored: true }), true)
    assert.deepEqual(loadState('after-clear'), { restored: true })
  })
})
