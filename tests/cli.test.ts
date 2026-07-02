import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { buildProgram, main } from '../src/cli.js'
import { loadConfig } from '../src/config.js'

const tempDirs: string[] = []

async function tempConfigDir() {
  const dir = await mkdtemp(join(tmpdir(), 'feedpix-cli-'))
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
      await main(['node', 'feedpix', '--version'])
    } finally {
      process.stdout.write = stdout
      process.stderr.write = stderr
      process.exitCode = previousExitCode
    }

    expect(output.trim()).toBe('0.1.0')
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
      await program.parseAsync(['node', 'feedpix', '--json', 'init', '--base-url', 'http://localhost:3000'])
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
})
