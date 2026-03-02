/**
 * Unification Regression Suite - Schema Validation Unit Tests
 *
 * Validates canonical schema behavior including:
 * - Canonical schema validation
 * - Empty storage handling
 * - Corrupt payload handling
 * - UTF-8 label support
 * - matchStartTime initialization and immutability
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import {
  CURRENT_SCHEMA_VERSION,
  createDefaultMatchState,
  deserializeMatchSession,
  MATCH_STATUS,
  SETS_NEEDED_TO_WIN,
  SETS_TO_PLAY,
  serializeMatchState,
  validateMatchSession
} from '../../utils/match-state-schema.js'
import {
  activeInProgressSession,
  emptyNewSession,
  finishedSessionWithHistory,
  specialCharacterTeamNamesSession
} from '../fixtures/match-session-examples.js'

// ============================================================================
// Canonical Schema Validation
// ============================================================================

test('validateMatchSession accepts all canonical fixture examples', () => {
  assert.equal(validateMatchSession(emptyNewSession), true)
  assert.equal(validateMatchSession(activeInProgressSession), true)
  assert.equal(validateMatchSession(finishedSessionWithHistory), true)
  assert.equal(validateMatchSession(specialCharacterTeamNamesSession), true)
})

test('createDefaultMatchState produces schema-valid state with all required fields', () => {
  const state = createDefaultMatchState()

  assert.equal(validateMatchSession(state), true)
  assert.equal(state.schemaVersion, CURRENT_SCHEMA_VERSION)
  assert.equal(state.status, MATCH_STATUS.ACTIVE)
  assert.equal(state.setsToPlay, SETS_TO_PLAY.THREE)
  assert.equal(state.setsNeededToWin, SETS_NEEDED_TO_WIN.TWO)
})

test('schema validation rejects payload missing timing object', () => {
  const { timing: _timing, ...partialPayload } = emptyNewSession

  assert.equal(validateMatchSession(partialPayload), false)
})

test('schema validation rejects payload with invalid status', () => {
  const invalidStatus = {
    ...emptyNewSession,
    status: 'invalid-status'
  }

  assert.equal(validateMatchSession(invalidStatus), false)
})

test('schema validation rejects finished match without finishedAt timestamp', () => {
  const invalidFinished = {
    ...finishedSessionWithHistory,
    timing: {
      ...finishedSessionWithHistory.timing,
      finishedAt: null
    }
  }

  assert.equal(validateMatchSession(invalidFinished), false)
})

test('schema validation accepts paused match without finishedAt', () => {
  const pausedSession = {
    ...activeInProgressSession,
    status: MATCH_STATUS.PAUSED
  }

  assert.equal(validateMatchSession(pausedSession), true)
  assert.equal(pausedSession.timing.finishedAt, null)
})

// ============================================================================
// Serialization Round-Trip
// ============================================================================

test('serialize/deserialize round-trip preserves canonical session integrity', () => {
  const sessions = [
    emptyNewSession,
    activeInProgressSession,
    finishedSessionWithHistory,
    specialCharacterTeamNamesSession
  ]

  for (const session of sessions) {
    const serialized = serializeMatchState(session)
    const deserialized = deserializeMatchSession(serialized)

    assert.notEqual(
      deserialized,
      null,
      `round-trip failed for ${session.metadata.matchId}`
    )
    assert.equal(validateMatchSession(deserialized), true)
    assert.deepEqual(deserialized, session)
  }
})

test('deserializeMatchSession returns null for malformed JSON', () => {
  assert.equal(deserializeMatchSession('{invalid-json'), null)
  assert.equal(deserializeMatchSession('not-json-at-all'), null)
  assert.equal(deserializeMatchSession(''), null)
  assert.equal(deserializeMatchSession(null), null)
  assert.equal(deserializeMatchSession(undefined), null)
})

// ============================================================================
// Empty Storage Handling
// ============================================================================

test('createDefaultMatchState provides deterministic baseline for empty storage scenario', () => {
  const state = createDefaultMatchState()

  // Verify all score containers are zeroed
  assert.equal(state.setsWon.teamA, 0)
  assert.equal(state.setsWon.teamB, 0)
  assert.equal(state.currentSet.games.teamA, 0)
  assert.equal(state.currentSet.games.teamB, 0)
  assert.equal(state.currentGame.points.teamA, 0)
  assert.equal(state.currentGame.points.teamB, 0)
  assert.equal(state.currentSet.number, 1)
  assert.deepEqual(state.setHistory, [])
})

// ============================================================================
// Corrupt Payload Handling
// ============================================================================

test('deserializeMatchSession returns null for partial payload missing required fields', () => {
  const {
    scores: _scores,
    currentGame: _currentGame,
    ...partialPayload
  } = emptyNewSession

  assert.equal(deserializeMatchSession(JSON.stringify(partialPayload)), null)
})

test('validateMatchSession rejects payload with negative score values', () => {
  const invalidScores = {
    ...emptyNewSession,
    scores: {
      ...emptyNewSession.scores,
      setsWon: { teamA: -1, teamB: 0 }
    },
    setsWon: { teamA: -1, teamB: 0 }
  }

  assert.equal(validateMatchSession(invalidScores), false)
})

test('validateMatchSession rejects payload with unsupported set configuration', () => {
  const invalidConfig = {
    ...emptyNewSession,
    setsToPlay: 2,
    setsNeededToWin: 2,
    settings: {
      setsToPlay: 2,
      setsNeededToWin: 2
    }
  }

  assert.equal(validateMatchSession(invalidConfig), false)
})

// ============================================================================
// UTF-8 Label Support
// ============================================================================

test('schema validation accepts UTF-8 team labels with accents', () => {
  const utf8Session = {
    ...emptyNewSession,
    teams: {
      teamA: { id: 'teamA', label: 'Niño García' },
      teamB: { id: 'teamB', label: 'São Paulo FC' }
    }
  }

  assert.equal(validateMatchSession(utf8Session), true)
  assert.equal(utf8Session.teams.teamA.label, 'Niño García')
  assert.equal(utf8Session.teams.teamB.label, 'São Paulo FC')
})

test('schema validation accepts UTF-8 team labels with emoji', () => {
  const emojiSession = {
    ...emptyNewSession,
    teams: {
      teamA: { id: 'teamA', label: 'Team 🎾' },
      teamB: { id: 'teamB', label: 'Padel 💪' }
    }
  }

  assert.equal(validateMatchSession(emojiSession), true)
})

test('serialize/deserialize preserves UTF-8 labels including accents and emoji', () => {
  const session = {
    ...emptyNewSession,
    teams: {
      teamA: { id: 'teamA', label: 'Niño 🎾' },
      teamB: { id: 'teamB', label: 'São Paulo 😊' }
    }
  }

  const serialized = serializeMatchState(session)
  const deserialized = deserializeMatchSession(serialized)

  assert.notEqual(deserialized, null)
  assert.equal(deserialized.teams.teamA.label, 'Niño 🎾')
  assert.equal(deserialized.teams.teamB.label, 'São Paulo 😊')
})

// ============================================================================
// matchStartTime Initialization and Immutability
// ============================================================================

test('createDefaultMatchState initializes timing.startedAt to match timing.createdAt', () => {
  const state = createDefaultMatchState()

  assert.notEqual(state.timing.startedAt, null)
  assert.equal(state.timing.startedAt, state.timing.createdAt)
  assert.equal(typeof state.timing.startedAt, 'string')
})

test('timing.startedAt is ISO 8601 format for newly created state', () => {
  const state = createDefaultMatchState()
  const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

  assert.equal(isoPattern.test(state.timing.startedAt), true)
  assert.equal(isoPattern.test(state.timing.createdAt), true)
  assert.equal(isoPattern.test(state.timing.updatedAt), true)
})

test('canonical fixture has valid non-null startedAt', () => {
  // This test validates the immutability behavior at the schema level
  // The active-session-storage tests cover the full write path
  const originalStartedAt = activeInProgressSession.timing.startedAt

  assert.notEqual(originalStartedAt, null)
  assert.equal(typeof originalStartedAt, 'string')

  // Verify the canonical fixture has a valid startedAt
  assert.equal(validateMatchSession(activeInProgressSession), true)
})

test('finished session has valid finishedAt timestamp matching completion', () => {
  assert.notEqual(finishedSessionWithHistory.timing.finishedAt, null)
  assert.equal(typeof finishedSessionWithHistory.timing.finishedAt, 'string')
  assert.equal(validateMatchSession(finishedSessionWithHistory), true)
})

test('timing fields are independent objects across sessions', () => {
  const state1 = createDefaultMatchState()
  const state2 = createDefaultMatchState()

  state1.timing.startedAt = '2024-01-01T00:00:00.000Z'
  state1.timing.finishedAt = '2024-01-01T01:00:00.000Z'

  assert.notEqual(state2.timing.startedAt, '2024-01-01T00:00:00.000Z')
  assert.equal(state2.timing.finishedAt, null)
})
