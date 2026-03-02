import assert from 'node:assert/strict'
import test from 'node:test'

import { createScoreViewModel } from '../page/score-view-model.js'
import {
  ACTIVE_SESSION_FILE_PATH,
  getActiveSession
} from '../utils/active-session-storage.js'
import { SCORE_POINTS } from '../utils/scoring-constants.js'
import { createHmFsMock } from './helpers/hmfs-mock.js'
import { toProjectFileUrl } from './helpers/project-paths.js'

let appImportCounter = 0
const ACTIVE_SESSION_FILESTORE_KEY = ACTIVE_SESSION_FILE_PATH.replace(
  /^\/data\//,
  ''
)

async function loadAppDefinition() {
  const originalApp = globalThis.App
  let capturedDefinition = null

  globalThis.App = (definition) => {
    capturedDefinition = definition
  }

  const moduleUrl = toProjectFileUrl('app.js')
  moduleUrl.search = `integration=${Date.now()}-${appImportCounter}`
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
  const { mock, fileStore } = createHmFsMock()

  globalThis.hmFS = mock

  try {
    const app = await loadAppDefinition()

    // Simulate an active game in globalData (as game.js would leave it)
    app.globalData.matchState = {
      teams: {
        teamA: { id: 'teamA', label: 'Team A' },
        teamB: { id: 'teamB', label: 'Team B' }
      },
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

    assert.equal(
      fileStore.has(ACTIVE_SESSION_FILESTORE_KEY),
      true,
      'schema state was not persisted on app.onDestroy'
    )

    const persistedSession = getActiveSession()
    assert.notEqual(persistedSession, null)
    assert.equal(persistedSession?.status, 'active')
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }
})

test('app.onDestroy skips save when match state is not active', async () => {
  const originalHmFS = globalThis.hmFS
  const { mock, fileStore } = createHmFsMock()

  globalThis.hmFS = mock

  try {
    const app = await loadAppDefinition()

    app.globalData.matchState = {
      teams: {
        teamA: { id: 'teamA', label: 'Team A' },
        teamB: { id: 'teamB', label: 'Team B' }
      },
      teamA: { points: 0, games: 0 },
      teamB: { points: 0, games: 0 },
      currentSetStatus: { number: 1, teamAGames: 0, teamBGames: 0 },
      currentSet: 1,
      status: 'finished',
      updatedAt: 0
    }

    app.onDestroy()

    assert.equal(
      fileStore.has(ACTIVE_SESSION_FILESTORE_KEY),
      false,
      'should not persist finished state to schema key'
    )
  } finally {
    if (typeof originalHmFS === 'undefined') {
      delete globalThis.hmFS
    } else {
      globalThis.hmFS = originalHmFS
    }
  }
})

test('app.onDestroy is safe when globalData is missing or malformed', async () => {
  const app = await loadAppDefinition()

  app.globalData = null
  assert.doesNotThrow(() => app.onDestroy())

  app.globalData = {}
  assert.doesNotThrow(() => app.onDestroy())
})
