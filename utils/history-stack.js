/**
 * @template T
 * @typedef HistoryStack
 * @property {(state: T) => T} push
 * @property {() => T | null} pop
 * @property {() => void} clear
 * @property {() => number} size
 * @property {() => boolean} isEmpty
 */

/**
 * @param {unknown} state
 */
function assertValidStateSnapshot(state) {
  if (!state || typeof state !== 'object') {
    throw new TypeError('History stack only accepts object states.')
  }

  assertJsonCloneCompatible(state, 'state', [])
}

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isPlainObject(value) {
  if (!value || Object.prototype.toString.call(value) !== '[object Object]') {
    return false
  }

  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

/**
 * Guard JSON cloning behavior used by deepCopyState.
 *
 * JSON cloning only keeps plain objects, arrays, strings, booleans, and finite numbers.
 * It drops or transforms unsupported values (for example, undefined, functions, symbols,
 * BigInt, NaN/Infinity, Date, Map/Set, class instances). We fail fast here so invalid
 * snapshots do not silently lose data in the history stack.
 *
 * @param {unknown} value
 * @param {string} path
 * @param {object[]} seen
 */
function assertJsonCloneCompatible(value, path, seen) {
  if (value === null) {
    return
  }

  const valueType = typeof value

  if (valueType === 'string' || valueType === 'boolean') {
    return
  }

  if (valueType === 'number') {
    if (!isFinite(value)) {
      throw new TypeError(
        'State snapshot has non-finite number at ' + path + '.'
      )
    }

    return
  }

  if (valueType === 'undefined') {
    throw new TypeError('State snapshot has undefined at ' + path + '.')
  }

  if (valueType === 'function') {
    throw new TypeError('State snapshot has function at ' + path + '.')
  }

  if (valueType === 'symbol') {
    throw new TypeError('State snapshot has symbol at ' + path + '.')
  }

  if (valueType === 'bigint') {
    throw new TypeError('State snapshot has bigint at ' + path + '.')
  }

  if (valueType !== 'object') {
    throw new TypeError('State snapshot has unsupported value at ' + path + '.')
  }

  if (seen.indexOf(value) !== -1) {
    throw new TypeError(
      'State snapshot cannot contain circular references at ' + path + '.'
    )
  }

  seen.push(/** @type {object} */ (value))

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      assertJsonCloneCompatible(value[index], path + '[' + index + ']', seen)
    }

    seen.pop()
    return
  }

  if (!isPlainObject(value)) {
    throw new TypeError(
      'State snapshot only supports plain objects and arrays. Invalid value at ' +
        path +
        '.'
    )
  }

  const keys = Object.keys(value)
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]
    const nextPath = path + '.' + key
    assertJsonCloneCompatible(value[key], nextPath, seen)
  }

  seen.pop()
}

/**
 * @template T
 * @param {T} state
 * @returns {T}
 */
export function deepCopyState(state) {
  assertValidStateSnapshot(state)

  try {
    return JSON.parse(JSON.stringify(state))
  } catch (error) {
    throw new TypeError('State snapshot must be JSON-clone compatible.')
  }
}

/**
 * @template T
 * @returns {HistoryStack<T>}
 */
export function createHistoryStack() {
  /** @type {T[]} */
  const snapshots = []

  return {
    push(state) {
      const snapshot = deepCopyState(state)
      snapshots.push(snapshot)
      return deepCopyState(snapshot)
    },
    pop() {
      if (snapshots.length === 0) {
        return null
      }

      return deepCopyState(snapshots.pop())
    },
    clear() {
      snapshots.length = 0
    },
    size() {
      return snapshots.length
    },
    isEmpty() {
      return snapshots.length === 0
    }
  }
}
