# Execution Plan: PAD-60 Remove JSON.stringify Hot-Path Comparisons

## Task Analysis

### Main Objective
Remove JSON.stringify usage from hot-path code for performance improvement while maintaining correctness for deep cloning operations that require it.

### Identified Dependencies
- `page/game.js` - State comparison in `isSameMatchState()` (hot-path, called on every score update)
- `utils/active-session-storage.js` - Session comparison in `areSessionsEquivalent()` (cold-path, called during migration)
- `utils/validation.js` - `cloneMatchState()` and `cloneMatchStateOrNull()` (deep cloning - **MUST KEEP**)
- `utils/history-stack.js` - `deepCopyState()` (deep cloning - **MUST KEEP**)

### System Impact
- Performance-critical scoring interaction path in `page/game.js`
- Session migration comparison in `active-session-storage.js`
- No impact on persistence operations (deep cloning preserved)

---

## Chosen Approach

### Proposed Solution
Create a new utility module `utils/object-helpers.js` with optimized shallow comparison and cloning helpers, then replace JSON.stringify-based comparisons in hot-path code while preserving deep cloning semantics where required.

### Justification for Simplicity
1. **Single utility file**: All object helpers in one place for easy maintenance
2. **Targeted replacement**: Only replace comparison operations, not deep cloning
3. **Key-specific comparisons**: Use field-level comparison for state objects instead of full serialization
4. **Backward compatible**: Keep existing API signatures unchanged

### Components to Be Modified/Created

| Component | Action | Rationale |
|-----------|--------|-----------|
| `utils/object-helpers.js` | **CREATE** | New utility module for efficient object operations |
| `page/game.js` | **MODIFY** | Replace `isSameMatchState()` JSON.stringify with `stateKeysEqual()` |
| `utils/active-session-storage.js` | **MODIFY** | Replace `areSessionsEquivalent()` with `shallowEqual()` |
| `utils/validation.js` | **NO CHANGE** | Deep cloning required for persistence |
| `utils/history-stack.js` | **NO CHANGE** | Deep cloning required for history integrity |
| `tests/object-helpers.test.js` | **CREATE** | Unit tests for new helpers |

---

## Implementation Steps

### Phase 1: Create Object Helpers Utility

#### Step 1.1: Create `utils/object-helpers.js`
Create new file with the following exported functions:

