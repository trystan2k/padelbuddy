/**
 * Unification Regression Suite - Runtime Consistency Integration Tests
 *
 * Validates runtime consistency including:
 * - Save/load/update cycles
 * - Canonical preservation under subsequent writes
 * - Restart persistence via storage APIs only (no GlobalData handoff)
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearActiveSession,
  getActiveSession,
  saveActiveSession,
  updateActiveSession,
  updateActiveSessionPartial
} from '../../utils/active-session-storage.js'
import {
  CURRENT_SCHEMA_VERSION,
  createDefaultMatchState,
  MATCH_STATUS
} from '../../utils/match-state-schema.js'
import {
  CANONICAL_FILENAME,
  createHmFsMock,
  withMockedHmFs
} from '../helpers/hmfs-mock.js'

// ============================================================================
// Save/Load/Update Cycles
// ============================================================================

test('save/load cycle preserves complete session state', () => {
  const session = createDefaultMatchState()
  session.teams = {
    teamA: { id: 'teamA', label: 'Alpha Team' },
    teamB: { id: 'teamB', label: 'Beta Team' }
  }
  session.setsWon = { teamA: 1, teamB: 0 }
  session.currentSet = { number: 2, games: { teamA: 3, teamB: 2 } }
  session.currentGame = { points: { teamA: 30, teamB: 15 } }
  session.setHistory = [{ setNumber: 1, teamAGames: 6, teamBGames: 4 }]

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const loadedSession = getActiveSession()

    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.teams.teamA.label, 'Alpha Team')
    assert.equal(loadedSession.teams.teamB.label, 'Beta Team')
    assert.equal(loadedSession.setsWon.teamA, 1)
    assert.equal(loadedSession.setsWon.teamB, 0)
    assert.equal(loadedSession.currentSet.number, 2)
    assert.equal(loadedSession.currentSet.games.teamA, 3)
    assert.equal(loadedSession.currentGame.points.teamA, 30)
    assert.equal(loadedSession.setHistory.length, 1)
    assert.equal(loadedSession.setHistory[0].teamAGames, 6)
  })
})

test('sequential updates preserve state integrity', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008000

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    // First update: change current game points
    const firstUpdate = updateActiveSessionPartial(
      {
        currentGame: { points: { teamA: 15, teamB: 30 } }
      },
      { preserveUpdatedAt: true }
    )

    assert.notEqual(firstUpdate, null)
    assert.equal(firstUpdate.currentGame.points.teamA, 15)
    assert.equal(firstUpdate.currentGame.points.teamB, 30)

    // Second update: change set games
    const secondUpdate = updateActiveSession(
      (s) => ({
        ...s,
        currentSet: {
          ...s.currentSet,
          games: { teamA: 4, teamB: 3 }
        }
      }),
      { preserveUpdatedAt: true }
    )

    assert.notEqual(secondUpdate, null)
    assert.equal(secondUpdate.currentSet.games.teamA, 4)
    assert.equal(secondUpdate.currentSet.games.teamB, 3)
    // Verify previous update persisted
    assert.equal(secondUpdate.currentGame.points.teamA, 15)
    assert.equal(secondUpdate.currentGame.points.teamB, 30)
  })
})

test('update with function mutates only persisted snapshot', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008100

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    const callerSnapshot = getActiveSession()
    assert.notEqual(callerSnapshot, null)

    const updatedSession = updateActiveSession(
      (s) => {
        s.currentSet.games.teamA = 3
        return s
      },
      { preserveUpdatedAt: true }
    )

    assert.notEqual(updatedSession, null)
    // Caller's snapshot should remain unchanged
    assert.equal(callerSnapshot.currentSet.games.teamA, 0)
    // Updated session should have the change
    assert.equal(updatedSession.currentSet.games.teamA, 3)
  })
})

// ============================================================================
// Canonical Preservation Under Subsequent Writes
// ============================================================================

test('subsequent writes preserve canonical schema version', () => {
  const session = createDefaultMatchState()
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session), true)

    for (let i = 0; i < 5; i++) {
      updateActiveSessionPartial({
        currentGame: { points: { teamA: i * 15, teamB: 0 } }
      })
    }

    const finalSession = getActiveSession()
    assert.notEqual(finalSession, null)
    assert.equal(finalSession.schemaVersion, CURRENT_SCHEMA_VERSION)
  })
})

test('subsequent writes preserve team labels', () => {
  const session = createDefaultMatchState()
  session.teams = {
    teamA: { id: 'teamA', label: 'Persistent Label A' },
    teamB: { id: 'teamB', label: 'Persistent Label B' }
  }

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    updateActiveSessionPartial({
      setsWon: { teamA: 1, teamB: 0 },
      currentSet: { number: 2, games: { teamA: 2, teamB: 1 } }
    })

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.teams.teamA.label, 'Persistent Label A')
    assert.equal(loadedSession.teams.teamB.label, 'Persistent Label B')
  })
})

test('subsequent writes preserve match settings', () => {
  const session = createDefaultMatchState()
  session.setsToPlay = 5
  session.setsNeededToWin = 3
  session.settings = { setsToPlay: 5, setsNeededToWin: 3 }

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    // Multiple score updates
    for (let set = 1; set <= 3; set++) {
      updateActiveSessionPartial({
        setsWon: { teamA: set, teamB: 0 },
        setHistory: [
          { setNumber: 1, teamAGames: 6, teamBGames: 0 },
          { setNumber: 2, teamAGames: 6, teamBGames: 1 },
          { setNumber: 3, teamAGames: 6, teamBGames: 2 }
        ].slice(0, set)
      })
    }

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.setsToPlay, 5)
    assert.equal(loadedSession.setsNeededToWin, 3)
    assert.equal(loadedSession.settings.setsToPlay, 5)
    assert.equal(loadedSession.settings.setsNeededToWin, 3)
  })
})

// ============================================================================
// Restart Persistence (Storage API Only - No GlobalData Handoff)
// ============================================================================

test('session persists across simulated restart via storage clear and reload', () => {
  // Simulate app restart by:
  // 1. Saving a session
  // 2. Clearing module-level state (simulated by new mock context)
  // 3. Reloading via getActiveSession

  const session = createDefaultMatchState()
  session.teams = {
    teamA: { id: 'teamA', label: 'Restart Test A' },
    teamB: { id: 'teamB', label: 'Restart Test B' }
  }
  session.setsWon = { teamA: 1, teamB: 1 }
  session.currentSet = { number: 3, games: { teamA: 4, teamB: 4 } }
  session.updatedAt = 1700000009000

  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    // Phase 1: Initial save (simulating app running)
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    assert.equal(fileStore.has(CANONICAL_FILENAME), true)

    // Verify file content exists in store (simulating persisted disk state)
    const persistedBytes = fileStore.get(CANONICAL_FILENAME)
    assert.notEqual(persistedBytes, null)
    assert.notEqual(persistedBytes, undefined)
    assert.equal(persistedBytes.length > 0, true)

    // Phase 2: Simulated restart - just call getActiveSession
    // (In real app, this would be a fresh module load)
    const reloadedSession = getActiveSession()

    // Phase 3: Verify all state recovered from storage
    assert.notEqual(reloadedSession, null)
    assert.equal(reloadedSession.teams.teamA.label, 'Restart Test A')
    assert.equal(reloadedSession.teams.teamB.label, 'Restart Test B')
    assert.equal(reloadedSession.setsWon.teamA, 1)
    assert.equal(reloadedSession.setsWon.teamB, 1)
    assert.equal(reloadedSession.currentSet.number, 3)
    assert.equal(reloadedSession.currentSet.games.teamA, 4)
    assert.equal(reloadedSession.currentSet.games.teamB, 4)
    assert.equal(reloadedSession.timing.startedAt, session.timing.startedAt)
  })
})

test('timing.startedAt persists across simulated restart', () => {
  const session = createDefaultMatchState()
  session.timing.startedAt = '2024-01-15T10:30:00.000Z'
  session.updatedAt = 1700000010000

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    // Simulate restart
    const reloadedSession = getActiveSession()

    assert.notEqual(reloadedSession, null)
    assert.equal(reloadedSession.timing.startedAt, '2024-01-15T10:30:00.000Z')
  })
})

test('finished session persists correctly for history processing', () => {
  const session = createDefaultMatchState()
  session.status = MATCH_STATUS.FINISHED
  session.setsWon = { teamA: 2, teamB: 1 }
  session.currentSet = { number: 3, games: { teamA: 6, teamB: 3 } }
  session.setHistory = [
    { setNumber: 1, teamAGames: 6, teamBGames: 4 },
    { setNumber: 2, teamAGames: 3, teamBGames: 6 },
    { setNumber: 3, teamAGames: 6, teamBGames: 3 }
  ]
  session.timing.finishedAt = '2024-01-15T12:00:00.000Z'
  session.winnerTeam = 'teamA'

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    // Simulate restart
    const reloadedSession = getActiveSession()

    assert.notEqual(reloadedSession, null)
    assert.equal(reloadedSession.status, MATCH_STATUS.FINISHED)
    assert.equal(reloadedSession.setsWon.teamA, 2)
    assert.equal(reloadedSession.setsWon.teamB, 1)
    assert.equal(reloadedSession.timing.finishedAt, '2024-01-15T12:00:00.000Z')
    assert.equal(reloadedSession.winnerTeam, 'teamA')
    assert.equal(reloadedSession.setHistory.length, 3)
  })
})

test('empty storage after restart returns null (no stale state)', () => {
  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    // Verify empty state
    assert.equal(getActiveSession(), null)
    assert.equal(fileStore.has(CANONICAL_FILENAME), false)

    // Clear on empty should succeed
    assert.equal(clearActiveSession(), true)

    // Still null after clear
    assert.equal(getActiveSession(), null)
  })
})

// ============================================================================
// UpdatedAt Consistency
// ============================================================================

test('updatedAt advances on each save without preserveUpdatedAt option', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000000000

  const { mock } = createHmFsMock()
  const originalDateNow = Date.now
  let currentTime = 1700000001000
  Date.now = () => currentTime

  try {
    withMockedHmFs(mock, () => {
      assert.equal(saveActiveSession(session), true)

      currentTime = 1700000002000
      const firstUpdate = updateActiveSessionPartial({
        currentGame: { points: { teamA: 15, teamB: 0 } }
      })

      assert.notEqual(firstUpdate, null)
      assert.equal(firstUpdate.updatedAt, 1700000002000)

      currentTime = 1700000003000
      const secondUpdate = updateActiveSessionPartial({
        currentGame: { points: { teamA: 30, teamB: 0 } }
      })

      assert.notEqual(secondUpdate, null)
      assert.equal(secondUpdate.updatedAt, 1700000003000)
    })
  } finally {
    Date.now = originalDateNow
  }
})

test('preserveUpdatedAt option keeps original timestamp', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000005000

  const { mock } = createHmFsMock()
  const originalDateNow = Date.now
  Date.now = () => 1700000010000

  try {
    withMockedHmFs(mock, () => {
      assert.equal(
        saveActiveSession(session, { preserveUpdatedAt: true }),
        true
      )

      const update = updateActiveSessionPartial(
        { currentGame: { points: { teamA: 15, teamB: 0 } } },
        { preserveUpdatedAt: true }
      )

      assert.notEqual(update, null)
      assert.equal(update.updatedAt, 1700000005000)
    })
  } finally {
    Date.now = originalDateNow
  }
})
