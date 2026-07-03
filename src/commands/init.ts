import type { Command } from 'commander'
import { buildDashboardUrl } from '../client.js'
import { writeConfig } from '../config.js'
import { FeedpixError } from '../errors.js'
import { writeJson } from '../output.js'
import { jsonEnabled, runAction } from './shared.js'

export function addInitCommand(program: Command): void {
  program
    .command('init')
    .description('Write ~/.feedpix/config.json with a Dashboard base URL')
    .requiredOption('--base-url <url>', 'Dashboard origin, for example https://feedmob-pixel-dashboard.feedmob.com')
    .option('--token <token>', 'store a Dashboard API token in config; prefer env vars for normal use')
    .option('--token-env-var <name>', 'store the environment variable name to read the API token from')
    .action(async (options, command) => {
      await runAction(command, async () => {
        if (options.token && options.tokenEnvVar) {
          throw new FeedpixError('validation_error', 'Use either --token or --token-env-var, not both.')
        }
        validateBaseUrl(options.baseUrl)
        const path = await writeConfig({
          baseUrl: options.baseUrl,
          ...(options.token ? { token: options.token } : {}),
          ...(options.tokenEnvVar ? { tokenEnvVar: options.tokenEnvVar } : {}),
        })

        if (options.token) {
          process.stderr.write('Stored token in user config. Do not commit, paste, or log this file.\n')
        }

        if (jsonEnabled(command)) {
          writeJson({
            path,
            baseUrl: options.baseUrl,
            tokenStored: Boolean(options.token),
            tokenEnvVar: options.tokenEnvVar,
          })
        } else {
          process.stdout.write(`Wrote ${path}\n`)
          process.stdout.write(`baseUrl: ${options.baseUrl}\n`)
          if (options.tokenEnvVar) {
            process.stdout.write(`token: read from $${options.tokenEnvVar}\n`)
          } else if (!options.token) {
            process.stdout.write('token: not stored; set FEEDMOB_DASHBOARD_API_TOKEN for auth\n')
          }
        }
      })
    })
}

function validateBaseUrl(baseUrl: string): void {
  buildDashboardUrl(baseUrl, '/api/v1/dashboard_api/advertisers')
}
