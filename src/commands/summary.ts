import type { Command } from 'commander'
import { buildFilterQuery } from '../client.js'
import {
  addFilterOptions,
  createContext,
  filterOptions,
  printOptionTable,
  runAction,
  withRequest,
  writeJsonOrHuman,
} from './shared.js'

interface SummaryCategory {
  name: string
  count: number
  pct: number
  slug: string
  canViewDetails: boolean
  assistedCount?: number
}

interface SummaryResponse {
  total: number
  totalEvents: number
  totalRegistrations: number
  assistedTotal: number
  categories: SummaryCategory[]
}

export function addSummaryCommand(program: Command): void {
  const summary = program.command('summary').description('Read dashboard summary totals')

  addFilterOptions(summary.command('get').description('Get dashboard summary for selected filters')).action(
    async (options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const query = buildFilterQuery(filterOptions(options))
        const response = await context.client.getJson<SummaryResponse>('/api/v1/dashboard_api/summary', query)

        writeJsonOrHuman(context, withRequest(response), (payload) => {
          process.stdout.write(`total: ${payload.total}\n`)
          process.stdout.write(`totalEvents: ${payload.totalEvents}\n`)
          process.stdout.write(`totalRegistrations: ${payload.totalRegistrations}\n`)
          process.stdout.write(`assistedTotal: ${payload.assistedTotal}\n`)
          printOptionTable(
            payload.categories.slice(0, 20).map((category) => ({
              slug: category.slug,
              count: category.count,
              pct: category.pct,
              canViewDetails: category.canViewDetails,
              name: category.name,
            })),
            ['slug', 'count', 'pct', 'canViewDetails', 'name'],
          )
        })
      })
    },
  )
}
