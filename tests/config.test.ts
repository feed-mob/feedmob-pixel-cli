import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { loadConfig, writeConfig } from '../src/config.js'

const tempDirs: string[] = []

async function tempConfigDir() {
  const dir = await mkdtemp(join(tmpdir(), 'feedpix-config-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('config', () => {
  test('reports missing baseUrl and token without throwing', async () => {
    const dir = await tempConfigDir()
    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: undefined, source: 'missing' })
    expect(state.token).toEqual({ value: undefined, source: 'missing' })
    expect(state.configPath).toBe(join(dir, 'config.json'))
  })

  test('loads baseUrl and token from config file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://dashboard.example.com', token: 'fmpat_secret' }),
    )

    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: 'https://dashboard.example.com', source: 'config' })
    expect(state.token).toEqual({ value: 'fmpat_secret', source: 'config' })
  })

  test('environment variables take precedence over config file values', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://from-config.example.com', token: 'fmpat_config' }),
    )

    const state = await loadConfig({
      env: {
        FEEDMOB_DASHBOARD_BASE_URL: 'https://from-env.example.com',
        FEEDMOB_DASHBOARD_API_TOKEN: 'fmpat_env',
      },
      configDir: dir,
    })

    expect(state.baseUrl).toEqual({ value: 'https://from-env.example.com', source: 'env' })
    expect(state.token).toEqual({ value: 'fmpat_env', source: 'env' })
  })

  test('loads baseUrl and token from the local env file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, '.env'),
      [
        'FEEDMOB_DASHBOARD_BASE_URL=https://from-env-file.example.com',
        'FEEDMOB_DASHBOARD_API_TOKEN=fmpat_env_file',
        '',
      ].join('\n'),
    )

    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: 'https://from-env-file.example.com', source: 'env_file' })
    expect(state.token).toEqual({ value: 'fmpat_env_file', source: 'env_file' })
  })

  test('process env overrides env file and env file overrides config file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://from-config.example.com', token: 'fmpat_config' }),
    )
    await writeFile(
      join(dir, '.env'),
      [
        'FEEDMOB_DASHBOARD_BASE_URL=https://from-env-file.example.com',
        'FEEDMOB_DASHBOARD_API_TOKEN=fmpat_env_file',
        '',
      ].join('\n'),
    )

    const fromEnvFile = await loadConfig({ env: {}, configDir: dir })
    expect(fromEnvFile.baseUrl).toEqual({ value: 'https://from-env-file.example.com', source: 'env_file' })
    expect(fromEnvFile.token).toEqual({ value: 'fmpat_env_file', source: 'env_file' })

    const fromProcessEnv = await loadConfig({
      env: {
        FEEDMOB_DASHBOARD_API_TOKEN: 'fmpat_env',
      },
      configDir: dir,
    })
    expect(fromProcessEnv.baseUrl).toEqual({ value: 'https://from-env-file.example.com', source: 'env_file' })
    expect(fromProcessEnv.token).toEqual({ value: 'fmpat_env', source: 'env' })
  })

  test('supports FEEDPIX_ENV_FILE for a custom local env file path', async () => {
    const dir = await tempConfigDir()
    const customEnvFile = join(dir, 'feedpix.local.env')
    await writeFile(customEnvFile, 'FEEDMOB_DASHBOARD_API_TOKEN=fmpat_custom_env_file\n')

    const state = await loadConfig({
      env: {
        FEEDPIX_ENV_FILE: customEnvFile,
      },
      configDir: dir,
    })

    expect(state.token).toEqual({ value: 'fmpat_custom_env_file', source: 'env_file' })
  })

  test('writeConfig only stores a token when explicitly provided', async () => {
    const dir = await tempConfigDir()
    await writeConfig({ baseUrl: 'https://dashboard.example.com' }, { configDir: dir })

    const withoutToken = await loadConfig({ env: {}, configDir: dir })
    expect(withoutToken.token.source).toBe('missing')

    await writeConfig({ baseUrl: 'https://dashboard.example.com', token: 'fmpat_secret' }, { configDir: dir })
    const withToken = await loadConfig({ env: {}, configDir: dir })
    expect(withToken.token).toEqual({ value: 'fmpat_secret', source: 'config' })
  })
})
