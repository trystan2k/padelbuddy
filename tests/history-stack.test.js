import assert from 'node:assert/strict'
import test from 'node:test'

import { createHistoryStack } from '../utils/history-stack.js'

function createSampleState() {
  return {
    teamA: {
      points: 15,
      games: 2
    },
    teamB: {
      points: 30,
      games: 1
    },
    currentSetStatus: {
      number: 1,
      teamAGames: 2,
      teamBGames: 1
    }
  }
}

test('history stack pop returns null when empty', () => {
  const history = createHistoryStack()

  assert.equal(history.size(), 0)
  assert.equal(history.isEmpty(), true)
  assert.equal(history.pop(), null)
  assert.equal(history.isEmpty(), true)
})

test('history stack push stores deep-copied snapshot and pop returns immutable value', () => {
  const history = createHistoryStack()
  const state = createSampleState()

  const pushedSnapshot = history.push(state)

  state.teamA.points = 40
  state.currentSetStatus.teamAGames = 5

  pushedSnapshot.teamB.games = 99
  pushedSnapshot.currentSetStatus.teamBGames = 99

  const popped = history.pop()

  assert.deepEqual(popped, {
    teamA: {
      points: 15,
      games: 2
    },
    teamB: {
      points: 30,
      games: 1
    },
    currentSetStatus: {
      number: 1,
      teamAGames: 2,
      teamBGames: 1
    }
  })

  assert.equal(history.isEmpty(), true)
  assert.equal(history.size(), 0)
})

test('history stack pop follows LIFO ordering', () => {
  const history = createHistoryStack()

  history.push({ value: 1 })
  history.push({ value: 2 })

  assert.deepEqual(history.pop(), { value: 2 })
  assert.deepEqual(history.pop(), { value: 1 })
  assert.equal(history.pop(), null)
})
