#!/usr/bin/env node
import { pathToFileURL } from 'node:url'
import { Command, CommanderError } from 'commander'
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
    .option('--json', 'write machine-readable JSON to stdout')
    .showHelpAfterError()

  addDoctorCommand(program)
  addInitCommand(program)
  addAdvertisersCommand(program)
  addTvPlatformsCommand(program)
  addCategoriesCommand(program)
  addSummaryCommand(program)
  addRecordsCommand(program)
  addRequestCommand(program)

  return program
}

async function main(argv: string[]): Promise<void> {
  const program = buildProgram()
  program.exitOverride()

  try {
    await program.parseAsync(argv)
  } catch (error) {
    if (error instanceof CommanderError && error.code === 'commander.helpDisplayed') {
      return
    }

    const json = argv.includes('--json')
    const feedpixError =
      error instanceof CommanderError
        ? new FeedpixError('validation_error', error.message)
        : error
    process.exitCode = writeError(feedpixError, json)
  }
}

if (isMainModule()) {
  main(process.argv).catch((error) => {
    const json = process.argv.includes('--json')
    process.exitCode = writeError(
      error instanceof Error ? error : new FeedpixError('api_error', `${PROJECT_NAME} failed`),
      json,
    )
  })
}

function isMainModule(): boolean {
  return Boolean(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
}
