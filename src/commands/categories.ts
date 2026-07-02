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

interface Category {
  value: string
  name: string
  label: string
  slug: string
  count: number
  canViewDetails: boolean
}

interface CategoriesResponse {
  advertiser: string
  eventType: string
  tv: string
  categories: Category[]
}

export function addCategoriesCommand(program: Command): void {
  const categories = program.command('categories').description('Discover category values for records/export')

  addFilterOptions(
    categories
      .command('list')
      .description('List categories for advertiser, event type, TV platform, and date filters'),
  ).action(async (options, command) => {
    await runAction(command, async () => {
      const context = await createContext(command)
      const query = buildFilterQuery(filterOptions(options))
      const response = await context.client.getJson<CategoriesResponse>('/api/v1/dashboard_api/categories', query)

      writeJsonOrHuman(context, withRequest(response), (payload) => {
        process.stdout.write(`${payload.advertiser} / ${payload.eventType} / ${payload.tv}\n`)
        printOptionTable(
          payload.categories.map((category) => ({
            value: category.value,
            slug: category.slug,
            count: category.count,
            canViewDetails: category.canViewDetails,
            label: category.label,
          })),
          ['value', 'slug', 'count', 'canViewDetails', 'label'],
        )
      })
    })
  })
}
