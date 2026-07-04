#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Command, CommanderError, Option } from 'commander'
import { addAdvertisersCommand } from './commands/advertisers.js'
import { addCategoriesCommand } from './commands/categories.js'
import { addDoctorCommand } from './commands/doctor.js'
import { addInitCommand } from './commands/init.js'
import { addRecordsCommand } from './commands/records.js'
import { addRequestCommand } from './commands/request.js'
import { addSummaryCommand } from './commands/summary.js'
import { addTvPlatformsCommand } from './commands/tvPlatforms.js'
import { CLI_VERSION, COMMAND_NAME, PROJECT_NAME } from './constants.js'
import { FeedpixError } from './errors.js'
import { writeError } from './output.js'

export function buildProgram(): Command {
  const program = new Command()

  program
    .name(COMMAND_NAME)
    .description('FeedMob Pixel Dashboard data query CLI')
    .version(CLI_VERSION)
    .addOption(new Option('--json', 'legacy no-op; output is always JSON').hideHelp())
    .showHelpAfterError()

  addDoctorCommand(program)
  addInitCommand(program)
  addAdvertisersCommand(program)
  addTvPlatformsCommand(program)
  addCategoriesCommand(program)
  addSummaryCommand(program)
  addRecordsCommand(program)
  addRequestCommand(program)
  applyExitOverride(program)

  return program
}

export async function main(argv: string[]): Promise<void> {
  const program = buildProgram()
  program.exitOverride()

  try {
    await program.parseAsync(argv)
  } catch (error) {
    if (
      error instanceof CommanderError &&
      (error.code === 'commander.helpDisplayed' || error.code === 'commander.version')
    ) {
      return
    }

    const feedpixError =
      error instanceof CommanderError
        ? new FeedpixError('validation_error', error.message)
        : error
    process.exitCode = writeError(feedpixError, true)
  }
}

if (isMainModule()) {
  main(process.argv).catch((error) => {
    process.exitCode = writeError(
      error instanceof Error ? error : new FeedpixError('api_error', `${PROJECT_NAME} failed`),
      true,
    )
  })
}

function isMainModule(): boolean {
  if (!process.argv[1]) return false

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])
  } catch {
    return false
  }
}

function applyExitOverride(command: Command): void {
  command.exitOverride()
  for (const child of command.commands) {
    applyExitOverride(child)
  }
}
