import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMatchHistoryEntry,
  MATCH_HISTORY_SCHEMA_VERSION
} from '../utils/match-history-types.js'

// Mock hmFS before importing storage module
const mockFiles = {}
const mockOpenedFiles = new Map()

globalThis.hmFS = {
  O_RDONLY: 0,
  O_WRONLY: 1,
  O_CREAT: 64,
  O_TRUNC: 512,

  open(filename, flags) {
    if (!(filename in mockFiles)) {
      mockFiles[filename] = new Uint8Array(0)
    }
    const fd = mockOpenedFiles.size + 10
    mockOpenedFiles.set(fd, { filename, flags })
    return fd
  },

  close(fd) {
    mockOpenedFiles.delete(fd)
  },

  write(fd, buffer, offset, length) {
    const fileInfo = mockOpenedFiles.get(fd)
    if (!fileInfo) return -1

    const { filename, flags } = fileInfo

    // O_TRUNC (512) flag should truncate the file to zero length before writing
    const shouldTruncate = (flags & 512) !== 0

    const data = new Uint8Array(buffer)

    if (shouldTruncate) {
      // Truncate and write new data
      mockFiles[filename] = new Uint8Array(length)
      mockFiles[filename].set(data.subarray(offset, offset + length), 0)
    } else {
      // Append to existing data
      const existing = mockFiles[filename]
      const newData = new Uint8Array(existing.length + length)
      newData.set(existing, 0)
      newData.set(data.subarray(offset, offset + length), existing.length)
      mockFiles[filename] = newData
    }

    return length
  },

  read(fd, buffer, offset, length) {
    const fileInfo = mockOpenedFiles.get(fd)
    if (!fileInfo) return -1

    const { filename } = fileInfo
    const data = mockFiles[filename]
    if (!data || data.length === 0) return -1

    const bytesToRead = Math.min(length, data.length)
    const view = new Uint8Array(buffer)
    view.set(data.subarray(offset, offset + bytesToRead))
    return bytesToRead
  },

  stat(filename) {
    if (!(filename in mockFiles)) {
      return [null, 2] // ENOENT
    }
    return [{ size: mockFiles[filename].length }, 0]
  },

  remove(filename) {
    if (filename in mockFiles) {
      delete mockFiles[filename]
      return 0
    }
    return -1
  }
}

// Import storage module AFTER mock is set up
import {
  clearMatchHistory,
  getMatchHistoryCount,
  HISTORY_STORAGE_KEY,
  loadMatchById,
  loadMatchHistory,
  MAX_HISTORY_ENTRIES,
  saveMatchToHistory
} from '../utils/match-history-storage.js'

function resetFileSystem() {
  // Clear mock files
  Object.keys(mockFiles).forEach((key) => delete mockFiles[key])
  mockOpenedFiles.clear()
}

test('saveMatchToHistory returns false for non-finished match state', () => {
  resetFileSystem()

  const result = saveMatchToHistory({ status: 'active' })
  assert.equal(result, false)
})

test('saveMatchToHistory returns false for null input', () => {
  resetFileSystem()

  const result = saveMatchToHistory(null)
  assert.equal(result, false)
})

test('saveMatchToHistory with valid finished match saves to history', () => {
  resetFileSystem()

  const matchState = {
    status: 'finished',
    teams: {
      teamA: { label: 'Team Alpha' },
      teamB: { label: 'Team Beta' }
    },
    setsWon: {
      teamA: 2,
      teamB: 1
    },
    setHistory: [
      { setNumber: 1, teamAGames: 6, teamBGames: 3 },
      { setNumber: 2, teamAGames: 4, teamBGames: 6 },
      { setNumber: 3, teamAGames: 6, teamBGames: 2 }
    ],
    completedAt: 1700000001000
  }

  const result = saveMatchToHistory(matchState)
  assert.equal(result, true)

  const history = loadMatchHistory()
  assert.equal(history.length, 1)
  assert.equal(history[0].teamALabel, 'Team Alpha')
  assert.equal(history[0].teamBLabel, 'Team Beta')
  assert.equal(history[0].setsWonTeamA, 2)
  assert.equal(history[0].setsWonTeamB, 1)
  assert.equal(history[0].winnerTeam, 'teamA')
})

test('loadMatchHistory returns empty array when no history exists', () => {
  resetFileSystem()

  const history = loadMatchHistory()
  assert.deepEqual(history, [])
})

test('loadMatchHistory returns empty array for corrupted file', () => {
  resetFileSystem()

  // Write corrupted JSON directly to mock files
  const corruptedData = '{ bad json'
  mockFiles['padel-buddy_match-history.json'] = new TextEncoder().encode(
    corruptedData
  )

  const history = loadMatchHistory()
  assert.deepEqual(history, [])
})

test('loadMatchHistory returns empty array for invalid structure (missing matches array)', () => {
  resetFileSystem()

  const invalidData = JSON.stringify({ schemaVersion: 1 })
  mockFiles['padel-buddy_match-history.json'] = new TextEncoder().encode(
    invalidData
  )

  const history = loadMatchHistory()
  assert.deepEqual(history, [])
})

test('loadMatchById returns null for non-existent match', () => {
  resetFileSystem()

  const match = loadMatchById('non-existent-id')
  assert.equal(match, null)
})

