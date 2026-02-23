import {
  deserializeMatchState,
  isMatchState,
  STORAGE_KEY as SCHEMA_STORAGE_KEY,
  serializeMatchState
} from './match-state-schema.js'

export const ACTIVE_MATCH_SESSION_STORAGE_KEY = SCHEMA_STORAGE_KEY

// ---------------------------------------------------------------------------
// UTF-8 encode / decode helpers
// (TextEncoder/TextDecoder are not available in Zepp OS v1.0)
// ---------------------------------------------------------------------------

/**
 * Encode a JS string to a Uint8Array of UTF-8 bytes.
 * @param {string} str
 * @returns {Uint8Array}
 */
function encodeUtf8(str) {
  const bytes = []

  for (let i = 0; i < str.length; i += 1) {
    let code = str.charCodeAt(i)

    // Handle UTF-16 surrogate pairs
    if (code >= 0xd800 && code <= 0xdbff) {
      const hi = code
      const lo = str.charCodeAt(i + 1)

      if (lo >= 0xdc00 && lo <= 0xdfff) {
        code = ((hi - 0xd800) << 10) + (lo - 0xdc00) + 0x10000
        i += 1
      }
    }

    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else if (code < 0x10000) {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    } else {
      bytes.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }

  return new Uint8Array(bytes)
}

/**
 * Decode a Uint8Array of UTF-8 bytes to a JS string.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function decodeUtf8(bytes) {
  let str = ''
  let i = 0

  while (i < bytes.length) {
    const byte = bytes[i]
    let code

    if (byte < 0x80) {
      code = byte
      i += 1
    } else if ((byte & 0xe0) === 0xc0) {
      code = ((byte & 0x1f) << 6) | (bytes[i + 1] & 0x3f)
      i += 2
    } else if ((byte & 0xf0) === 0xe0) {
      code =
        ((byte & 0x0f) << 12) |
        ((bytes[i + 1] & 0x3f) << 6) |
        (bytes[i + 2] & 0x3f)
      i += 3
    } else {
      code =
        ((byte & 0x07) << 18) |
        ((bytes[i + 1] & 0x3f) << 12) |
        ((bytes[i + 2] & 0x3f) << 6) |
        (bytes[i + 3] & 0x3f)
      i += 4
    }

    if (code >= 0x10000) {
      const offset = code - 0x10000
      str += String.fromCharCode(
        0xd800 + (offset >> 10),
        0xdc00 + (offset & 0x3ff)
      )
    } else {
      str += String.fromCharCode(code)
    }
  }

  return str
}

// ---------------------------------------------------------------------------
// hmFS flag constants (POSIX values — used as fallback if hmFS.O_* are undefined)
// ---------------------------------------------------------------------------
const O_RDONLY = 0
const O_WRONLY = 1
const O_CREAT = 64 // 0x40
const O_TRUNC = 512 // 0x200

// ---------------------------------------------------------------------------
// Persistent file storage backed by hmFS /data directory
// ---------------------------------------------------------------------------

/**
 * Converts a storage key to a safe filename for the /data directory.
 * Replaces characters that are unsafe in filenames with underscores.
 * @param {string} key
 * @returns {string}
 */
function keyToFilename(key) {
  return `${key.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`
}

/**
 * Returns a storage adapter backed by hmFS file I/O (persistent /data directory).
 * Data written here survives system reboots, unlike SysProSetChars which is
 * documented as "temporary — system reboot will clear".
 *
 * Falls back to null if hmFS is unavailable (e.g. in tests or app-side context).
 *
 * @returns {{ setItem: (key: string, value: string) => void, getItem: (key: string) => (string | null), removeItem: (key: string) => void } | null}
 */
function resolveRuntimeStorage() {
  if (
    typeof hmFS !== 'undefined' &&
    typeof hmFS.open === 'function' &&
    typeof hmFS.close === 'function' &&
    typeof hmFS.read === 'function' &&
    typeof hmFS.write === 'function'
  ) {
    return {
      setItem(key, value) {
        let fileId = -1

        try {
          const filename = keyToFilename(key)
          const encoded = encodeUtf8(value)
          // O_WRONLY | O_CREAT | O_TRUNC : create if not exists, truncate to 0
          const writeFlags =
            (typeof hmFS.O_WRONLY === 'number' ? hmFS.O_WRONLY : O_WRONLY) |
            (typeof hmFS.O_CREAT === 'number' ? hmFS.O_CREAT : O_CREAT) |
            (typeof hmFS.O_TRUNC === 'number' ? hmFS.O_TRUNC : O_TRUNC)
          fileId = hmFS.open(filename, writeFlags)

          if (fileId < 0) {
            return
          }

          hmFS.write(fileId, encoded.buffer, 0, encoded.length)
        } catch {
          // Ignore write errors to keep app runtime stable.
        } finally {
          if (fileId >= 0) {
            try {
              hmFS.close(fileId)
            } catch {
              // Ignore close errors.
            }
          }
        }
      },

      getItem(key) {
        let fileId = -1

        try {
          const filename = keyToFilename(key)

          // Get file size via stat so we can allocate the right buffer.
          // hmFS.stat returns [stat_info, error_code] per the v1.0 API spec.
          const [statInfo, statErr] = hmFS.stat(filename)

          if (statErr !== 0 || !statInfo || statInfo.size <= 0) {
            return null
          }

          const size = statInfo.size
          const readFlag =
            typeof hmFS.O_RDONLY === 'number' ? hmFS.O_RDONLY : O_RDONLY
          fileId = hmFS.open(filename, readFlag)

          if (fileId < 0) {
            return null
          }

          const buffer = new Uint8Array(size)
          const readResult = hmFS.read(fileId, buffer.buffer, 0, size)

          if (readResult < 0) {
            return null
          }

          const str = decodeUtf8(buffer)
          return str.length > 0 ? str : null
        } catch {
          return null
        } finally {
          if (fileId >= 0) {
            try {
              hmFS.close(fileId)
            } catch {
              // Ignore close errors.
            }
          }
        }
      },

      removeItem(key) {
        try {
          const filename = keyToFilename(key)
          hmFS.remove(filename)
        } catch {
          // Ignore delete errors to keep app runtime stable.
        }
      }
    }
  }

  return null
}

export class ZeppOsStorageAdapter {
  constructor() {
    /** @type {{ setItem: (key: string, value: string) => void, getItem: (key: string) => (string | null), removeItem: (key: string) => void } | null} */
    this.storage = resolveRuntimeStorage()
  }

  /**
   * @param {string} key
   * @param {string} value
   */
  save(key, value) {
    const storage = this.storage || resolveRuntimeStorage()

    if (!storage) {
      return
    }

    if (!this.storage) {
      this.storage = storage
    }

    try {
      storage.setItem(key, value)
    } catch {
      // Ignore persistence errors to keep app runtime stable.
    }
  }

  /**
   * @param {string} key
   * @returns {string | null}
   */
  load(key) {
    const storage = this.storage || resolveRuntimeStorage()

    if (!storage) {
      return null
    }

    if (!this.storage) {
      this.storage = storage
    }

    try {
      return storage.getItem(key)
    } catch {
      return null
    }
  }

  /**
   * @param {string} key
   */
  clear(key) {
    const storage = this.storage || resolveRuntimeStorage()

    if (!storage) {
      return
    }

    if (!this.storage) {
      this.storage = storage
    }

    try {
      storage.removeItem(key)
    } catch {
      // Ignore persistence errors to keep app runtime stable.
    }
  }
}

export class MatchStorage {
  /**
   * @param {ZeppOsStorageAdapter} [adapter]
   */
  constructor(adapter = new ZeppOsStorageAdapter()) {
    this.adapter = adapter
  }

  /**
   * @param {import('./match-state-schema.js').MatchState} state
   */
  saveMatchState(state) {
    if (!isMatchState(state)) {
      return
    }

    state.updatedAt = Date.now()

    try {
      this.adapter.save(
        ACTIVE_MATCH_SESSION_STORAGE_KEY,
        serializeMatchState(state)
      )
    } catch {
      // Ignore persistence errors to keep app runtime stable.
    }
  }

  /**
   * @returns {import('./match-state-schema.js').MatchState | null}
   */
  loadMatchState() {
    try {
      const serializedState = this.adapter.load(
        ACTIVE_MATCH_SESSION_STORAGE_KEY
      )

      if (typeof serializedState !== 'string' || serializedState.length === 0) {
        return null
      }

      const loadedState = deserializeMatchState(serializedState)

      return isMatchState(loadedState) ? loadedState : null
    } catch {
      return null
    }
  }

  clearMatchState() {
    try {
      this.adapter.clear(ACTIVE_MATCH_SESSION_STORAGE_KEY)
    } catch {
      // Ignore persistence errors to keep app runtime stable.
    }
  }
}

export const matchStorage = new MatchStorage()

/**
 * @param {import('./match-state-schema.js').MatchState} state
 */
export function saveMatchState(state) {
  matchStorage.saveMatchState(state)
}

/**
 * @returns {import('./match-state-schema.js').MatchState | null}
 */
export function loadMatchState() {
  return matchStorage.loadMatchState()
}

export function clearMatchState() {
  matchStorage.clearMatchState()
}