```javascript
/**
 * @typedef {Object} MatchStateKeys
 * @property {string[]} state - Keys for match state comparison
 * @property {string[]} session - Keys for session comparison
 */

/** @type {MatchStateKeys} */
const COMPARISON_KEYS = {
  state: [
    'status', 'setsToPlay', 'setsNeededToWin', 'setsWon',
    'currentSet', 'currentGame', 'teamA', 'teamB',
    'currentSetStatus', 'setHistory', 'updatedAt'
  ],
  session: [
    'status', 'setsToPlay', 'setsNeededToWin', 'setsWon',
    'currentSet', 'currentGame', 'setHistory', 'schemaVersion',
    'updatedAt', 'timing', 'teams', 'winnerTeam', 'winner'
  ]
}

/**
 * Creates a shallow clone of an object.
 * @template T
 * @param {T} obj
 * @returns {T}
 * @description Performance: O(n) where n is number of own properties
 * Does NOT clone nested objects - use deepCopyState() for that.
 */
export function shallowClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }
  
  if (Array.isArray(obj)) {
    return /** @type {any} */ (obj.slice())
  }
  
  return { ...obj }
}

/**
 * Performs shallow equality comparison between two objects.
 * @template {Record<string, any>} T
 * @param {T} left
 * @param {T} right
 * @returns {boolean}
 * @description Performance: O(n) where n is number of keys in objects
 * Only compares top-level properties. For nested objects, compares references.
 */
export function shallowEqual(left, right) {
  // Handle identical references
  if (left === right) {
    return true
  }
  
  // Handle null/undefined cases
  if (left === null || right === null) {
    return left === right
  }
  
  if (left === undefined || right === undefined) {
    return left === right
  }
  
  // Quick length check for objects
  if (typeof left !== 'object' || typeof right !== 'object') {
    return left === right
  }
  
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  
  if (leftKeys.length !== rightKeys.length) {
    return false
  }
  
  // Compare each key
  for (let i = 0; i < leftKeys.length; i += 1) {
    const key = leftKeys[i]
    
    if (!Object.hasOwn(right, key)) {
      return false
    }
    
    if (left[key] !== right[key]) {
      return false
    }
  }
  
  return true
}

/**
 * Compares two objects for equality using specific keys.
 * @template {Record<string, any>} T
 * @param {T} left
 * @param {T} right
 * @param {string[]} keys - Array of keys to compare
 * @returns {boolean}
 * @description Performance: O(k) where k is number of keys to compare
 * More efficient than shallowEqual when only specific keys matter.
 */
export function stateKeysEqual(left, right, keys) {
  if (left === right) {
    return true
  }
  
  if (left === null || right === null) {
    return left === right
  }
  
  if (left === undefined || right === undefined) {
    return left === right
  }
  
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i]
    
    if (left[key] !== right[key]) {
      return false
    }
  }
  
  return true
}

/**
 * Compares score-related keys for match state equality.
 * @param {Record<string, any>} leftState
 * @param {Record<string, any>} rightState
 * @returns {boolean}
 * @description Optimized for scoring hot-path - compares only score-relevant keys.
 */
export function scoresEqual(leftState, rightState) {
  return stateKeysEqual(leftState, rightState, COMPARISON_KEYS.state)
}

/**
 * Compares session-related keys for session equality.
 * @param {Record<string, any>} leftSession
 * @param {Record<string, any>} rightSession
 * @returns {boolean}
 * @description Used for session migration comparison.
 */
export function sessionsEqual(leftSession, rightSession) {
  return stateKeysEqual(leftSession, rightSession, COMPARISON_KEYS.session)
}
```

---

### Phase 2: Update Hot-Path Code

#### Step 2.1: Update `page/game.js`

**Location**: Replace `isSameMatchState` function (around line 548)

**Current code**:
```javascript
function isSameMatchState(leftState, rightState) {
  try {
    return JSON.stringify(leftState) === JSON.stringify(rightState)
  } catch {
    return false
  }
}
```

**New code**:
```javascript
import {
  // ... existing imports
  scoresEqual
} from '../utils/object-helpers.js'

function isSameMatchState(leftState, rightState) {
  // Use key-specific comparison for hot-path performance
  // This avoids JSON.stringify overhead while comparing all relevant state keys
  return scoresEqual(leftState, rightState)
}
```

**Rationale**: The `scoresEqual()` function compares all relevant match state keys efficiently without serialization overhead.

---

#### Step 2.2: Update `utils/active-session-storage.js`

**Location**: Replace `areSessionsEquivalent` function (around line 533)

**Current code**:
```javascript
function areSessionsEquivalent(leftSession, rightSession) {
  try {
    return JSON.stringify(leftSession) === JSON.stringify(rightSession)
  } catch {
    return false
  }
}
```

**New code**:
```javascript
import {
  sessionsEqual
} from './object-helpers.js'

function areSessionsEquivalent(leftSession, rightSession) {
  return sessionsEqual(leftSession, rightSession)
}
```

**Rationale**: Session comparison is now more efficient while comparing all session-specific keys.

---

### Phase 3: Preserve Deep Cloning (NO CHANGES)

The following locations MUST remain unchanged as they require deep cloning semantics:

1. **`utils/validation.js`** - `cloneMatchState()` and `cloneMatchStateOrNull()`:
   - Used for persisting match state to storage
   - Deep clone ensures no reference issues

2. **`utils/history-stack.js`** - `deepCopyState()`:
   - History stack requires independent copies
   - Circular reference validation is important for history integrity

---

