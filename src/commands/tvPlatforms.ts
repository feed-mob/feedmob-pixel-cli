import type { Command } from 'commander'
import { createContext, printOptionTable, runAction, withRequest, writeJsonOrHuman } from './shared.js'

interface TvPlatformsResponse {
  advertiser: string
  tvPlatforms: Array<{
    value: string
    label: string
  }>
}

export function addTvPlatformsCommand(program: Command): void {
  const tvPlatforms = program.command('tv-platforms').description('Discover TV platform values')

  tvPlatforms
    .command('list')
    .description('List TV platforms for one advertiser')
    .option('--advertiser <value>', 'advertiser value discovered from advertisers list')
    .action(async (options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const response = await context.client.getJson<TvPlatformsResponse>('/api/v1/dashboard_api/tv_platforms', {
          advertiser: options.advertiser,
        })

        writeJsonOrHuman(context, withRequest(response), (payload) => {
          process.stdout.write(`advertiser: ${payload.advertiser}\n`)
          printOptionTable(payload.tvPlatforms, ['value', 'label'])
        })
      })
    })
}
