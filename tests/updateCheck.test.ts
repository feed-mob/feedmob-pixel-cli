import { describe, expect, test } from 'vitest'
import { checkForUpdate, formatUpdateNotice, isNewerVersion } from '../src/updateCheck.js'

describe('update check', () => {
  test('detects when the latest published version is newer', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          'dist-tags': {
            latest: '0.1.6',
          },
        }),
      }) as Response

    await expect(
      checkForUpdate({
        currentVersion: '0.1.5',
        fetchImpl,
        timeoutMs: 1000,
      }),
    ).resolves.toEqual({
      packageName: '@feedmob/feedmob-pixel-cli',
      currentVersion: '0.1.5',
      latestVersion: '0.1.6',
    })
  })

  test('does not report an update when versions match', async () => {
    const fetchImpl: typeof fetch = async () =>
      ({
        ok: true,
        json: async () => ({
          'dist-tags': {
            latest: '0.1.5',
          },
        }),
      }) as Response

    await expect(
      checkForUpdate({
        currentVersion: '0.1.5',
        fetchImpl,
        timeoutMs: 1000,
      }),
    ).resolves.toBeUndefined()
  })

  test('ignores registry failures', async () => {
    const fetchImpl: typeof fetch = async () => {
      throw new Error('registry unavailable')
    }

    await expect(
      checkForUpdate({
        currentVersion: '0.1.5',
        fetchImpl,
        timeoutMs: 1000,
      }),
    ).resolves.toBeUndefined()
  })

  test('compares semver patch, minor, and major versions', () => {
    expect(isNewerVersion('0.1.6', '0.1.5')).toBe(true)
    expect(isNewerVersion('0.2.0', '0.1.9')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.9.9')).toBe(true)
    expect(isNewerVersion('0.1.5', '0.1.5')).toBe(false)
    expect(isNewerVersion('0.1.4', '0.1.5')).toBe(false)
  })

  test('formats the update notice for stderr', () => {
    expect(
      formatUpdateNotice({
        packageName: '@feedmob/feedmob-pixel-cli',
        currentVersion: '0.1.5',
        latestVersion: '0.1.6',
      }),
    ).toContain('fpc update available: 0.1.5 -> 0.1.6')
  })
})