### Phase 4: Testing

#### Step 4.1: Create `tests/object-helpers.test.js`

```javascript
import {
  shallowClone,
  shallowEqual,
  stateKeysEqual,
  scoresEqual,
  sessionsEqual
} from '../utils/object-helpers.js'

describe('object-helpers', () => {
  describe('shallowClone', () => {
    it('should clone primitive values', () => {
      expect(shallowClone(42)).toBe(42)
      expect(shallowClone('test')).toBe('test')
      expect(shallowClone(true)).toBe(true)
    })
    
    it('should clone null and undefined', () => {
      expect(shallowClone(null)).toBe(null)
      expect(shallowClone(undefined)).toBe(undefined)
    })
    
    it('should shallow clone object', () => {
      const original = { a: 1, b: 2 }
      const cloned = shallowClone(original)
      
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })
    
    it('should shallow clone array', () => {
      const original = [1, 2, 3]
      const cloned = shallowClone(original)
      
      expect(cloned).toEqual(original)
      expect(cloned).not.toBe(original)
    })
    
    it('should NOT deep clone nested objects', () => {
      const original = { a: { b: 1 } }
      const cloned = shallowClone(original)
      
      expect(cloned.a).toBe(original.a) // Same reference!
    })
  })
  
  describe('shallowEqual', () => {
    it('should return true for identical references', () => {
      const obj = { a: 1 }
      expect(shallowEqual(obj, obj)).toBe(true)
    })
    
    it('should return true for equal objects', () => {
      expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true)
    })
    
    it('should return false for different objects', () => {
      expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false)
    })
    
    it('should return false for different key counts', () => {
      expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
    })
    
    it('should handle null/undefined', () => {
      expect(shallowEqual(null, null)).toBe(true)
      expect(shallowEqual(null, {})).toBe(false)
      expect(shallowEqual(undefined, undefined)).toBe(true)
    })
  })
  
  describe('stateKeysEqual', () => {
    it('should compare only specified keys', () => {
      const left = { a: 1, b: 2, c: 3 }
      const right = { a: 1, b: 99, c: 3 }
      
      expect(stateKeysEqual(left, right, ['a', 'c'])).toBe(true)
      expect(stateKeysEqual(left, right, ['a', 'b'])).toBe(false)
    })
    
    it('should handle missing keys', () => {
      const left = { a: 1 }
      const right = { a: 1, b: 2 }
      
      expect(stateKeysEqual(left, right, ['a'])).toBe(true)
    })
  })
  
  describe('scoresEqual', () => {
    it('should compare match state keys', () => {
      const state1 = {
        status: 'active',
        setsToPlay: 3,
        setsWon: { teamA: 1, teamB: 0 },
        teamA: { points: 15 },
        teamB: { points: 0 }
      }
      
      const state2 = {
        status: 'active',
        setsToPlay: 3,
        setsWon: { teamA: 1, teamB: 0 },
        teamA: { points: 15 },
        teamB: { points: 0 },
        // Extra keys should be ignored
        extra: 'ignored'
      }
      
      expect(scoresEqual(state1, state2)).toBe(true)
    })
  })
  
  describe('sessionsEqual', () => {
    it('should compare session keys', () => {
      const session1 = {
        status: 'active',
        updatedAt: 12345,
        timing: { createdAt: '2024-01-01' }
      }
      
      const session2 = {
        status: 'active',
        updatedAt: 12345,
        timing: { createdAt: '2024-01-01' },
        // Extra keys should be ignored
        extra: 'ignored'
      }
      
      expect(sessionsEqual(session1, session2)).toBe(true)
    })
  })
})
```

---

### Phase 5: Benchmarking

#### Step 5.1: Create benchmark script `scripts/benchmark-object-helpers.js`

