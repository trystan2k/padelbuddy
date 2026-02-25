/**
 * Version synchronization script
 * Syncs version from package.json to app.json and utils/version.js
 * Used by semantic-release during the prepare phase
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Read version from package.json
const packageJsonPath = join(rootDir, 'package.json')
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'))
const version = packageJson.version

console.log(`Syncing version ${version} to app.json and utils/version.js...`)

// Update app.json (only version.name)
const appJsonPath = join(rootDir, 'app.json')
const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'))
appJson.app.version.name = version
writeFileSync(appJsonPath, `${JSON.stringify(appJson, null, 2)}\n`)
console.log(`  ✓ Updated app.json: version.name = ${version}`)

// Update utils/version.js
const versionFilePath = join(rootDir, 'utils/version.js')
const versionFileContent = `/**
 * App version constants
 * Keep in sync with app.json > app.version.name
 */

export const APP_VERSION = '${version}'
`
writeFileSync(versionFilePath, versionFileContent)
console.log(`  ✓ Updated utils/version.js: APP_VERSION = '${version}'`)

console.log('Version sync complete!')
