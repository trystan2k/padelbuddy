/**
 * Creates an in-memory hmFS mock that implements the file I/O APIs used by
 * storage.js and match-storage.js (open, close, read, write, stat, remove).
 *
 * Storage keys map to filenames via: key.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json'
 * e.g. 'ACTIVE_MATCH_SESSION' -> 'ACTIVE_MATCH_SESSION.json'
 *      'padel-buddy.match-state' -> 'padel-buddy.match-state.json'
 *
 * @param {{ [filename: string]: string }} [initialFiles]
 *   Optional map of filename -> string content to pre-seed the store.
 * @returns {{ mock: object, fileStore: Map<string, Uint8Array> }}
 */
export function createHmFsMock(initialFiles = {}) {
  const fileStore = new Map()
  const openHandles = new Map()
  let nextHandle = 1

  // Pre-seed initial files
  for (const [filename, content] of Object.entries(initialFiles)) {
    fileStore.set(filename, encodeString(content))
  }

  const mock = {
    O_RDONLY: 0,
    O_WRONLY: 1,
    O_RDWR: 2,
    O_CREAT: 64,
    O_TRUNC: 512,
    O_APPEND: 1024,

    stat(filename) {
      if (!fileStore.has(filename)) {
        return [null, -4] // -4 = path not found
      }
      return [{ size: fileStore.get(filename).length, mtime: 0 }, 0]
    },

    open(filename, flags) {
      // O_TRUNC: truncate existing content to zero on open for write
      const isWrite = (flags & 1) !== 0 || (flags & 2) !== 0 // O_WRONLY or O_RDWR
      const isTrunc = (flags & 512) !== 0

      if (isWrite && isTrunc) {
        fileStore.set(filename, new Uint8Array(0))
      }

      const handle = nextHandle++
      openHandles.set(handle, filename)
      return handle
    },

    close(fileId) {
      openHandles.delete(fileId)
    },

    read(fileId, buffer, position, length) {
      const filename = openHandles.get(fileId)
      if (!filename) return -9

      const data = fileStore.get(filename)
      if (!data) return 0

      const view = new Uint8Array(buffer)
      const bytesToRead = Math.min(length, data.length - position)
      for (let i = 0; i < bytesToRead; i++) {
        view[position + i] = data[position + i]
      }
      return 0
    },

    write(fileId, buffer, position, length) {
      const filename = openHandles.get(fileId)
      if (!filename) return -9

      const existing = fileStore.get(filename) || new Uint8Array(0)
      const needed = position + length
      const merged = new Uint8Array(Math.max(existing.length, needed))
      merged.set(existing)

      const view = new Uint8Array(buffer)
      for (let i = 0; i < length; i++) {
        merged[position + i] = view[i]
      }

      fileStore.set(filename, merged)
      return 0
    },

    remove(filename) {
      fileStore.delete(filename)
    }
  }

  return { mock, fileStore }
}

/**
 * Converts a storage key to the filename the storage layer will use.
 * Mirrors keyToFilename() in storage.js / match-storage.js.
 * @param {string} key
 * @returns {string}
 */
export function storageKeyToFilename(key) {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_') + '.json'
}

/**
 * Reads a stored string from the file store by storage key.
 * @param {Map<string, Uint8Array>} fileStore
 * @param {string} key
 * @returns {string | null}
 */
export function readFileStoreKey(fileStore, key) {
  const filename = storageKeyToFilename(key)
  const bytes = fileStore.get(filename)
  if (!bytes || bytes.length === 0) return null
  return decodeString(bytes)
}

function encodeString(str) {
  const bytes = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(
        0xe0 | (code >> 12),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      )
    }
  }
  return new Uint8Array(bytes)
}

function decodeString(bytes) {
  let str = ''
  let i = 0
  while (i < bytes.length) {
    const b = bytes[i]
    if (b < 0x80) {
      str += String.fromCharCode(b)
      i++
    } else if ((b & 0xe0) === 0xc0) {
      str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f))
      i += 2
    } else {
      str += String.fromCharCode(
        ((b & 0x0f) << 12) |
          ((bytes[i + 1] & 0x3f) << 6) |
          (bytes[i + 2] & 0x3f)
      )
      i += 3
    }
  }
  return str
}
