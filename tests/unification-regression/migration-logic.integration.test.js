/**
 * Unification Regression Suite - Migration Logic Integration Tests
 *
 * Validates migration behavior including:
 * - Legacy session migration precedence
 * - Migration idempotency
 * - Canonical preservation of timing fields
 * - Source selection logic
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

import {
  getActiveSession,
  migrateLegacySessions,
  saveActiveSession
} from '../../utils/active-session-storage.js'
import {
  createDefaultMatchState,
  STORAGE_KEY as LEGACY_ACTIVE_SESSION_STORAGE_KEY
} from '../../utils/match-state-schema.js'
import { MATCH_STATE_STORAGE_KEY } from '../../utils/storage.js'
import {
  CANONICAL_FILENAME,
  createHmFsMock,
  storageKeyToFilename,
  withMockedHmFs
} from '../helpers/hmfs-mock.js'

const LEGACY_ACTIVE_FILENAME = storageKeyToFilename(
  LEGACY_ACTIVE_SESSION_STORAGE_KEY
)
const LEGACY_RUNTIME_FILENAME = storageKeyToFilename(MATCH_STATE_STORAGE_KEY)

const FIXTURE_DIR = resolve(process.cwd(), 'tests/fixtures/legacy-sessions')

function loadLegacyFixture(fixtureName) {
  const fixturePath = resolve(FIXTURE_DIR, fixtureName)
  return JSON.parse(readFileSync(fixturePath, 'utf8'))
}

// ============================================================================
// Migration Precedence
// ============================================================================

test('migrateLegacySessions selects newest legacy source by updatedAt', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const canonicalLegacySession = loadLegacyFixture(
    'legacy-canonical-session.json'
  )

  // Make runtime session newer
  runtimeLegacySession.updatedAt = 1700000005000
  canonicalLegacySession.updatedAt = 1700000004000

  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession),
    [LEGACY_ACTIVE_FILENAME]: JSON.stringify(canonicalLegacySession)
  })

  withMockedHmFs(mock, () => {
    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, true)
    assert.equal(migration.source, 'legacy-runtime-storage')

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.updatedAt, 1700000005000)
  })
})

test('migrateLegacySessions prefers canonical over legacy when timestamps equal', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const canonicalLegacySession = loadLegacyFixture(
    'legacy-canonical-session.json'
  )

  runtimeLegacySession.updatedAt = 1700000005000
  canonicalLegacySession.updatedAt = 1700000005000

  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession),
    [LEGACY_ACTIVE_FILENAME]: JSON.stringify(canonicalLegacySession)
  })

  withMockedHmFs(mock, () => {
    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, true)
    assert.equal(migration.source, 'legacy-active-file')

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.teams.teamA.label, 'Equipo Nino')
  })
})

test('migrateLegacySessions uses runtime legacy when only source available', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession)
  })

  withMockedHmFs(mock, () => {
    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, true)
    assert.equal(migration.source, 'legacy-runtime-storage')

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.currentGame.points.teamA, 50)
  })
})

// ============================================================================
// Migration Idempotency
// ============================================================================

test('migrateLegacySessions is idempotent - second call returns not migrated', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const canonicalLegacySession = loadLegacyFixture(
    'legacy-canonical-session.json'
  )

  const { mock, fileStore } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession),
    [LEGACY_ACTIVE_FILENAME]: JSON.stringify(canonicalLegacySession)
  })

  withMockedHmFs(mock, () => {
    const firstMigration = migrateLegacySessions()

    assert.equal(firstMigration.migrated, true)
    assert.equal(firstMigration.source, 'legacy-active-file')
    assert.equal(firstMigration.didCleanupLegacy, true)

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)

    // Verify legacy files were cleaned up
    assert.equal(fileStore.has(LEGACY_ACTIVE_FILENAME), false)
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), false)

    // Second migration should be a no-op
    const secondMigration = migrateLegacySessions()
    assert.equal(secondMigration.migrated, false)
    assert.equal(secondMigration.source, 'canonical')
    assert.equal(secondMigration.reason, null)
  })
})

test('migrateLegacySessions returns no-legacy-session when nothing to migrate', () => {
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, false)
    assert.equal(migration.source, null)
    assert.equal(migration.reason, 'no-legacy-session')
  })
})

test('migrateLegacySessions skips when canonical already exists and is valid', () => {
  const session = createDefaultMatchState()
  const { mock } = createHmFsMock()

  withMockedHmFs(mock, () => {
    saveActiveSession(session)

    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, false)
    assert.equal(migration.source, 'canonical')
  })
})

// ============================================================================
// Timing Field Preservation
// ============================================================================

test('migrateLegacySessions derives startedAt from earliest reliable legacy timestamp', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  runtimeLegacySession.updatedAt = 1700000005000
  runtimeLegacySession.matchStartTime = 1700000001200
  runtimeLegacySession.startedAt = 1700000001500
  runtimeLegacySession.created_at = 1700000001000

  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession)
  })

  withMockedHmFs(mock, () => {
    const migration = migrateLegacySessions()

    assert.equal(migration.migrated, true)
    assert.equal(migration.source, 'legacy-runtime-storage')

    const loadedSession = getActiveSession()
    assert.notEqual(loadedSession, null)
    // Should pick matchStartTime as earliest (1200)
    assert.equal(loadedSession.timing.createdAt, '2023-11-14T22:13:21.000Z')
    assert.equal(loadedSession.timing.startedAt, '2023-11-14T22:13:21.200Z')
  })
})

test('migrateLegacySessions preserves timing fields on subsequent writes', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  runtimeLegacySession.created_at = 1700000000000
  runtimeLegacySession.matchStartTime = 1700000000100

  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession)
  })

  withMockedHmFs(mock, () => {
    migrateLegacySessions()

    const migratedSession = getActiveSession()
    assert.notEqual(migratedSession, null)
    const expectedStartedAt = migratedSession.timing.startedAt

    // Attempt to overwrite startedAt
    assert.equal(
      saveActiveSession(
        {
          ...migratedSession,
          timing: {
            ...migratedSession.timing,
            startedAt: '2030-01-01T00:00:00.000Z'
          }
        },
        { preserveUpdatedAt: true }
      ),
      true
    )

    const persistedSession = getActiveSession()
    assert.notEqual(persistedSession, null)
    assert.equal(persistedSession.timing.startedAt, expectedStartedAt)
  })
})

// ============================================================================
// Legacy Cleanup
// ============================================================================

test('migrateLegacySessions cleans up all legacy storage artifacts', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const canonicalLegacySession = loadLegacyFixture(
    'legacy-canonical-session.json'
  )

  const { mock, fileStore } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession),
    [LEGACY_ACTIVE_FILENAME]: JSON.stringify(canonicalLegacySession)
  })

  withMockedHmFs(mock, () => {
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), true)
    assert.equal(fileStore.has(LEGACY_ACTIVE_FILENAME), true)

    const migration = migrateLegacySessions()

    assert.equal(migration.didCleanupLegacy, true)
    assert.equal(fileStore.has(LEGACY_RUNTIME_FILENAME), false)
    assert.equal(fileStore.has(LEGACY_ACTIVE_FILENAME), false)
    assert.equal(fileStore.has(CANONICAL_FILENAME), true)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

test('getActiveSession falls back to legacy runtime when canonical missing', () => {
  const runtimeLegacySession = loadLegacyFixture('legacy-runtime-session.json')
  const { mock } = createHmFsMock({
    [LEGACY_RUNTIME_FILENAME]: JSON.stringify(runtimeLegacySession)
  })

  withMockedHmFs(mock, () => {
    const loadedSession = getActiveSession()

    assert.notEqual(loadedSession, null)
    assert.equal(loadedSession.currentGame.points.teamA, 50)
    assert.equal(loadedSession.setsToPlay, 3)
    assert.equal(loadedSession.setsNeededToWin, 2)
  })
})

test('getActiveSession returns null for all corrupted sources', () => {
  const { mock } = createHmFsMock({
    [CANONICAL_FILENAME]: '{bad',
    [LEGACY_ACTIVE_FILENAME]: '{also-bad',
    [LEGACY_RUNTIME_FILENAME]: '{runtime-bad'
  })

  withMockedHmFs(mock, () => {
    assert.equal(getActiveSession(), null)
  })
})
