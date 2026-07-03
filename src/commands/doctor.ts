import type { Command } from 'commander'
import { DashboardClient } from '../client.js'
import { CLI_VERSION, COMMAND_NAME } from '../constants.js'
import { loadConfig } from '../config.js'
import { toFeedpixError } from '../errors.js'
import { writeJson } from '../output.js'
import { jsonEnabled, runAction } from './shared.js'

interface DoctorPayload {
  cli: {
    name: string
    version: string
  }
  config: {
    path: string
    envPath: string
    baseUrl: {
      configured: boolean
      source: string
      value?: string
    }
    token: {
      present: boolean
      source: string
    }
    tokenEnvVar?: string
  }
  setup: {
    ok: boolean
    missing: string[]
  }
  checks: {
    metadata: {
      ok: boolean
      skipped?: boolean
      reason?: string
      status?: number
      error?: {
        type: string
        message: string
        status?: number
      }
    }
  }
}

export function addDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Check config, auth, version, and Dashboard API reachability')
    .action(async (_options, command) => {
      await runAction(command, async () => {
        const options = command.optsWithGlobals() as { baseUrl?: string; token?: string }
        const config = await loadConfig({
          flagBaseUrl: options.baseUrl,
          flagToken: options.token,
        })
        const missing = [
          ...(config.baseUrl.value ? [] : ['baseUrl']),
          ...(config.token.value ? [] : ['token']),
        ]

        const metadata = await checkMetadata(config.baseUrl.value, config.token.value)
        const payload: DoctorPayload = {
          cli: {
            name: COMMAND_NAME,
            version: CLI_VERSION,
          },
          config: {
            path: config.configPath,
            envPath: config.envPath,
            baseUrl: {
              configured: Boolean(config.baseUrl.value),
              source: config.baseUrl.source,
              ...(config.baseUrl.value ? { value: config.baseUrl.value } : {}),
            },
            token: {
              present: Boolean(config.token.value),
              source: config.token.source,
            },
            ...(config.rawConfig.tokenEnvVar ? { tokenEnvVar: config.rawConfig.tokenEnvVar } : {}),
          },
          setup: {
            ok: missing.length === 0 && metadata.ok,
            missing,
          },
          checks: {
            metadata,
          },
        }

        if (jsonEnabled(command)) {
          writeJson(payload)
        } else {
          printDoctor(payload)
        }
      })
    })
}

async function checkMetadata(baseUrl?: string, token?: string): Promise<DoctorPayload['checks']['metadata']> {
  if (!baseUrl) return { ok: false, skipped: true, reason: 'missing_base_url' }
  if (!token) return { ok: false, skipped: true, reason: 'missing_token' }

  const client = new DashboardClient({ baseUrl, token })
  try {
    const response = await client.getJson('/api/v1/dashboard_api/advertisers')
    return { ok: true, status: response.status }
  } catch (error) {
    const feedpixError = toFeedpixError(error)
    return {
      ok: false,
      status: feedpixError.status,
      error: {
        type: feedpixError.type,
        message: feedpixError.message,
        ...(feedpixError.status !== undefined ? { status: feedpixError.status } : {}),
      },
    }
  }
}

function printDoctor(payload: DoctorPayload): void {
  process.stdout.write(`${payload.cli.name} ${payload.cli.version}\n`)
  process.stdout.write(`config: ${payload.config.path}\n`)
  process.stdout.write(`env file: ${payload.config.envPath}\n`)
  process.stdout.write(
    `baseUrl: ${payload.config.baseUrl.configured ? payload.config.baseUrl.value : 'missing'} (${payload.config.baseUrl.source})\n`,
  )
  process.stdout.write(`token: ${payload.config.token.present ? 'present' : 'missing'} (${payload.config.token.source})\n`)
  if (payload.config.tokenEnvVar) {
    process.stdout.write(`tokenEnvVar: ${payload.config.tokenEnvVar}\n`)
  }
  process.stdout.write(
    `metadata: ${payload.checks.metadata.ok ? 'ok' : payload.checks.metadata.reason ?? payload.checks.metadata.error?.message ?? 'failed'}\n`,
  )
  if (payload.setup.missing.length > 0) {
    process.stdout.write(`missing setup: ${payload.setup.missing.join(', ')}\n`)
  }
}
