import assert from 'node:assert/strict'
import test from 'node:test'

import { createScoreViewModel } from '../page/score-view-model.js'
import { SCORE_POINTS } from '../utils/scoring-constants.js'
import { STORAGE_KEY as ACTIVE_MATCH_SESSION_KEY } from '../utils/match-state-schema.js'
import { MATCH_STATE_STORAGE_KEY } from '../utils/storage.js'
import { matchStorage } from '../utils/match-storage.js'
import { createHmFsMock, readFileStoreKey } from './helpers/hmfs-mock.js'

let appImportCounter = 0

async function loadAppDefinition() {
  const originalApp = globalThis.App
  let capturedDefinition = null

  globalThis.App = (definition) => {
    capturedDefinition = definition
  }

  const moduleUrl = new URL(
    `../app.js?integration=${Date.now()}-${appImportCounter}`,
    import.meta.url
  )
  appImportCounter += 1

  try {
    await import(moduleUrl.href)
  } finally {
    if (typeof originalApp === 'undefined') {
      delete globalThis.App
    } else {
      globalThis.App = originalApp
    }
  }

  if (!capturedDefinition) {
    throw new Error('App definition was not registered by app.js.')
  }

  return capturedDefinition
}

test('app exposes add/undo actions and keeps global match state in sync', async () => {
  const app = await loadAppDefinition()

  assert.equal(typeof app.addPointForTeam, 'function')
  assert.equal(typeof app.removePoint, 'function')

  const initialViewModel = createScoreViewModel(app.globalData.matchState)

  const stateAfterPoint = app.addPointForTeam('teamA')
  const viewModelAfterPoint = createScoreViewModel(app.globalData.matchState)

  assert.equal(stateAfterPoint.teamA.points, SCORE_POINTS.FIFTEEN)
  assert.equal(viewModelAfterPoint.teamA.points, SCORE_POINTS.FIFTEEN)
  assert.equal(app.globalData.matchHistory.size(), 1)

  const stateAfterUndo = app.removePoint()
  const viewModelAfterUndo = createScoreViewModel(app.globalData.matchState)

  assert.deepEqual(stateAfterUndo, app.globalData.matchState)
  assert.equal(viewModelAfterUndo.teamA.points, SCORE_POINTS.LOVE)
  assert.equal(viewModelAfterUndo.teamA.games, 0)
  assert.equal(viewModelAfterUndo.currentSetGames.teamA, 0)
  assert.deepEqual(viewModelAfterUndo, initialViewModel)
  assert.equal(app.globalData.matchHistory.size(), 0)
})

test('app.onDestroy persists active match state as emergency save', async () => {
  const originalHmFS = globalThis.hmFS
  const originalMatchStorageAdapter = matchStorage.adapter

  const savedSchemaKeys = []
  const { mock, fileStore } = createHmFsMock()

  globalThis.hmFS = mock

  matchStorage.adapter = {
    save(key, value) {
      if (key === ACTIVE_MATCH_SESSION_KEY) savedSchemaKeys.push({ key, value })
    },
    load() { return null },
    clear() {}
  }

  try {
    const app = await loadAppDefinition()

    // Simulate an active game in globalData (as game.js would leave it)
    app.globalData.matchState = {
      teams: { teamA: { id: 'teamA', label: 'Team A' }, teamB: { id: 'teamB', label: 'Team B' } },
      teamA: { points: 15, games: 1 },
      teamB: { points: 0, games: 0 },
      currentSetStatus: { number: 1, teamAGames: 1, teamBGames: 0 },
      currentSet: 1,
      status: 'active',
      updatedAt: 1700000000
    }

    // Simulate the last persisted schema snapshot (as game.js caches it)
    app.globalData._lastPersistedSchemaState = {
      status: 'active',
      setsToPlay: 3,
      setsNeededToWin: 2,
      setsWon: { teamA: 0, teamB: 0 },
      currentSet: { number: 1, games: { teamA: 1, teamB: 0 } },
      currentGame: { points: { teamA: 15, teamB: 0 } },
      setHistory: [],
      updatedAt: 1700000000,
      schemaVersion: 1
    }

    app.onDestroy()

    // Runtime state should have been written to file
    const runtimeStored = readFileStoreKey(fileStore, MATCH_STATE_STORAGE_KEY)
    assert.ok(runtimeStored !== null, 'runtime state was not persisted on app.onDestroy')

    // Schema state should have been passed to the matchStorage adapter
    assert.ok(savedSchemaKeys.length > 0, 'schema state was not persisted on app.onDestroy')
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
    matchStorage.adapter = originalMatchStorageAdapter
  }
})

test('app.onDestroy skips save when match state is not active', async () => {
  const originalHmFS = globalThis.hmFS
  const originalMatchStorageAdapter = matchStorage.adapter

  const savedSchemaKeys = []
  const { mock, fileStore } = createHmFsMock()

  globalThis.hmFS = mock

  matchStorage.adapter = {
    save(key, value) {
      if (key === ACTIVE_MATCH_SESSION_KEY) savedSchemaKeys.push({ key, value })
    },
    load() { return null },
    clear() {}
  }

  try {
    const app = await loadAppDefinition()

    app.globalData.matchState = {
      teams: { teamA: { id: 'teamA', label: 'Team A' }, teamB: { id: 'teamB', label: 'Team B' } },
      teamA: { points: 0, games: 0 },
      teamB: { points: 0, games: 0 },
      currentSetStatus: { number: 1, teamAGames: 0, teamBGames: 0 },
      currentSet: 1,
      status: 'finished',
      updatedAt: 0
    }

    app.onDestroy()

    const runtimeStored = readFileStoreKey(fileStore, MATCH_STATE_STORAGE_KEY)
    assert.equal(runtimeStored, null, 'should not persist finished state')
    assert.equal(savedSchemaKeys.length, 0, 'should not persist finished state to schema key')
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
    matchStorage.adapter = originalMatchStorageAdapter
  }
})

test('app.onDestroy is safe when globalData is missing or malformed', async () => {
  const app = await loadAppDefinition()

  app.globalData = null
  assert.doesNotThrow(() => app.onDestroy())

  app.globalData = {}
  assert.doesNotThrow(() => app.onDestroy())
})
