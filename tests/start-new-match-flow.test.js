import assert from 'node:assert/strict'
import test from 'node:test'

import { createHistoryStack } from '../utils/history-stack.js'
import { createInitialMatchState } from '../utils/match-state.js'
import {
  ACTIVE_MATCH_SESSION_STORAGE_KEY,
  matchStorage,
  ZeppOsStorageAdapter
} from '../utils/match-storage.js'
import {
  clearActiveMatchSession,
  resetMatchStateManager,
  startNewMatchFlow
} from '../utils/start-new-match-flow.js'
import { MATCH_STATE_STORAGE_KEY } from '../utils/storage.js'
import { createHmFsMock, storageKeyToFilename } from './helpers/hmfs-mock.js'

const SCHEMA_FILENAME = storageKeyToFilename(ACTIVE_MATCH_SESSION_STORAGE_KEY)
const RUNTIME_FILENAME = storageKeyToFilename(MATCH_STATE_STORAGE_KEY)

test('clearActiveMatchSession clears schema and legacy keys through persistence APIs', () => {
  const originalHmFS = globalThis.hmFS
  const { mock, fileStore } = createHmFsMock({
    [SCHEMA_FILENAME]: '{"status":"active"}',
    [RUNTIME_FILENAME]: '{"status":"active"}'
  })

  globalThis.hmFS = mock

  try {
    const result = clearActiveMatchSession()

    assert.deepEqual(result, {
      clearedSchema: true,
      clearedLegacy: true
    })
    assert.equal(fileStore.has(SCHEMA_FILENAME), false)
    assert.equal(fileStore.has(RUNTIME_FILENAME), false)
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }
})

test('clearActiveMatchSession is idempotent when keys are already absent', async () => {
  const resultFirstCall = await clearActiveMatchSession({
    async clearSchemaSession() {},
    clearLegacySession() {}
  })
  const resultSecondCall = await clearActiveMatchSession({
    async clearSchemaSession() {},
    clearLegacySession() {}
  })

  assert.deepEqual(resultFirstCall, {
    clearedSchema: true,
    clearedLegacy: true
  })
  assert.deepEqual(resultSecondCall, {
    clearedSchema: true,
    clearedLegacy: true
  })
})

test('clearActiveMatchSession always returns success', () => {
  const result = clearActiveMatchSession()

  assert.deepEqual(result, {
    clearedSchema: true,
    clearedLegacy: true
  })
})

test('clearActiveMatchSession handles missing storage gracefully', () => {
  const originalHmFS = globalThis.hmFS

  globalThis.hmFS = null

  try {
    const result = clearActiveMatchSession()

    assert.equal(typeof result, 'object')
  } finally {
    globalThis.hmFS = originalHmFS
  }
})

test('resetMatchStateManager resets runtime match state and clears existing history', () => {
  const originalGetApp = globalThis.getApp
  const app = {
    globalData: {
      matchState: {
        ...createInitialMatchState(1700000001),
        status: 'finished',
        winnerTeam: 'teamA',
        setHistory: [
          {
            setNumber: 1,
            teamAGames: 6,
            teamBGames: 3
          }
        ]
      },
      matchHistory: {
        clearCalls: 0,
        clear() {
          this.clearCalls += 1
        }
      }
    }
  }

  globalThis.getApp = () => app

  try {
    const result = resetMatchStateManager()

    assert.equal(result.didReset, true)
    assert.equal(result.resetMatchState, true)
    assert.equal(result.clearedMatchHistory, true)
    assert.equal(app.globalData.matchHistory.clearCalls, 1)
  } finally {
    globalThis.getApp = originalGetApp
  }
})

test('resetMatchStateManager rehydrates history stack when clear is unavailable', () => {
  const originalGetApp = globalThis.getApp
  const app = {
    globalData: {
      matchState: {
        ...createInitialMatchState(1700000002),
        status: 'finished'
      },
      matchHistory: null
    }
  }

  globalThis.getApp = () => app

  try {
    const result = resetMatchStateManager()

    assert.equal(result.didReset, true)
    assert.equal(result.resetMatchState, true)
    assert.equal(result.rehydratedMatchHistory, true)
    assert.ok(app.globalData.matchHistory)
  } finally {
    globalThis.getApp = originalGetApp
  }
})

