import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { toProjectFileUrl } from './helpers/project-paths.js'

const MIGRATED_PAGE_FILES = [
  'page/index.js',
  'page/setup.js',
  'page/game.js',
  'page/summary.js',
  'page/history.js',
  'page/history-detail.js',
  'page/settings.js',
  'page/game-settings.js'
]

test('migrated pages do not use standard JavaScript timers', async () => {
  for (const relativePath of MIGRATED_PAGE_FILES) {
    const source = await readFile(toProjectFileUrl(relativePath), 'utf8')

    assert.equal(
      /\bsetTimeout\b/.test(source),
      false,
      `${relativePath} uses setTimeout`
    )
    assert.equal(
      /\bsetInterval\b/.test(source),
      false,
      `${relativePath} uses setInterval`
    )
    assert.equal(
      /\bclearTimeout\b/.test(source),
      false,
      `${relativePath} uses clearTimeout`
    )
    assert.equal(
      /\bclearInterval\b/.test(source),
      false,
      `${relativePath} uses clearInterval`
    )
  }
})

test('migrated pages avoid direct runtime navigation and sensor APIs', async () => {
  for (const relativePath of MIGRATED_PAGE_FILES) {
    const source = await readFile(toProjectFileUrl(relativePath), 'utf8')

    assert.equal(
      /\bhmApp\./.test(source),
      false,
      `${relativePath} uses hmApp directly`
    )
    assert.equal(
      /\bhmSensor\b/.test(source),
      false,
      `${relativePath} uses hmSensor directly`
    )
    assert.equal(
      /\bhmSetting\b/.test(source),
      false,
      `${relativePath} uses hmSetting directly`
    )
    assert.equal(
      /\.(registerGestureEvent|unregisterGestureEvent)\b/.test(source),
      false,
      `${relativePath} uses legacy gesture APIs directly`
    )
  }
})
