import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { promisify } from 'node:util'
import { describe, expect, test } from 'vitest'

const execFileAsync = promisify(execFile)

describe('npm package metadata', () => {
  test('supports npm installation with a bin entry and build lifecycle hooks', async () => {
    const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as {
      private?: boolean
      bin?: Record<string, string>
      scripts?: Record<string, string>
      files?: string[]
    }

    expect(packageJson.private).not.toBe(true)
    expect(packageJson.bin).toEqual({ feedpix: './dist/cli.js' })
    expect(packageJson.scripts?.prepare).toBe('npm run build')
    expect(packageJson.scripts?.prepack).toBe('npm run build')
    expect(packageJson.scripts?.postinstall).toBe('node ./scripts/postinstall.cjs')
    expect(packageJson.files).toContain('dist')
    expect(packageJson.files).toContain('scripts/postinstall.cjs')
  })

  test('postinstall message prompts users to configure an API token', async () => {
    const { stdout } = await execFileAsync('node', ['scripts/postinstall.cjs'])

    expect(stdout).toContain('feedpix installed')
    expect(stdout).toContain('feedpix init --base-url')
    expect(stdout).toContain('FEEDMOB_DASHBOARD_API_TOKEN')
    expect(stdout).toContain('--token-env-var')
  })
})
