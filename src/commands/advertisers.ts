import type { Command } from 'commander'
import { writeJsonOrHuman, createContext, printOptionTable, runAction, withRequest } from './shared.js'

interface Advertiser {
  value: string
  label: string
  defaultEventType: string
  eventTypes?: Array<{ value: string }>
  tvPlatforms?: Array<{ value: string }>
}

interface AdvertisersResponse {
  advertisers: Advertiser[]
}

export function addAdvertisersCommand(program: Command): void {
  const advertisers = program.command('advertisers').description('Discover advertiser values')

  advertisers
    .command('list')
    .description('List advertisers supported by the Dashboard API')
    .action(async (_options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const response = await context.client.getJson<AdvertisersResponse>('/api/v1/dashboard_api/advertisers')
        writeJsonOrHuman(context, withRequest(response), (payload) => {
          printOptionTable(
            payload.advertisers.map((advertiser) => ({
              value: advertiser.value,
              label: advertiser.label,
              defaultEventType: advertiser.defaultEventType,
              eventTypes: advertiser.eventTypes?.map((item) => item.value).join(',') ?? '',
              tvPlatforms: advertiser.tvPlatforms?.map((item) => item.value).join(',') ?? '',
            })),
            ['value', 'label', 'defaultEventType', 'eventTypes', 'tvPlatforms'],
          )
        })
      })
    })
}