test('loadMatchById returns correct match when it exists', () => {
  resetFileSystem()

  const matchState = {
    status: 'finished',
    teams: {
      teamA: { label: 'Team A' },
      teamB: { label: 'Team B' }
    },
    setsWon: {
      teamA: 1,
      teamB: 0
    },
    setHistory: [],
    completedAt: 1700000001000
  }

  saveMatchToHistory(matchState)

  const history = loadMatchHistory()
  const matchId = history[0].id

  const match = loadMatchById(matchId)
  assert.notEqual(match, null)
  assert.equal(match.teamALabel, 'Team A')
  assert.equal(match.teamBLabel, 'Team B')
})

test('50-match limit is enforced', () => {
  resetFileSystem()

  // Add 51 matches
  for (let i = 0; i < 51; i++) {
    const matchState = {
      status: 'finished',
      teams: {
        teamA: { label: `Team ${i}-A` },
        teamB: { label: `Team ${i}-B` }
      },
      setsWon: {
        teamA: 1,
        teamB: 0
      },
      setHistory: [],
      completedAt: 1700000001000 + i
    }
    saveMatchToHistory(matchState)
  }

  const history = loadMatchHistory()
  assert.equal(history.length, MAX_HISTORY_ENTRIES)
  assert.equal(history.length, 50)

  // Most recent should be first
  assert.equal(history[0].teamALabel, 'Team 50-A')
})

test('clearMatchHistory removes all history', () => {
  resetFileSystem()

  // Add a match
  const matchState = {
    status: 'finished',
    teams: { teamA: { label: 'Team A' }, teamB: { label: 'Team B' } },
    setsWon: { teamA: 1, teamB: 0 },
    setHistory: [],
    completedAt: 1700000001000
  }
  saveMatchToHistory(matchState)

  assert.equal(loadMatchHistory().length, 1)

  const result = clearMatchHistory()
  assert.equal(result, true)

  assert.equal(loadMatchHistory().length, 0)
})

test('getMatchHistoryCount returns correct count', () => {
  resetFileSystem()

  assert.equal(getMatchHistoryCount(), 0)

  const matchState = {
    status: 'finished',
    teams: { teamA: { label: 'Team A' }, teamB: { label: 'Team B' } },
    setsWon: { teamA: 1, teamB: 0 },
    setHistory: [],
    completedAt: 1700000001000
  }
  saveMatchToHistory(matchState)

  assert.equal(getMatchHistoryCount(), 1)
})

test('createMatchHistoryEntry includes setsWonTeamB in returned object', () => {
  const matchState = {
    status: 'finished',
    teams: {
      teamA: { label: 'Team A' },
      teamB: { label: 'Team B' }
    },
    setsWon: {
      teamA: 2,
      teamB: 1
    },
    setHistory: [{ setNumber: 1, teamAGames: 6, teamBGames: 3 }],
    completedAt: 1700000001000
  }

  const entry = createMatchHistoryEntry(matchState)

  assert.notEqual(entry, null)
  assert.equal(entry.setsWonTeamA, 2)
  assert.equal(entry.setsWonTeamB, 1)
})

test('createMatchHistoryEntry returns null for non-finished match', () => {
  const matchState = {
    status: 'active',
    teams: {
      teamA: { label: 'Team A' },
      teamB: { label: 'Team B' }
    }
  }

  const entry = createMatchHistoryEntry(matchState)
  assert.equal(entry, null)
})

test('createMatchHistoryEntry returns null for null input', () => {
  const entry = createMatchHistoryEntry(null)
  assert.equal(entry, null)
})

test('createMatchHistoryEntry handles missing setsWon gracefully', () => {
  const matchState = {
    status: 'finished',
    teams: {
      teamA: { label: 'Team A' },
      teamB: { label: 'Team B' }
    },
    setHistory: []
  }

  const entry = createMatchHistoryEntry(matchState)

  assert.notEqual(entry, null)
  assert.equal(entry.setsWonTeamA, 0)
  assert.equal(entry.setsWonTeamB, 0)
})

test('createMatchHistoryEntry determines winner correctly', () => {
  // Team A wins
  const matchStateA = {
    status: 'finished',
    teams: { teamA: { label: 'Team A' }, teamB: { label: 'Team B' } },
    setsWon: { teamA: 2, teamB: 1 },
    setHistory: []
  }

  const entryA = createMatchHistoryEntry(matchStateA)
  assert.equal(entryA.winnerTeam, 'teamA')

  // Team B wins
  const matchStateB = {
    status: 'finished',
    teams: { teamA: { label: 'Team A' }, teamB: { label: 'Team B' } },
    setsWon: { teamA: 1, teamB: 2 },
    setHistory: []
  }

  const entryB = createMatchHistoryEntry(matchStateB)
  assert.equal(entryB.winnerTeam, 'teamB')

  // Draw
  const matchStateDraw = {
    status: 'finished',
    teams: { teamA: { label: 'Team A' }, teamB: { label: 'Team B' } },
    setsWon: { teamA: 1, teamB: 1 },
    setHistory: []
  }

  const entryDraw = createMatchHistoryEntry(matchStateDraw)
  assert.equal(entryDraw.winnerTeam, null)
})

test('HISTORY_STORAGE_KEY has expected value', () => {
  assert.equal(HISTORY_STORAGE_KEY, 'padel-buddy.match-history')
})

test('MAX_HISTORY_ENTRIES equals 50', () => {
  assert.equal(MAX_HISTORY_ENTRIES, 50)
})
