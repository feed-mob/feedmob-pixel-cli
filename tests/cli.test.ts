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

  test('top-level help does not advertise the legacy --json option', () => {
    expect(buildProgram().helpInformation()).not.toContain('--json')
  })

  test('init does not write a baseUrl by default', async () => {
    const dir = await tempConfigDir()
    const previousConfigDir = process.env.FPC_CONFIG_DIR
    const stdout = process.stdout.write
    let output = ''

    process.env.FPC_CONFIG_DIR = dir
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output += chunk.toString()
      return true
    }) as typeof process.stdout.write

    try {
      const program = buildProgram()
      program.exitOverride()
      await program.parseAsync(['node', 'fpc', 'init'])
    } finally {
      process.stdout.write = stdout
      if (previousConfigDir === undefined) {
        delete process.env.FPC_CONFIG_DIR
      } else {
        process.env.FPC_CONFIG_DIR = previousConfigDir
      }
    }

    const state = await loadConfig({ env: {}, configDir: dir })
    expect(state.rawConfig).toEqual({})
    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token.source).toBe('missing')
    expect(JSON.parse(output)).toMatchObject({
      path: join(dir, 'config.json'),
      tokenStored: false,
    })
    expect(JSON.parse(output)).not.toHaveProperty('baseUrl')
  })

  test('init rejects the removed --base-url option', async () => {
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
      await main(['node', 'fpc', 'init', '--base-url', 'http://localhost:3000'])
    } finally {
      process.stdout.write = stdout
      process.stderr.write = stderr
      process.exitCode = previousExitCode
    }

    expect(JSON.parse(output)).toEqual({
      error: {
        type: 'validation_error',
        message: "error: unknown option '--base-url'",
      },
    })
    expect(errorOutput).toContain("unknown option '--base-url'")
  })

  test('init help does not advertise the removed --token-env-var option', () => {
    const initCommand = buildProgram().commands.find((command) => command.name() === 'init')

    expect(initCommand?.helpInformation()).not.toContain('--token-env-var')
  })

  test('init rejects the removed --token-env-var option', async () => {
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
      await main(['node', 'fpc', 'init', '--token-env-var', 'CUSTOM_FPC_TOKEN'])
    } finally {
      process.stdout.write = stdout
      process.stderr.write = stderr
      process.exitCode = previousExitCode
    }

    expect(JSON.parse(output)).toEqual({
      error: {
        type: 'validation_error',
        message: "error: unknown option '--token-env-var'",
      },
    })
    expect(errorOutput).toContain("unknown option '--token-env-var'")
  })

  test('keeps --json as a hidden no-op for existing command snippets', async () => {
    const dir = await tempConfigDir()
    const previousConfigDir = process.env.FPC_CONFIG_DIR
    const stdout = process.stdout.write
    let output = ''

    process.env.FPC_CONFIG_DIR = dir
    process.stdout.write = ((chunk: string | Uint8Array) => {
      output += chunk.toString()
      return true
    }) as typeof process.stdout.write

    try {
      const program = buildProgram()
      program.exitOverride()
      await program.parseAsync(['node', 'fpc', '--json', 'init'])
    } finally {
      process.stdout.write = stdout
      if (previousConfigDir === undefined) {
        delete process.env.FPC_CONFIG_DIR
      } else {
        process.env.FPC_CONFIG_DIR = previousConfigDir
      }
    }

    expect(JSON.parse(output)).toMatchObject({
      path: join(dir, 'config.json'),
      tokenStored: false,
    })
  })
})
