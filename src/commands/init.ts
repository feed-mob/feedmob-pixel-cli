import type { Command } from 'commander'
import { writeConfig } from '../config.js'
import { FeedpixError } from '../errors.js'
import { writeJson } from '../output.js'
import { runAction } from './shared.js'

export function addInitCommand(program: Command): void {
  program
    .command('init')
    .description('Write ~/.fpc/config.json with token environment preferences')
    .option('--token <token>', 'store a Dashboard API token in config; prefer env vars for normal use')
    .option('--token-env-var <name>', 'store the environment variable name to read the API token from')
    .action(async (options, command) => {
      await runAction(command, async () => {
        if (options.token && options.tokenEnvVar) {
          throw new FeedpixError('validation_error', 'Use either --token or --token-env-var, not both.')
        }
        const path = await writeConfig({
          ...(options.token ? { token: options.token } : {}),
          ...(options.tokenEnvVar ? { tokenEnvVar: options.tokenEnvVar } : {}),
        })

        if (options.token) {
          process.stderr.write('Stored token in user config. Do not commit, paste, or log this file.\n')
        }

        writeJson({
          path,
          tokenStored: Boolean(options.token),
          tokenEnvVar: options.tokenEnvVar,
        })
      })
    })
}
