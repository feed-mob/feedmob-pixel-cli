import { CLI_VERSION, COMMAND_NAME, NPM_PACKAGE_NAME } from './constants.js'

const NPM_REGISTRY_URL = 'https://registry.npmjs.org'
const DEFAULT_TIMEOUT_MS = 1000

export interface UpdateNotice {
  packageName: string
  currentVersion: string
  latestVersion: string
}

export type UpdateCheck = () => Promise<UpdateNotice | undefined>

export interface CheckForUpdateOptions {
  currentVersion?: string
  packageName?: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export async function checkForUpdate(options: CheckForUpdateOptions = {}): Promise<UpdateNotice | undefined> {
  const currentVersion = options.currentVersion ?? CLI_VERSION
  const packageName = options.packageName ?? NPM_PACKAGE_NAME
  const fetchImpl = options.fetchImpl ?? globalThis.fetch

  if (!fetchImpl) return undefined

  try {
    const latestVersion = await readLatestPublishedVersion({
      packageName,
      fetchImpl,
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    })

    if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) {
      return undefined
    }

    return {
      packageName,
      currentVersion,
      latestVersion,
    }
  } catch {
    return undefined
  }
}

export function formatUpdateNotice(notice: UpdateNotice): string {
  return [
    `${COMMAND_NAME} update available: ${notice.currentVersion} -> ${notice.latestVersion}`,
    `Run: npm install -g ${notice.packageName}@latest`,
  ].join('\n') + '\n'
}

export function isNewerVersion(candidate: string, current: string): boolean {
  const candidateVersion = parseVersion(candidate)
  const currentVersion = parseVersion(current)

  if (!candidateVersion || !currentVersion) return false

  for (let index = 0; index < candidateVersion.length; index += 1) {
    const candidatePart = candidateVersion[index] ?? 0
    const currentPart = currentVersion[index] ?? 0
    if (candidatePart > currentPart) return true
    if (candidatePart < currentPart) return false
  }

  return false
}

interface ReadLatestPublishedVersionOptions {
  packageName: string
  fetchImpl: typeof fetch
  timeoutMs: number
}

async function readLatestPublishedVersion(options: ReadLatestPublishedVersionOptions): Promise<string | undefined> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs)
  timeout.unref?.()

  try {
    const response = await options.fetchImpl(`${NPM_REGISTRY_URL}/${encodeURIComponent(options.packageName)}`, {
      headers: {
        accept: 'application/json',
      },
      signal: controller.signal,
    })

    if (!response.ok) return undefined

    const payload = await response.json()
    return latestVersionFromRegistryPayload(payload)
  } finally {
    clearTimeout(timeout)
  }
}

function latestVersionFromRegistryPayload(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined

  const distTags = payload['dist-tags']
  if (!isRecord(distTags)) return undefined

  return typeof distTags.latest === 'string' ? distTags.latest : undefined
}

function parseVersion(version: string): [number, number, number] | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version.trim())
  if (!match) return undefined

  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
