/**
 * Unification Regression Suite - Active Session Storage Unit Tests
 *
 * Validates unified active-session storage behavior including:
 * - getActiveSession/saveActiveSession/clearActiveSession operations
 * - Empty storage handling
 * - Corrupt payload handling
 * - UTF-8 label preservation
 * - matchStartTime initialization and immutability
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
  createDefaultMatchState,
  STORAGE_KEY as LEGACY_ACTIVE_SESSION_STORAGE_KEY
} from '../../utils/match-state-schema.js'
import { MATCH_STATE_STORAGE_KEY } from '../../utils/storage.js'
import {
  CANONICAL_FILENAME,
  createHmFsMock,
  storageKeyToFilename,
  withMockedHmFs
} from '../helpers/hmfs-mock.js'

const LEGACY_ACTIVE_FILENAME = storageKeyToFilename(
  LEGACY_ACTIVE_SESSION_STORAGE_KEY
)
const LEGACY_RUNTIME_FILENAME = storageKeyToFilename(MATCH_STATE_STORAGE_KEY)

// ============================================================================
// Basic CRUD Operations
// ============================================================================

test('getActiveSession returns null when no session exists in storage', () => {
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(getActiveSession(), null)
  })
})

test('saveActiveSession/getActiveSession round-trip canonical payload', () => {
  const session = createDefaultMatchState()
  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session), true)
    assert.equal(fileStore.has(CANONICAL_FILENAME), true)

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.status, session.status)
    assert.equal(loadedSession.schemaVersion, session.schemaVersion)
  })
})

test('clearActiveSession removes canonical session and returns true', () => {
  const session = createDefaultMatchState()
  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    saveActiveSession(session)
    assert.equal(fileStore.has(CANONICAL_FILENAME), true)

    assert.equal(clearActiveSession(), true)
    assert.equal(fileStore.has(CANONICAL_FILENAME), false)
    assert.equal(getActiveSession(), null)
  })
})

test('clearActiveSession is idempotent when canonical file is absent', () => {
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(clearActiveSession(), true)
    assert.equal(clearActiveSession(), true)
  })
})

// ============================================================================
// Empty Storage Handling
// ============================================================================

test('getActiveSession returns null from empty storage without errors', () => {
  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(fileStore.has(CANONICAL_FILENAME), false)
    assert.equal(fileStore.has(LEGACY_ACTIVE_FILENAME), false)
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), false)
    assert.equal(getActiveSession(), null)
  })
})

test('updateActiveSession returns null when no active session exists', () => {
  const { mock, fileStore } = createHmFsMock()

  withMockedHmFs(mock, () => {
    const result = updateActiveSession((session) => ({
      ...session,
      status: 'finished'
    }))

    assert.equal(result, null)
    assert.equal(getActiveSession(), null)
    assert.equal(fileStore.has(CANONICAL_FILENAME), false)
  })
})

test('updateActiveSessionPartial returns null when no active session exists', () => {
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    const result = updateActiveSessionPartial({
      setsWon: { teamA: 1, teamB: 0 }
    })

    assert.equal(result, null)
  })
})

// ============================================================================
// Corrupt Payload Handling
// ============================================================================

test('getActiveSession returns null for corrupted canonical JSON payload', () => {
  const { mock } = createHmFsMock({
    [CANONICAL_FILENAME]: '{bad-json-payload'
  })

  withMockedHmFs(mock, () => {
    assert.equal(getActiveSession(), null)
  })
})

test('saveActiveSession returns false for invalid payload and logs warning', () => {
  const { mock } = createHmFsMock()
  const warnings = []
  const originalWarn = console.warn
  console.warn = (...args) => warnings.push(args)

  try {
    withMockedHmFs(mock, () => {
      assert.equal(saveActiveSession({ status: 'active' }), false)
    })
  } finally {
    console.warn = originalWarn
  }

  assert.ok(warnings.length > 0)
})

test('getActiveSession ignores clearly invalid legacy runtime blobs', () => {
  const invalidRuntimeBlob = {
    status: 'active',
    teamA: { points: 'bad-value' },
    teamB: { points: 15 },
    currentSetStatus: { number: 1, teamAGames: 0, teamBGames: 0 },
    setsWon: { teamA: 0, teamB: 0 },
    updatedAt: 1700000010000
  }

  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(invalidRuntimeBlob)
  })

  withMockedHmFs(mock, () => {
    assert.equal(getActiveSession(), null)
  })
})

// ============================================================================
// UTF-8 Label Preservation
// ============================================================================

test('save/get preserves UTF-8 labels including accents', () => {
  const session = createDefaultMatchState()
  session.teams = {
    teamA: { id: 'teamA', label: 'Niño García' },
    teamB: { id: 'teamB', label: 'São Paulo FC' }
  }

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session), true)
    const loadedSession = getActiveSession()

    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.teams.teamA.label, 'Niño García')
    assert.equal(loadedSession.teams.teamB.label, 'São Paulo FC')
  })
})

test('save/get preserves UTF-8 labels including emoji', () => {
  const session = createDefaultMatchState()
  session.teams = {
    teamA: { id: 'teamA', label: 'Team 🎾 Padel' },
    teamB: { id: 'teamB', label: 'Champs 💪' }
  }

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session), true)
    const loadedSession = getActiveSession()

    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.teams.teamA.label, 'Team 🎾 Padel')
    assert.equal(loadedSession.teams.teamB.label, 'Champs 💪')
  })
})

// ============================================================================
// matchStartTime Initialization and Immutability
// ============================================================================

test('saveActiveSession initializes startedAt from createdAt when missing', () => {
  const session = createDefaultMatchState()
  delete session.timing.startedAt

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const loadedSession = getActiveSession()

    assert.notEqual(loadedSession, null)
    assert.notEqual(loadedSession.timing.startedAt, null)
    assert.equal(loadedSession.timing.startedAt, loadedSession.timing.createdAt)
  })
})

test('saveActiveSession preserves existing startedAt unless repair option is enabled', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008000

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const persistedSession = getActiveSession()
    assert.notEqual(persistedSession, null)

    const overwriteAttempt = {
      ...session,
      timing: {
        ...session.timing,
        startedAt: '2030-01-01T00:00:00.000Z'
      }
    }

    assert.equal(
      saveActiveSession(overwriteAttempt, { preserveUpdatedAt: true }),
      true
    )

    const preservedSession = getActiveSession()
    assert.notEqual(preservedSession, null)
    assert.equal(
      preservedSession.timing.startedAt,
      persistedSession.timing.startedAt
    )

    // With repair option, startedAt can be overwritten
    assert.equal(
      saveActiveSession(overwriteAttempt, {
        preserveUpdatedAt: true,
        allowStartTimeRepair: true
      }),
      true
    )

    const repairedSession = getActiveSession()
    assert.notEqual(repairedSession, null)
    assert.equal(repairedSession.timing.startedAt, '2030-01-01T00:00:00.000Z')
  })
})

test('updateActiveSessionPartial preserves startedAt without repair option', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008500

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const persistedSession = getActiveSession()
    assert.notEqual(persistedSession, null)

    const updatedSession = updateActiveSessionPartial(
      {
        timing: {
          ...session.timing,
          startedAt: '2042-01-01T00:00:00.000Z'
        }
      },
      { preserveUpdatedAt: true }
    )

    assert.notEqual(updatedSession, null)
    assert.equal(
      updatedSession.timing.startedAt,
      persistedSession.timing.startedAt
    )

    // With repair option
    const repairedSession = updateActiveSessionPartial(
      {
        timing: {
          ...session.timing,
          startedAt: '2042-01-01T00:00:00.000Z'
        }
      },
      { preserveUpdatedAt: true, allowStartTimeRepair: true }
    )

    assert.notEqual(repairedSession, null)
    assert.equal(repairedSession.timing.startedAt, '2042-01-01T00:00:00.000Z')
  })
})

// ============================================================================
// Update Helpers
// ============================================================================

test('updateActiveSession aborts without persisting when updater returns null', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008199

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const beforeUpdate = getActiveSession()

    const result = updateActiveSession(() => null)
    const afterUpdate = getActiveSession()

    assert.equal(result, null)
    assert.deepEqual(afterUpdate, beforeUpdate)
  })
})

test('updateActiveSession preserves state when updater throws', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008200

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)
    const beforeUpdate = getActiveSession()

    const result = updateActiveSession(() => {
      throw new Error('boom')
    })

    const afterUpdate = getActiveSession()

    assert.equal(result, null)
    assert.deepEqual(afterUpdate, beforeUpdate)
  })
})

test('updateActiveSession prevents reentrant writes inside updater callbacks', () => {
  const session = createDefaultMatchState()
  session.updatedAt = 1700000008500

  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    assert.equal(saveActiveSession(session, { preserveUpdatedAt: true }), true)

    let nestedResult = 'not-run'

    const outerResult = updateActiveSession(
      (s) => {
        nestedResult = updateActiveSessionPartial(
          { setsWon: { teamA: 9, teamB: 0 } },
          { preserveUpdatedAt: true }
        )
        s.setsWon.teamA = 1
        return s
      },
      { preserveUpdatedAt: true }
    )

    assert.equal(nestedResult, null)
    assert.notEqual(outerResult, null)
    assert.equal(outerResult.setsWon.teamA, 1)
  })
})

// ============================================================================
// Legacy Cleanup
// ============================================================================

test('clearActiveSession removes legacy runtime storage to prevent stale state', () => {
  // Complete legacy runtime format with teams configuration
  const legacyRuntimeSession = {
    teams: {
      teamA: { id: 'teamA', label: 'Team A' },
      teamB: { id: 'teamB', label: 'Team B' }
    },
    teamA: { points: 30, games: 2 },
    teamB: { points: 15, games: 1 },
    currentSetStatus: { number: 1, teamAGames: 2, teamBGames: 1 },
    currentSet: 1,
    setsToPlay: 3,
    setsNeededToWin: 2,
    setsWon: { teamA: 0, teamB: 0 },
    setHistory: [],
    status: 'active',
    updatedAt: 1700000005000
  }

  const { mock, fileStore } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(legacyRuntimeSession)
  })

  withMockedHmFs(mock, () => {
    const preClearSession = getActiveSession()
    assert.notEqual(preClearSession, null)
    assert.equal(preClearSession.currentGame.points.teamA, 30)
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), true)

    assert.equal(clearActiveSession(), true)
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), false)
    assert.equal(getActiveSession(), null)
  })
})
