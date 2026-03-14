import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearActiveSession,
  getActiveSession,
  saveActiveSession,
  updateActiveSession,
  updateActiveSessionPartial
} from '../utils/active-session-storage.js'
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultMatchState,
  STORAGE_KEY
} from '../utils/match-state-schema.js'
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  STORAGE_SCHEMA_VERSION_KEY
} from '../utils/persistence.js'
import {
  createLocalStorageMock,
  withMockLocalStorage
} from './helpers/local-storage-mock.js'

test('saveActiveSession persists the canonical session in LocalStorage', () => {
  const { storage, has } = createLocalStorageMock()
  const session = createDefaultMatchState()

  withMockLocalStorage(storage, () => {
    assert.equal(saveActiveSession(session), true)
    assert.equal(has(STORAGE_KEY), true)
    assert.equal(has(STORAGE_SCHEMA_VERSION_KEY), true)

    const persistedSession = getActiveSession()
    assert.equal(persistedSession?.schemaVersion, CURRENT_SCHEMA_VERSION)
  })
})

test('storage schema bootstrap writes the current schema version', () => {
  const { storage, getRaw } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    saveActiveSession(createDefaultMatchState())
    assert.equal(
      getRaw(STORAGE_SCHEMA_VERSION_KEY),
      `__padel_buddy_platform_adapters__:${CURRENT_STORAGE_SCHEMA_VERSION}`
    )
  })
})

test('updateActiveSession keeps the original start time unless repair is enabled', () => {
  const { storage } = createLocalStorageMock()
  const session = createDefaultMatchState()

  withMockLocalStorage(storage, () => {
    saveActiveSession(session)
    const originalStartedAt = getActiveSession()?.timing.startedAt

    const updatedSession = updateActiveSession((currentSession) => ({
      ...currentSession,
      timing: {
        ...currentSession.timing,
        startedAt: '2000-01-01T00:00:00.000Z'
      }
    }))

    assert.equal(updatedSession?.timing.startedAt, originalStartedAt)

    const repairedSession = updateActiveSession(
      (currentSession) => ({
        ...currentSession,
        timing: {
          ...currentSession.timing,
          startedAt: '2000-01-01T00:00:00.000Z'
        }
      }),
      { allowStartTimeRepair: true }
    )

    assert.equal(repairedSession?.timing.startedAt, '2000-01-01T00:00:00.000Z')
  })
})

test('updateActiveSessionPartial applies partial updates and clearActiveSession removes them', () => {
  const { storage, has } = createLocalStorageMock()
  const session = createDefaultMatchState()

  withMockLocalStorage(storage, () => {
    saveActiveSession(session)

    const updatedSession = updateActiveSessionPartial({
      currentSet: {
        number: 2,
        games: {
          teamA: 3,
          teamB: 1
        }
      }
    })

    assert.equal(updatedSession?.currentSet.number, 2)
    assert.equal(updatedSession?.currentSet.games.teamA, 3)
    assert.equal(has(STORAGE_KEY), true)

    assert.equal(clearActiveSession(), true)
    assert.equal(has(STORAGE_KEY), false)
    assert.equal(getActiveSession(), null)
  })
})
