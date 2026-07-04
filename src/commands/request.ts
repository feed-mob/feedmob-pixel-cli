import type { Command } from 'commander'
import { parseQueryItems } from '../client.js'
import { writeJson } from '../output.js'
import { collectOption, createContext, runAction, withRequest, writeJsonOrHuman } from './shared.js'

export function addRequestCommand(program: Command): void {
  const request = program.command('request').description('Read-only raw Dashboard API request escape hatch')

  request
    .command('get')
    .description('Run a raw GET request with configured auth')
    .argument('<path>', 'relative API path, for example /api/v1/dashboard_api/summary')
    .option('--query <key=value>', 'query parameter; repeat for multiple values', collectOption, [])
    .action(async (path, options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const response = await context.client.getRaw(path, parseQueryItems(options.query))
        const payload = withRequest(response)
        writeJsonOrHuman(context, payload, () => {
          if (typeof response.data === 'string') {
            process.stdout.write(response.data)
            if (!response.data.endsWith('\n')) process.stdout.write('\n')
          } else {
            writeJson(response.data)
          }
        })
      })
    })

  request
    .command('head')
    .description('Run a raw HEAD request with configured auth')
    .argument('<path>', 'relative API path, for example /api/v1/dashboard_api/summary')
    .option('--query <key=value>', 'query parameter; repeat for multiple values', collectOption, [])
    .action(async (path, options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const response = await context.client.head(path, parseQueryItems(options.query))
        writeJsonOrHuman(context, withRequest(response), (payload) => {
          writeJson(payload)
        })
      })
    })
}
