import assert from 'node:assert/strict'
import test from 'node:test'

import { createInitialMatchState, MATCH_STATUS } from '../utils/match-state.js'
import { SCORE_POINTS } from '../utils/scoring-constants.js'

test('createInitialMatchState returns the expected default structure and values', () => {
  const state = createInitialMatchState()

  assert.deepEqual(state, {
    teams: {
      teamA: {
        id: 'teamA',
        label: 'Team A'
      },
      teamB: {
        id: 'teamB',
        label: 'Team B'
      }
    },
    teamA: {
      points: SCORE_POINTS.LOVE,
      games: 0
    },
    teamB: {
      points: SCORE_POINTS.LOVE,
      games: 0
    },
    currentSetStatus: {
      number: 1,
      teamAGames: 0,
      teamBGames: 0
    },
    currentSet: 1,
    status: MATCH_STATUS.ACTIVE,
    updatedAt: 0
  })
})

test('createInitialMatchState uses custom updatedAt and keeps snapshots independent', () => {
  const first = createInitialMatchState(12345)
  const second = createInitialMatchState(99999)

  assert.equal(first.updatedAt, 12345)
  assert.equal(second.updatedAt, 99999)

  first.teamA.games = 1
  first.teams.teamA.label = 'Blue Team'
  first.currentSetStatus.teamAGames = 2

  assert.equal(second.teamA.games, 0)
  assert.equal(second.teams.teamA.label, 'Team A')
  assert.equal(second.currentSetStatus.teamAGames, 0)
})
