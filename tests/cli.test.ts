import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { buildProgram, main } from '../src/cli.js'
import { loadConfig } from '../src/config.js'

const tempDirs: string[] = []

async function tempConfigDir() {
  const dir = await mkdtemp(join(tmpdir(), 'fpc-cli-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('cli', () => {
  test('version exits successfully under the top-level main handler', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      version?: string
    }
    const stdout = process.stdout.write
    const stderr = process.stderr.write
    const previousExitCode = process.exitCode
    let output = ''
    let errorOutput = ''

    process.exitCode = undefined
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output += chunk.toString()
      return true
    }) as typeof process.stdout.write
    process.stderr.write = ((chunk: string | Uint8Array) => {
      errorOutput += chunk.toString()
      return true
    }) as typeof process.stderr.write

    try {
      await main(['node', 'fpc', '--version'])
    } finally {
      process.stdout.write = stdout
      process.stderr.write = stderr
      process.exitCode = previousExitCode
    }

    expect(output.trim()).toBe(packageJson.version)
    expect(errorOutput).toBe('')
  })

  test('init accepts its local --base-url option and does not store a token by default', async () => {
    const dir = await tempConfigDir()
    const previousConfigDir = process.env.FEEDPIX_CONFIG_DIR
    const stdout = process.stdout.write

    process.env.FEEDPIX_CONFIG_DIR = dir
    process.stdout.write = (() => true) as typeof process.stdout.write

    try {
      const program = buildProgram()
      program.exitOverride()
      await program.parseAsync(['node', 'fpc', '--json', 'init', '--base-url', 'http://localhost:3000'])
    } finally {
      process.stdout.write = stdout
      if (previousConfigDir === undefined) {
        delete process.env.FEEDPIX_CONFIG_DIR
      } else {
        process.env.FEEDPIX_CONFIG_DIR = previousConfigDir
      }
    }

    const state = await loadConfig({ env: {}, configDir: dir })
    expect(state.baseUrl).toEqual({ value: 'http://localhost:3000', source: 'config' })
    expect(state.token.source).toBe('missing')
  })

  test('init can store a token environment variable name without storing a token', async () => {
    const dir = await tempConfigDir()
    const previousConfigDir = process.env.FEEDPIX_CONFIG_DIR
    const stdout = process.stdout.write

    process.env.FEEDPIX_CONFIG_DIR = dir
    process.stdout.write = (() => true) as typeof process.stdout.write

    try {
      const program = buildProgram()
      program.exitOverride()
      await program.parseAsync([
        'node',
        'fpc',
        '--json',
        'init',
        '--token-env-var',
        'CUSTOM_FEEDPIX_TOKEN',
      ])
    } finally {
      process.stdout.write = stdout
      if (previousConfigDir === undefined) {
        delete process.env.FEEDPIX_CONFIG_DIR
      } else {
        process.env.FEEDPIX_CONFIG_DIR = previousConfigDir
      }
    }

    const state = await loadConfig({
      env: {
        CUSTOM_FEEDPIX_TOKEN: 'fmpat_custom_env',
      },
      configDir: dir,
    })
    expect(state.rawConfig).toEqual({
      baseUrl: 'https://feedmob-pixel-dashboard.feedmob.com/',
      tokenEnvVar: 'CUSTOM_FEEDPIX_TOKEN',
    })
    expect(state.token).toEqual({ value: 'fmpat_custom_env', source: 'env' })
  })
})
