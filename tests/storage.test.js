import assert from 'node:assert/strict'
import test from 'node:test'

import { createInitialMatchState } from '../utils/match-state.js'
import {
  MATCH_STATE_STORAGE_KEY,
  clearState,
  loadState,
  saveState
} from '../utils/storage.js'
import { createHmFsMock, storageKeyToFilename, readFileStoreKey } from './helpers/hmfs-mock.js'

const MATCH_STATE_FILENAME = storageKeyToFilename(MATCH_STATE_STORAGE_KEY)

test('saveState serializes MatchState and persists it with the stable storage key', () => {
  const state = createInitialMatchState(1700000000)
  const originalHmFS = globalThis.hmFS
  const { mock, fileStore } = createHmFsMock()

  globalThis.hmFS = mock

  try {
    saveState(state)
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.ok(fileStore.has(MATCH_STATE_FILENAME), 'file should be written')
  const stored = readFileStoreKey(fileStore, MATCH_STATE_STORAGE_KEY)
  assert.deepEqual(JSON.parse(stored), state)
})

test('clearState removes the file from persistent storage', () => {
  const originalHmFS = globalThis.hmFS
  const { mock, fileStore } = createHmFsMock({
    [MATCH_STATE_FILENAME]: JSON.stringify({ placeholder: true })
  })

  globalThis.hmFS = mock

  try {
    clearState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.ok(!fileStore.has(MATCH_STATE_FILENAME), 'file should be removed')
})

test('loadState retrieves and parses saved MatchState using the stable storage key', () => {
  const state = createInitialMatchState(1700000000)
  const originalHmFS = globalThis.hmFS
  const { mock } = createHmFsMock()

  globalThis.hmFS = mock

  let loadedState

  try {
    saveState(state)
    loadedState = loadState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.deepEqual(loadedState, state)
})

test('loadState returns null when no saved state exists', () => {
  const originalHmFS = globalThis.hmFS
  const { mock } = createHmFsMock()

  globalThis.hmFS = mock

  let loadedState

  try {
    loadedState = loadState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(loadedState, null)
})

test('loadState returns null when saved state payload is corrupted JSON', () => {
  const originalHmFS = globalThis.hmFS
  const { mock } = createHmFsMock({
    [MATCH_STATE_FILENAME]: '{bad-json'
  })

  globalThis.hmFS = mock

  let loadedState

  try {
    loadedState = loadState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(loadedState, null)
})

test('saveState and loadState gracefully fallback when hmFS is unavailable', () => {
  const state = createInitialMatchState(1700000001)
  const originalHmFS = globalThis.hmFS

  if (typeof originalHmFS !== 'undefined') {
    delete globalThis.hmFS
  }

  let loadedState

  try {
    assert.doesNotThrow(() => saveState(state))
    loadedState = loadState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.deepEqual(loadedState, state)
})

test('loadState returns null when payload is valid JSON but invalid MatchState shape', () => {
  const originalHmFS = globalThis.hmFS
  const invalidPayload = JSON.stringify({
    teams: {
      teamA: { id: 'teamA', label: 'Team A' },
      teamB: { id: 'teamB', label: 'Team B' }
    },
    teamA: { points: 999, games: 0 },
    teamB: { points: 0, games: 0 },
    currentSetStatus: { number: 1, teamAGames: 0, teamBGames: 0 },
    currentSet: 1,
    status: 'active',
    updatedAt: 1700000000
  })
  const { mock } = createHmFsMock({ [MATCH_STATE_FILENAME]: invalidPayload })

  globalThis.hmFS = mock

  let loadedState

  try {
    loadedState = loadState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(loadedState, null)
})
