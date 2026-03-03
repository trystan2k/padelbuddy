/**
 * Benchmark script to compare JSON.stringify vs object-helpers performance
 * Run with: node scripts/benchmark-object-helpers.js
 */

import { scoresEqual } from '../utils/object-helpers.js'

const SAMPLE_MATCH_STATE = {
  status: 'active',
  setsToPlay: 3,
  setsNeededToWin: 2,
  setsWon: { teamA: 1, teamB: 0 },
  currentSet: { number: 1, games: { teamA: 3, teamB: 2 } },
  currentGame: { points: { teamA: 15, teamB: 30 } },
  teamA: { points: 15, games: 3 },
  teamB: { points: 30, games: 2 },
  currentSetStatus: { number: 1, teamAGames: 3, teamBGames: 2 },
  setHistory: [{ setNumber: 1, teamAGames: 6, teamBGames: 3 }],
  updatedAt: Date.now()
}

// Helper functions (inline for benchmark)
function jsonStringifyCompare(left, right) {
  try {
    return JSON.stringify(left) === JSON.stringify(right)
  } catch {
    return false
  }
}

const ITERATIONS = 10000

console.log('Benchmark: JSON.stringify vs scoresEqual (deep comparison)\n')
console.log(`Iterations: ${ITERATIONS}\n`)

// Benchmark JSON.stringify approach
const jsonStart = performance.now()
for (let i = 0; i < ITERATIONS; i += 1) {
  jsonStringifyCompare(SAMPLE_MATCH_STATE, SAMPLE_MATCH_STATE)
}
const jsonEnd = performance.now()
const jsonTime = jsonEnd - jsonStart

// Benchmark scoresEqual approach (uses deep valuesEqual internally)
const keysStart = performance.now()
for (let i = 0; i < ITERATIONS; i += 1) {
  scoresEqual(SAMPLE_MATCH_STATE, SAMPLE_MATCH_STATE)
}
const keysEnd = performance.now()
const keysTime = keysEnd - keysStart

console.log(`JSON.stringify approach: ${jsonTime.toFixed(2)}ms`)
console.log(`scoresEqual approach:   ${keysTime.toFixed(2)}ms`)
console.log(
  `\nPerformance improvement: ${(((jsonTime - keysTime) / jsonTime) * 100).toFixed(1)}%`
)
