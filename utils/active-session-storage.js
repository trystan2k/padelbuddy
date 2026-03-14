import {
  STORAGE_KEY as ACTIVE_SESSION_STORAGE_KEY,
  CURRENT_SCHEMA_VERSION,
  deserializeMatchSession,
  isMatchState,
  MATCH_STATUS,
  readTimestampCandidate,
  toIsoTimestampSafe
} from './match-state-schema.js'
import { deleteState, loadState, saveState } from './persistence.js'
import {
  cloneMatchStateOrNull as cloneSession,
  isRecord,
  toNonNegativeIntegerWithRequiredFallback as toNonNegativeInteger
} from './validation.js'

/**
 * @typedef {import('./match-state-schema.js').MatchState} ActiveSession
 */

const LOG_PREFIX = '[active-session-storage]'
let isAtomicUpdateInFlight = false

function log(level, message, context) {
  if (typeof console === 'undefined') {
    return
  }

  const method =
    level === 'warn' && typeof console.warn === 'function'
      ? console.warn
      : typeof console.log === 'function'
        ? console.log
        : null

  if (!method) {
    return
  }

  if (typeof context === 'undefined') {
    method(`${LOG_PREFIX} ${message}`)
    return
  }

  method(`${LOG_PREFIX} ${message}`, context)
}

function reviveStoredSession(value) {
  if (typeof value === 'string') {
    return deserializeMatchSession(value)
  }

  if (isMatchState(value)) {
    return value
  }

  if (!isRecord(value)) {
    return null
  }

  try {
    return deserializeMatchSession(JSON.stringify(value))
  } catch {
    return null
  }
}

/**
 * @returns {ActiveSession | null}
 */
export function getActiveSession() {
  return loadState(ACTIVE_SESSION_STORAGE_KEY, {
    fallback: null,
    revive: reviveStoredSession,
    validate: isMatchState
  })
}

/**
 * @param {ActiveSession} session
 * @param {{ preserveUpdatedAt?: boolean, allowStartTimeRepair?: boolean }} [options]
 * @returns {boolean}
 */
export function saveActiveSession(session, options = {}) {
  if (!isMatchState(session)) {
    log('warn', 'refusing to save invalid active session')
    return false
  }

  const updatedAt =
    options.preserveUpdatedAt === true
      ? toNonNegativeInteger(session.updatedAt, Date.now())
      : Date.now()

  const existingSession = getActiveSession()
  const nextSession = applySessionWriteNormalization({
    session,
    existingSession,
    updatedAt,
    allowStartTimeRepair: options.allowStartTimeRepair === true
  })

  const didSave = saveState(ACTIVE_SESSION_STORAGE_KEY, nextSession, {
    validate: isMatchState
  })

  if (!didSave) {
    log('warn', 'failed to persist active session to LocalStorage', {
      key: ACTIVE_SESSION_STORAGE_KEY
    })
  }

  return didSave
}

/**
 * @param {{
 *   session: ActiveSession,
 *   existingSession: ActiveSession | null,
 *   updatedAt: number,
 *   allowStartTimeRepair: boolean
 * }} params
 * @returns {ActiveSession}
 */
function applySessionWriteNormalization(params) {
  const updatedAt = toNonNegativeInteger(params.updatedAt, Date.now())
  const updatedAtIso = toIsoTimestampSafe(updatedAt)

  const existingTiming = isRecord(params.existingSession?.timing)
    ? params.existingSession.timing
    : null
  const sessionTiming = isRecord(params.session?.timing)
    ? params.session.timing
    : null

  const createdAtTimestamp =
    readTimestampCandidate(sessionTiming?.createdAt) ??
    readTimestampCandidate(existingTiming?.createdAt) ??
    updatedAt

  const existingStartedAtTimestamp = readTimestampCandidate(
    existingTiming?.startedAt
  )
  const requestedStartedAtTimestamp = readTimestampCandidate(
    sessionTiming?.startedAt
  )

  let nextStartedAtTimestamp = requestedStartedAtTimestamp

  if (
    existingStartedAtTimestamp !== null &&
    params.allowStartTimeRepair !== true
  ) {
    nextStartedAtTimestamp = existingStartedAtTimestamp

    if (
      requestedStartedAtTimestamp !== null &&
      requestedStartedAtTimestamp !== existingStartedAtTimestamp
    ) {
      log('warn', 'ignored attempt to overwrite match start time', {
        previousStartedAt: toIsoTimestampSafe(existingStartedAtTimestamp),
        requestedStartedAt: toIsoTimestampSafe(requestedStartedAtTimestamp)
      })
    }
  }

  if (nextStartedAtTimestamp === null) {
    nextStartedAtTimestamp = createdAtTimestamp
  }

  const finishedAt =
    params.session.status === MATCH_STATUS.FINISHED
      ? toIsoTimestampSafe(
          readTimestampCandidate(sessionTiming?.finishedAt) ?? updatedAt
        )
      : null

  return {
    ...params.session,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt,
    timing: {
      ...(sessionTiming ?? {}),
      createdAt: toIsoTimestampSafe(createdAtTimestamp),
      updatedAt: updatedAtIso,
      startedAt: toIsoTimestampSafe(nextStartedAtTimestamp),
      finishedAt
    }
  }
}

/**
 * @param {(session: ActiveSession) => ActiveSession | null | void} updaterFn
 * @param {{ preserveUpdatedAt?: boolean, allowStartTimeRepair?: boolean }} [options]
 * @returns {ActiveSession | null}
 */
export function updateActiveSession(updaterFn, options = {}) {
  if (typeof updaterFn !== 'function') {
    log('warn', 'refusing to update active session with non-function updater')
    return null
  }

  return withAtomicUpdateLock(() => {
    const currentSession = getActiveSession()

    if (!currentSession) {
      return null
    }

    const currentSnapshot = cloneSession(currentSession)

    if (!currentSnapshot) {
      return null
    }

    let updaterResult

    try {
      updaterResult = updaterFn(currentSnapshot)
    } catch {
      log('warn', 'active session updater threw')
      return null
    }

    if (updaterResult === null) {
      return null
    }

    const nextSession =
      typeof updaterResult === 'undefined' ? currentSnapshot : updaterResult

    if (!isMatchState(nextSession)) {
      log('warn', 'active session updater returned invalid state')
      return null
    }

    const persistedSnapshot = cloneSession(nextSession)

    if (!persistedSnapshot) {
      return null
    }

    if (!saveActiveSession(persistedSnapshot, options)) {
      return null
    }

    return getActiveSession()
  })
}

/**
 * @param {Partial<ActiveSession>} patch
 * @param {{ preserveUpdatedAt?: boolean, allowStartTimeRepair?: boolean }} [options]
 * @returns {ActiveSession | null}
 */
export function updateActiveSessionPartial(patch, options = {}) {
  if (!isRecord(patch)) {
    log('warn', 'refusing to apply non-object active session patch')
    return null
  }

  const patchSnapshot = cloneSession(patch)

  if (!isRecord(patchSnapshot)) {
    return null
  }

  return updateActiveSession(
    (session) => ({
      ...session,
      ...patchSnapshot
    }),
    options
  )
}

/**
 * @returns {boolean}
 */
export function clearActiveSession() {
  return deleteState(ACTIVE_SESSION_STORAGE_KEY)
}

function withAtomicUpdateLock(callback) {
  if (isAtomicUpdateInFlight) {
    log('warn', 'ignored nested active session update')
    return null
  }

  isAtomicUpdateInFlight = true

  try {
    return callback()
  } finally {
    isAtomicUpdateInFlight = false
  }
}
