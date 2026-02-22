import assert from 'node:assert/strict'
import test from 'node:test'

import { createInitialMatchState } from '../utils/match-state.js'
import {
  MATCH_STATE_STORAGE_KEY,
  clearState,
  loadState,
  saveState
} from '../utils/storage.js'

test('saveState serializes MatchState and persists it with the stable storage key', () => {
  const state = createInitialMatchState(1700000000)
  const originalHmFS = globalThis.hmFS

  let capturedKey = ''
  let capturedValue = ''

  globalThis.hmFS = {
    SysProSetChars(key, value) {
      capturedKey = key
      capturedValue = value
    },
    SysProGetChars(key) {
      return null
    }
  }

  try {
    saveState(state)
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(capturedKey, MATCH_STATE_STORAGE_KEY)
  assert.equal(capturedValue, JSON.stringify(state))
  assert.deepEqual(JSON.parse(capturedValue), state)
})

test('clearState uses removeItem when runtime storage supports it', () => {
  const originalHmFS = globalThis.hmFS

  let removedKey = ''
  let setItemCalls = 0

  globalThis.hmFS = {
    SysProSetChars(key, value) {
      if (value === '') {
        removedKey = key
      } else {
        setItemCalls += 1
      }
    },
    SysProGetChars(key) {
      return null
    }
  }

  try {
    clearState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(removedKey, MATCH_STATE_STORAGE_KEY)
  assert.equal(setItemCalls, 0)
})

test('clearState falls back to setItem when removeItem is unavailable', () => {
  const originalHmFS = globalThis.hmFS

  let setItemCallCount = 0
  let setItemPayload = null

  globalThis.hmFS = {
    SysProSetChars(key, value) {
      setItemCallCount += 1
      setItemPayload = { key, value }
    },
    SysProGetChars(key) {
      return null
    }
  }

  try {
    clearState()
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }

  assert.equal(setItemCallCount, 1)
  assert.deepEqual(setItemPayload, {
    key: MATCH_STATE_STORAGE_KEY,
    value: ''
  })
})

test('loadState retrieves and parses saved MatchState using the stable storage key', () => {
  const state = createInitialMatchState(1700000000)
  const originalHmFS = globalThis.hmFS

  let capturedKey = ''

  globalThis.hmFS = {
    SysProSetChars(key, value) {},
    SysProGetChars(key) {
      capturedKey = key
      return JSON.stringify(state)
    }
  }

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

  assert.equal(capturedKey, MATCH_STATE_STORAGE_KEY)
  assert.deepEqual(loadedState, state)
})

test('loadState returns null when no saved state exists', () => {
  const originalHmFS = globalThis.hmFS

  let capturedKey = ''

  globalThis.hmFS = {
    SysProSetChars(key, value) {},
    SysProGetChars(key) {
      capturedKey = key
      return null
    }
  }

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

  assert.equal(capturedKey, MATCH_STATE_STORAGE_KEY)
  assert.equal(loadedState, null)
})

test('loadState returns null when saved state payload is corrupted JSON', () => {
  const originalHmFS = globalThis.hmFS

  globalThis.hmFS = {
    SysProSetChars(key, value) {},
    SysProGetChars(key) {
      return '{bad-json'
    }
  }

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

test('saveState and loadState gracefully fallback when settingsStorage is unavailable', () => {
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

  globalThis.hmFS = {
    SysProSetChars(key, value) {},
    SysProGetChars(key) {
      return JSON.stringify({
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
    }
  }

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
