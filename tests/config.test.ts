import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import { defaultConfigDir, envPath, loadConfig, writeConfig } from '../src/config.js'

const tempDirs: string[] = []

async function tempConfigDir() {
  const dir = await mkdtemp(join(tmpdir(), 'fpc-config-'))
  tempDirs.push(dir)
  return dir
}

afterEach(async () => {
  for (const dir of tempDirs.splice(0)) {
    await rm(dir, { recursive: true, force: true })
  }
})

describe('config', () => {
  test('uses ~/.fpc as the default config directory', () => {
    expect(defaultConfigDir({})).toBe(join(homedir(), '.fpc'))
    expect(envPath({}, '/tmp/example-fpc-config')).toBe(join('/tmp/example-fpc-config', '.env'))
  })

  test('supports FPC_CONFIG_DIR and ignores legacy FEEDPIX_CONFIG_DIR', () => {
    expect(defaultConfigDir({ FPC_CONFIG_DIR: '/tmp/fpc-config' })).toBe('/tmp/fpc-config')
    expect(defaultConfigDir({ FEEDPIX_CONFIG_DIR: '/tmp/feedpix-config' })).toBe(join(homedir(), '.fpc'))
    expect(
      defaultConfigDir({
        FPC_CONFIG_DIR: '/tmp/fpc-config',
        FEEDPIX_CONFIG_DIR: '/tmp/feedpix-config',
      }),
    ).toBe('/tmp/fpc-config')
  })

  test('reports the fixed baseUrl and missing token without throwing', async () => {
    const dir = await tempConfigDir()
    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token).toEqual({ value: undefined, source: 'missing' })
    expect(state.configPath).toBe(join(dir, 'config.json'))
  })

  test('ignores baseUrl from config file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://dashboard.example.com', token: 'fmpat_secret' }),
    )

    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token).toEqual({ value: 'fmpat_secret', source: 'config' })
  })

  test('ignores baseUrl environment variables', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://from-config.example.com', token: 'fmpat_config' }),
    )

    const state = await loadConfig({
      env: {
        FEEDMOB_DASHBOARD_BASE_URL: 'https://from-env.example.com',
        FEEDMOB_PIXEL_API_TOKEN: 'fmpat_env',
      },
      configDir: dir,
    })

    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token).toEqual({ value: 'fmpat_env', source: 'env' })
  })

  test('ignores baseUrl from the local env file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, '.env'),
      [
        'FEEDMOB_DASHBOARD_BASE_URL=https://from-env-file.example.com',
        'FEEDMOB_PIXEL_API_TOKEN=fmpat_env_file',
        '',
      ].join('\n'),
    )

    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token).toEqual({ value: 'fmpat_env_file', source: 'env_file' })
  })

  test('process env overrides env file and env file overrides config file for token only', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://from-config.example.com', token: 'fmpat_config' }),
    )
    await writeFile(
      join(dir, '.env'),
      [
        'FEEDMOB_DASHBOARD_BASE_URL=https://from-env-file.example.com',
        'FEEDMOB_PIXEL_API_TOKEN=fmpat_env_file',
        '',
      ].join('\n'),
    )

    const fromEnvFile = await loadConfig({ env: {}, configDir: dir })
    expect(fromEnvFile.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(fromEnvFile.token).toEqual({ value: 'fmpat_env_file', source: 'env_file' })

    const fromProcessEnv = await loadConfig({
      env: {
        FEEDMOB_PIXEL_API_TOKEN: 'fmpat_env',
      },
      configDir: dir,
    })
    expect(fromProcessEnv.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(fromProcessEnv.token).toEqual({ value: 'fmpat_env', source: 'env' })
  })

  test('supports FPC_ENV_FILE for a custom local env file path', async () => {
    const dir = await tempConfigDir()
    const customEnvFile = join(dir, 'fpc.local.env')
    await writeFile(customEnvFile, 'FEEDMOB_PIXEL_API_TOKEN=fmpat_custom_env_file\n')

    const state = await loadConfig({
      env: {
        FPC_ENV_FILE: customEnvFile,
      },
      configDir: dir,
    })

    expect(state.token).toEqual({ value: 'fmpat_custom_env_file', source: 'env_file' })
  })

  test('ignores legacy FEEDPIX_ENV_FILE', async () => {
    const dir = await tempConfigDir()
    const customEnvFile = join(dir, 'fpc.local.env')
    await writeFile(customEnvFile, 'FEEDMOB_PIXEL_API_TOKEN=fmpat_custom_env_file\n')

    expect(envPath({ FEEDPIX_ENV_FILE: customEnvFile }, dir)).toBe(join(dir, '.env'))

    const state = await loadConfig({
      env: {
        FEEDPIX_ENV_FILE: customEnvFile,
      },
      configDir: dir,
    })

    expect(state.token).toEqual({ value: undefined, source: 'missing' })
  })

  test('supports the FPC token alias without allowing a baseUrl alias override', async () => {
    const dir = await tempConfigDir()

    const state = await loadConfig({
      env: {
        FPC_BASE_URL: 'https://from-fpc-env.example.com',
        FPC_TOKEN: 'fmpat_fpc_env',
      },
      configDir: dir,
    })

    expect(state.baseUrl).toEqual({ value: 'https://feedmob-pixel-dashboard.feedmob.com/', source: 'default' })
    expect(state.token).toEqual({ value: 'fmpat_fpc_env', source: 'env' })
  })

  test('ignores legacy FEEDMOB_DASHBOARD_API_TOKEN', async () => {
    const dir = await tempConfigDir()

    const state = await loadConfig({
      env: {
        FEEDMOB_DASHBOARD_API_TOKEN: 'fmpat_old_env',
      },
      configDir: dir,
    })

    expect(state.token).toEqual({ value: undefined, source: 'missing' })
  })

  test('ignores tokenEnvVar from config file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://dashboard.example.com', tokenEnvVar: 'CUSTOM_FPC_TOKEN' }),
    )

    const state = await loadConfig({
      env: {
        CUSTOM_FPC_TOKEN: 'fmpat_custom_env',
      },
      configDir: dir,
    })

    expect(state.token).toEqual({ value: undefined, source: 'missing' })
  })

  test('ignores tokenEnvVar from config file when reading the local env file', async () => {
    const dir = await tempConfigDir()
    await writeFile(
      join(dir, 'config.json'),
      JSON.stringify({ baseUrl: 'https://dashboard.example.com', tokenEnvVar: 'CUSTOM_FPC_TOKEN' }),
    )
    await writeFile(join(dir, '.env'), 'CUSTOM_FPC_TOKEN=fmpat_custom_env_file\n')

    const state = await loadConfig({ env: {}, configDir: dir })

    expect(state.token).toEqual({ value: undefined, source: 'missing' })
  })

  test('writeConfig only stores a token when explicitly provided', async () => {
    const dir = await tempConfigDir()
    await writeConfig({}, { configDir: dir })

    const withoutToken = await loadConfig({ env: {}, configDir: dir })
    expect(withoutToken.token.source).toBe('missing')

    await writeConfig({ token: 'fmpat_secret' }, { configDir: dir })
    const withToken = await loadConfig({ env: {}, configDir: dir })
    expect(withToken.token).toEqual({ value: 'fmpat_secret', source: 'config' })
  })

  test('writeConfig ignores tokenEnvVar input', async () => {
    const dir = await tempConfigDir()
    const staleConfigInput = { tokenEnvVar: 'CUSTOM_FPC_TOKEN' } as unknown as Parameters<typeof writeConfig>[0]

    await writeConfig(
      staleConfigInput,
      { configDir: dir },
    )

    const state = await loadConfig({
      env: {
        CUSTOM_FPC_TOKEN: 'fmpat_custom_env',
      },
      configDir: dir,
    })

    expect(state.rawConfig).toEqual({})
    expect(state.token).toEqual({ value: undefined, source: 'missing' })
  })
})
