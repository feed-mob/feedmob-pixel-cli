import type { Command } from 'commander'
import { writeConfig } from '../config.js'
import { writeJson } from '../output.js'
import { runAction } from './shared.js'

export function addInitCommand(program: Command): void {
  program
    .command('init')
    .description('Write ~/.fpc/config.json with optional token settings')
    .option('--token <token>', 'store a Dashboard API token in config; prefer env vars for normal use')
    .action(async (options, command) => {
      await runAction(command, async () => {
        const path = await writeConfig({
          ...(options.token ? { token: options.token } : {}),
        })

        if (options.token) {
          process.stderr.write('Stored token in user config. Do not commit, paste, or log this file.\n')
        }

        writeJson({
          path,
          tokenStored: Boolean(options.token),
        })
      })
    })
}