test('resetMatchStateManager returns no-op result when app instance is unavailable', () => {
  const result = resetMatchStateManager({
    getAppInstance() {
      return null
    }
  })

  assert.deepEqual(result, {
    didReset: false,
    resetMatchState: false,
    clearedMatchHistory: false,
    rehydratedMatchHistory: false
  })
})

test('startNewMatchFlow clears storage, resets runtime manager, and navigates to setup', () => {
  const originalHmFS = globalThis.hmFS
  const originalGetApp = globalThis.getApp
  const originalHmApp = globalThis.hmApp

  const navigationCalls = []
  const app = {
    globalData: {
      matchState: {
        ...createInitialMatchState(1700000010),
        status: 'finished',
        winnerTeam: 'teamA'
      },
      matchHistory: {
        clearCalls: 0,
        clear() {
          this.clearCalls += 1
        }
      }
    }
  }

  const { mock, fileStore } = createHmFsMock({
    [SCHEMA_FILENAME]: '{"status":"active"}',
    [RUNTIME_FILENAME]: '{"status":"active"}'
  })

  globalThis.hmFS = mock
  globalThis.getApp = () => app
  globalThis.hmApp = {
    gotoPage(payload) {
      navigationCalls.push(payload)
    }
  }

  try {
    const result = startNewMatchFlow()

    assert.deepEqual(result, {
      clearSession: {
        clearedSchema: true,
        clearedLegacy: true
      },
      resetStateManager: {
        didReset: true,
        resetMatchState: true,
        clearedMatchHistory: true,
        rehydratedMatchHistory: false
      },
      navigatedToSetup: true,
      didEncounterError: false
    })
    assert.equal(fileStore.has(SCHEMA_FILENAME), false)
    assert.equal(fileStore.has(RUNTIME_FILENAME), false)
    assert.deepEqual(app.globalData.matchState, createInitialMatchState())
    assert.equal(app.globalData.matchHistory.clearCalls, 1)
    assert.deepEqual(navigationCalls, [{ url: 'page/setup' }])
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }

    if (typeof originalGetApp === 'undefined') {
      delete globalThis.getApp
    } else {
      globalThis.getApp = originalGetApp
    }

    if (typeof originalHmApp === 'undefined') {
      delete globalThis.hmApp
    } else {
      globalThis.hmApp = originalHmApp
    }
  }
})

test('startNewMatchFlow keeps flow order and fails safe when cleanup throws', () => {
  const originalHmFS = globalThis.hmFS
  const originalGetApp = globalThis.getApp
  const originalHmApp = globalThis.hmApp

  // Provide a mock where remove throws — clearState/clearMatchState should swallow it
  const { mock } = createHmFsMock()
  mock.remove = () => {
    throw new Error('remove failed')
  }

  globalThis.hmFS = mock
  globalThis.getApp = () => ({
    globalData: {
      matchState: createInitialMatchState(),
      matchHistory: { clear() {} }
    }
  })
  globalThis.hmApp = {
    gotoPage() {}
  }

  try {
    const result = startNewMatchFlow()

    // Flow continues even when errors occur
    assert.equal(result.clearSession.clearedSchema, true)
    assert.equal(result.clearSession.clearedLegacy, true)
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
    if (typeof originalGetApp === 'undefined') {
      delete globalThis.getApp
    } else {
      globalThis.getApp = originalGetApp
    }
    if (typeof originalHmApp === 'undefined') {
      delete globalThis.hmApp
    } else {
      globalThis.hmApp = originalHmApp
    }
  }
})

test('startNewMatchFlow fails safe when navigation throws', () => {
  const originalHmFS = globalThis.hmFS
  const originalGetApp = globalThis.getApp
  const originalHmApp = globalThis.hmApp

  const { mock } = createHmFsMock()
  globalThis.hmFS = mock
  globalThis.getApp = () => ({
    globalData: {
      matchState: createInitialMatchState(),
      matchHistory: { clear() {} }
    }
  })
  globalThis.hmApp = {
    gotoPage() {
      throw new Error('navigation failed')
    }
  }

  try {
    const result = startNewMatchFlow()

    assert.equal(result.navigatedToSetup, false)
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
    if (typeof originalGetApp === 'undefined') {
      delete globalThis.getApp
    } else {
      globalThis.getApp = originalGetApp
    }
    if (typeof originalHmApp === 'undefined') {
      delete globalThis.hmApp
    } else {
      globalThis.hmApp = originalHmApp
    }
  }
})
