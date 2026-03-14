import assert from 'node:assert/strict'
import test from 'node:test'

import {
  clearMatchHistory,
  deleteMatchFromHistory,
  getMatchHistoryCount,
  HISTORY_STORAGE_KEY,
  loadMatchById,
  loadMatchHistory,
  MAX_HISTORY_ENTRIES,
  saveMatchToHistory
} from '../utils/match-history-storage.js'
import {
  createLocalStorageMock,
  withMockLocalStorage
} from './helpers/local-storage-mock.js'

function createFinishedMatchState(index = 0) {
  return {
    status: 'finished',
    teams: {
      teamA: { label: `Team ${index}-A` },
      teamB: { label: `Team ${index}-B` }
    },
    setsWon: {
      teamA: 1,
      teamB: 0
    },
    setHistory: [],
    completedAt: 1700000001000 + index
  }
}

test('saveMatchToHistory rejects non-finished state', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveMatchToHistory({ status: 'active' }), false)
    assert.equal(loadMatchHistory().length, 0)
  })
})

test('saveMatchToHistory stores finished matches in LocalStorage', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    assert.equal(saveMatchToHistory(createFinishedMatchState(1)), true)
    assert.equal(has(HISTORY_STORAGE_KEY), true)

    const history = loadMatchHistory()
    assert.equal(history.length, 1)
    assert.equal(history[0].teamALabel, 'Team 1-A')
    assert.equal(history[0].winnerTeam, 'teamA')
  })
})

test('loadMatchHistory returns empty array for missing or invalid payloads', () => {
  const { storage: emptyStorage } = createLocalStorageMock()

  withMockLocalStorage(emptyStorage, () => {
    assert.deepEqual(loadMatchHistory(), [])
  })

  const { storage: invalidStorage } = createLocalStorageMock({
    [HISTORY_STORAGE_KEY]:
      '__padel_buddy_platform_adapters__:{"schemaVersion":1}'
  })

  withMockLocalStorage(invalidStorage, () => {
    assert.deepEqual(loadMatchHistory(), [])
  })
})

test('loadMatchById returns a stored match by id', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    saveMatchToHistory(createFinishedMatchState(2))

    const history = loadMatchHistory()
    const matchId = history[0].id

    assert.equal(loadMatchById(matchId)?.teamBLabel, 'Team 2-B')
    assert.equal(loadMatchById('missing-id'), null)
  })
})

test('history keeps only the most recent 50 entries', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    for (let index = 0; index <= MAX_HISTORY_ENTRIES; index += 1) {
      saveMatchToHistory(createFinishedMatchState(index))
    }

    const history = loadMatchHistory()
    assert.equal(history.length, MAX_HISTORY_ENTRIES)
    assert.equal(history[0].teamALabel, 'Team 50-A')
    assert.equal(history.at(-1)?.teamALabel, 'Team 1-A')
    assert.equal(getMatchHistoryCount(), MAX_HISTORY_ENTRIES)
  })
})

test('deleteMatchFromHistory removes only the requested match', () => {
  const { storage } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    const originalDateNow = Date.now
    let timestamp = 1700000003000

    Date.now = () => {
      timestamp += 1
      return timestamp
    }

    try {
      saveMatchToHistory(createFinishedMatchState(3))
      saveMatchToHistory(createFinishedMatchState(4))
    } finally {
      Date.now = originalDateNow
    }

    const history = loadMatchHistory()
    const removedMatchId = history[0].id

    assert.equal(deleteMatchFromHistory(removedMatchId), true)
    assert.equal(deleteMatchFromHistory('missing-id'), false)
    assert.equal(loadMatchHistory().length, 1)
  })
})

test('clearMatchHistory removes all stored history', () => {
  const { storage, has } = createLocalStorageMock()

  withMockLocalStorage(storage, () => {
    saveMatchToHistory(createFinishedMatchState(5))
    assert.equal(has(HISTORY_STORAGE_KEY), true)

    assert.equal(clearMatchHistory(), true)
    assert.equal(has(HISTORY_STORAGE_KEY), false)
    assert.deepEqual(loadMatchHistory(), [])
  })
})