```javascript
/**
 * Benchmark script to compare JSON.stringify vs object-helpers performance
 * Run with: node scripts/benchmark-object-helpers.js
 */

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
  setHistory: [
    { setNumber: 1, teamAGames: 6, teamBGames: 3 }
  ],
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

function scoresEqualBenchmark(left, right, keys) {
  if (left === right) return true
  if (left === null || right === null) return left === right
  if (left === undefined || right === undefined) return left === right
  
  for (let i = 0; i < keys.length; i += 1) {
    if (left[keys[i]] !== right[keys[i]]) {
      return false
    }
  }
  return true
}

const STATE_KEYS = [
  'status', 'setsToPlay', 'setsNeededToWin', 'setsWon',
  'currentSet', 'currentGame', 'teamA', 'teamB',
  'currentSetStatus', 'setHistory', 'updatedAt'
]

const ITERATIONS = 10000

console.log('Benchmark: JSON.stringify vs key-specific comparison\n')
console.log(`Iterations: ${ITERATIONS}\n`)

// Benchmark JSON.stringify approach
const jsonStart = Date.now()
for (let i = 0; i < ITERATIONS; i += 1) {
  jsonStringifyCompare(SAMPLE_MATCH_STATE, SAMPLE_MATCH_STATE)
}
const jsonEnd = Date.now()
const jsonTime = jsonEnd - jsonStart

// Benchmark key-specific approach
const keysStart = Date.now()
for (let i = 0; i < ITERATIONS; i += 1) {
  scoresEqualBenchmark(SAMPLE_MATCH_STATE, SAMPLE_MATCH_STATE, STATE_KEYS)
}
const keysEnd = Date.now()
const keysTime = keysEnd - keysStart

console.log(`JSON.stringify approach: ${jsonTime}ms`)
console.log(`Key-specific approach:   ${keysTime}ms`)
console.log(`\nPerformance improvement: ${((jsonTime - keysTime) / jsonTime * 100).toFixed(1)}%`)
```

---

## Validation

### Success Criteria
1. ✅ All JSON.stringify comparisons in hot-path replaced with efficient key-specific comparisons
2. ✅ Deep cloning operations unchanged (validation.js, history-stack.js)
3. ✅ Unit tests pass for new object-helpers.js
4. ✅ Benchmark shows measurable performance improvement
5. ✅ No semantic changes to existing behavior

### Checkpoints

#### Pre-Implementation
- [ ] Verify exact line numbers of JSON.stringify usage
- [ ] Confirm deep cloning locations to preserve

#### During Implementation
- [ ] Create `utils/object-helpers.js` with all helper functions
- [ to `page/game.js`
- [ ] ] Add imports Replace `isSameMatchState` implementation
- [ ] Add imports to `utils/active-session-storage.js`
- [ ] Replace `areSessionsEquivalent` implementation
- [ ] Verify NO changes to validation.js deep cloning
- [ ] Verify NO changes to history-stack.js deep cloning

#### Post-Implementation
- [ ] Run existing tests: `npm test`
- [ ] Run new object-helpers tests
- [ ] Run benchmark script
- [ ] Verify on simulator

---

## Edge Cases Handled

| Edge Case | Handling |
|-----------|----------|
| Null values | Both helpers handle null gracefully |
| Undefined values | Both helpers handle undefined gracefully |
| Circular references | Not supported by shallow helpers (acceptable - not needed for state comparison) |
| Different key counts | `shallowEqual` returns false |
| Nested objects | Compared by reference (acceptable for state comparison) |
| Arrays | Cloned by reference in shallowClone (intentional) |

---

## Rollback Plan

If issues arise:
1. Revert changes to `page/game.js` and `utils/active-session-storage.js`
2. Restore original `isSameMatchState` and `areSessionsEquivalent` implementations
3. Keep `utils/object-helpers.js` as it provides reusable utilities

---

## Performance Expectations

Based on typical JSON.stringify overhead:
- **Hot-path (game.js)**: Expected 50-80% improvement in comparison speed
- **Cold-path (active-session-storage.js)**: Lower impact but still improved
- **Memory**: Reduced GC pressure from not creating temporary strings
