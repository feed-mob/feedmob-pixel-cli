import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_BASE_URL } from './constants.js'
import { FeedpixError } from './errors.js'

export type ValueSource = 'flag' | 'env' | 'env_file' | 'config' | 'default' | 'missing'

export interface SourceValue {
  value?: string
  source: ValueSource
}

export interface FeedpixConfigFile {
  baseUrl?: string
  token?: string
}

export interface ConfigState {
  configPath: string
  configDir: string
  envPath: string
  rawConfig: FeedpixConfigFile
  baseUrl: SourceValue
  token: SourceValue
}

export interface LoadConfigOptions {
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>
  configDir?: string
  flagToken?: string
}

export interface WriteConfigOptions {
  configDir?: string
}

export function defaultConfigDir(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env): string {
  return clean(env.FPC_CONFIG_DIR) || join(homedir(), '.fpc')
}

export function configPath(configDir = defaultConfigDir()): string {
  return join(configDir, 'config.json')
}

export function envPath(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
  configDir = defaultConfigDir(env),
): string {
  return clean(env.FPC_ENV_FILE) || join(configDir, '.env')
}

export async function loadConfig(options: LoadConfigOptions = {}): Promise<ConfigState> {
  const env = options.env ?? process.env
  const dir = options.configDir ?? defaultConfigDir(env)
  const path = configPath(dir)
  const localEnvPath = envPath(env, dir)
  const rawConfig = await readConfigFile(path)
  const localEnv = await readEnvFile(localEnvPath)

  return {
    configPath: path,
    configDir: dir,
    envPath: localEnvPath,
    rawConfig,
    baseUrl: { value: DEFAULT_BASE_URL, source: 'default' },
    token: sourceValue(
      clean(options.flagToken),
      envValue(env, ...tokenEnvNames()),
      envFileValue(localEnv, ...tokenEnvNames()),
      clean(rawConfig.token),
    ),
  }
}

export async function writeConfig(config: FeedpixConfigFile, options: WriteConfigOptions = {}): Promise<string> {
  const dir = options.configDir ?? defaultConfigDir()
  const path = configPath(dir)
  const existing = await readConfigFile(path)
  const next: FeedpixConfigFile = {
    ...existing,
  }
  delete next.baseUrl
  delete (next as Record<string, unknown>).tokenEnvVar

  if (config.token !== undefined) {
    next.token = requiredClean(config.token, 'token')
  }

  await mkdir(dir, { recursive: true, mode: 0o700 })
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 0o600 })
  return path
}

async function readConfigFile(path: string): Promise<FeedpixConfigFile> {
  let contents: string
  try {
    contents = await readFile(path, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {}
    throw new FeedpixError('config_error', `Could not read config file at ${path}`, { cause: error })
  }

  try {
    const parsed = JSON.parse(contents) as unknown
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new FeedpixError('config_error', `Config file must contain a JSON object: ${path}`)
    }
    return parsed as FeedpixConfigFile
  } catch (error) {
    if (error instanceof FeedpixError) throw error
    throw new FeedpixError('config_error', `Config file is not valid JSON: ${path}`, { cause: error })
  }
}

async function readEnvFile(path: string): Promise<Record<string, string>> {
  let contents: string
  try {
    contents = await readFile(path, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return {}
    throw new FeedpixError('config_error', `Could not read env file at ${path}`, { cause: error })
  }

  return parseEnvFile(contents)
}

export function parseEnvFile(contents: string): Record<string, string> {
  const env: Record<string, string> = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const index = trimmed.indexOf('=')
    if (index <= 0) continue

    const key = trimmed.slice(0, index).trim()
    const rawValue = trimmed.slice(index + 1).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

    env[key] = unquoteEnvValue(rawValue)
  }
  return env
}

function sourceValue(
  flagValue: string | undefined,
  env: SourceValue,
  envFile: SourceValue,
  configValue: string | undefined,
  defaultValue?: string,
): SourceValue {
  if (flagValue) return { value: flagValue, source: 'flag' }
  if (env.value) return env
  if (envFile.value) return envFile
  if (configValue) return { value: configValue, source: 'config' }
  if (defaultValue) return { value: defaultValue, source: 'default' }
  return { value: undefined, source: 'missing' }
}

function envValue(env: NodeJS.ProcessEnv | Record<string, string | undefined>, ...names: string[]): SourceValue {
  for (const name of names) {
    const value = clean(env[name])
    if (value) return { value, source: 'env' }
  }
  return { value: undefined, source: 'missing' }
}

function envFileValue(env: Record<string, string>, ...names: string[]): SourceValue {
  for (const name of names) {
    const value = clean(env[name])
    if (value) return { value, source: 'env_file' }
  }
  return { value: undefined, source: 'missing' }
}

function unquoteEnvValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function requiredClean(value: string | undefined, name: string): string {
  const cleaned = clean(value)
  if (!cleaned) {
    throw new FeedpixError('validation_error', `${name} is required`)
  }
  return cleaned
}

function tokenEnvNames(): string[] {
  return ['FEEDMOB_PIXEL_API_TOKEN', 'FPC_TOKEN', 'FEEDPIX_TOKEN'].filter(
    (name): name is string => Boolean(name),
  )
}

function clean(value: string | undefined): string | undefined {
  const cleaned = value?.trim()
  return cleaned ? cleaned : undefined
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
