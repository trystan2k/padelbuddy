import assert from 'node:assert/strict'
import test from 'node:test'

import { createInitialMatchState } from '../utils/match-state.js'
import { ACTIVE_MATCH_SESSION_STORAGE_KEY } from '../utils/match-storage.js'
import {
  clearActiveMatchSession,
  resetMatchStateManager,
  startNewMatchFlow
} from '../utils/start-new-match-flow.js'
import {
  createLocalStorageMock,
  withMockLocalStorage
} from './helpers/local-storage-mock.js'

test('clearActiveMatchSession clears the active session key', () => {
  const { storage, has } = createLocalStorageMock({
    [ACTIVE_MATCH_SESSION_STORAGE_KEY]: '{"status":"active"}'
  })

  withMockLocalStorage(storage, () => {
    const result = clearActiveMatchSession()

    assert.deepEqual(result, {
      clearedSchema: true,
      clearedLegacy: true
    })
    assert.equal(has(ACTIVE_MATCH_SESSION_STORAGE_KEY), false)
  })
})

test('clearActiveMatchSession is idempotent when keys are already absent', () => {
  const resultFirstCall = clearActiveMatchSession()
  const resultSecondCall = clearActiveMatchSession()

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
  const originalGetApp = globalThis.getApp
  delete globalThis.getApp

  try {
    const result = resetMatchStateManager()

    assert.deepEqual(result, {
      didReset: false,
      resetMatchState: false,
      clearedMatchHistory: false,
      rehydratedMatchHistory: false
    })
  } finally {
    globalThis.getApp = originalGetApp
  }
})

test('startNewMatchFlow clears storage, resets runtime manager, and navigates to setup', () => {
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
  const { storage, has } = createLocalStorageMock({
    [ACTIVE_MATCH_SESSION_STORAGE_KEY]: '{"status":"active"}'
  })

  globalThis.getApp = () => app
  globalThis.hmApp = {
    gotoPage(payload) {
      navigationCalls.push(payload)
    }
  }

  try {
    withMockLocalStorage(storage, () => {
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
      assert.equal(has(ACTIVE_MATCH_SESSION_STORAGE_KEY), false)
      assert.deepEqual(app.globalData.matchState, createInitialMatchState())
      assert.equal(app.globalData.matchHistory.clearCalls, 1)
      assert.deepEqual(navigationCalls, [{ url: 'page/setup' }])
    })
  } finally {
    globalThis.getApp = originalGetApp
    globalThis.hmApp = originalHmApp
  }
})

test('startNewMatchFlow keeps flow order and fails safe when cleanup throws', () => {
  const originalGetApp = globalThis.getApp
  const originalHmApp = globalThis.hmApp

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

    assert.equal(result.clearSession.clearedSchema, true)
    assert.equal(result.clearSession.clearedLegacy, true)
  } finally {
    globalThis.getApp = originalGetApp
    globalThis.hmApp = originalHmApp
  }
})

test('startNewMatchFlow fails safe when navigation throws', () => {
  const originalGetApp = globalThis.getApp
  const originalHmApp = globalThis.hmApp

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
    globalThis.getApp = originalGetApp
    globalThis.hmApp = originalHmApp
  }
})
