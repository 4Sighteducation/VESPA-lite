/* eslint-disable no-console */
/**
 * Workaround for npm optionalDependencies bug affecting Rollup native binaries.
 *
 * Vercel builds on Linux and may miss `@rollup/rollup-linux-x64-gnu`.
 * Windows builds may miss `@rollup/rollup-win32-x64-msvc`.
 *
 * This script force-installs the correct package WITHOUT saving to package.json/lockfile:
 *   npm i --no-save <pkg>
 */

const { spawnSync } = require('node:child_process')

function runShell(command) {
  const r = spawnSync(command, { stdio: 'inherit', shell: true })
  if (r.error) throw r.error
  if (r.status !== 0) process.exit(r.status ?? 1)
}

const platform = process.platform
const arch = process.arch

let pkg = null
if (platform === 'win32' && arch === 'x64') pkg = '@rollup/rollup-win32-x64-msvc'
if (platform === 'linux' && arch === 'x64') pkg = '@rollup/rollup-linux-x64-gnu'

if (!pkg) {
  console.log(`[ensure-rollup-native] No known Rollup native pkg for ${platform}/${arch}; skipping.`)
  process.exit(0)
}

console.log(`[ensure-rollup-native] Installing ${pkg} (no-save) to avoid npm optionalDependencies bug...`)
runShell(`npm install --no-save --no-audit --no-fund ${pkg}`)

