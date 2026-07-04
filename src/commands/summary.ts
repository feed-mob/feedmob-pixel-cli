import type { Command } from 'commander'
import { attributionWindow, buildFilterQuery, capPerPage, type AttributionWindow } from '../client.js'
import { categoryRecordsPath, fetchAllRecordPages, type RecordsPage } from './records.js'
import {
  addFilterOptions,
  createContext,
  filterOptions,
  parsePositiveInteger,
  printOptionTable,
  runAction,
  writeJsonOrHuman,
} from './shared.js'

export interface SummaryCategory {
  name: string
  count: number
  pct: number
  slug: string
  canViewDetails: boolean
  assistedCount?: number
}

export interface SummaryResponse {
  total: number
  totalEvents: number
  totalRegistrations: number
  assistedTotal: number
  categories: SummaryCategory[]
}

export interface AttributedCategorySummary {
  slug: string
  name: string
  assistedCount: number
  recordsFetched: number
  recordsTotal: number
  pagesFetched: number
  nextPage?: number
}

export interface AttributedSummary<TRecord = unknown> {
  total: number
  records: TRecord[]
  categories: AttributedCategorySummary[]
}

export type SummaryWithAttributedRecords<TRecord = unknown> = SummaryResponse & {
  attributionWindow: AttributionWindow
  attributed: AttributedSummary<TRecord>
}

export interface SummaryWithAttributedRecordsOptions<TRecord = unknown> {
  attributionWindow: AttributionWindow
  perPage: number
  allPages: boolean
  maxPages?: number
  fetchRecords: (category: SummaryCategory, page: number, perPage: number) => Promise<RecordsPage<TRecord>>
}

export function addSummaryCommand(program: Command): void {
  const summary = program.command('summary').description('Read dashboard summary totals')

  addFilterOptions(
    summary
      .command('get')
      .description('Get dashboard summary for selected filters')
      .option('--attributed-per-page <number>', 'records per attributed category; defaults to 500 and caps at 500')
      .option('--attributed-max-pages <number>', 'maximum pages to fetch per attributed category'),
  ).action(
    async (options, command) => {
      await runAction(command, async () => {
        const context = await createContext(command)
        const filters = filterOptions(options)
        const currentAttributionWindow = attributionWindow(filters)
        const query = buildFilterQuery(filters)
        const attributedPerPage = capPerPage(options.attributedPerPage ?? 500)
        const attributedMaxPages = options.attributedMaxPages
          ? parsePositiveInteger(options.attributedMaxPages, 'attributed-max-pages', Number.POSITIVE_INFINITY)
          : undefined
        const response = await context.client.getJson<SummaryResponse>('/api/v1/dashboard_api/summary', query)
        const summary = await summaryWithAttributedRecords(response.data, {
          attributionWindow: currentAttributionWindow,
          perPage: attributedPerPage,
          allPages: true,
          maxPages: attributedMaxPages,
          fetchRecords: async (category, page, perPage) => {
            const recordsResponse = await context.client.getJson<RecordsPage>(categoryRecordsPath(category.slug, false), {
              ...query,
              page,
              perPage,
            })
            return recordsResponse.data
          },
        })

        writeJsonOrHuman(context, { ...summary, _request: response.request }, (payload) => {
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

export async function summaryWithAttributedRecords<TRecord = unknown>(
  summary: SummaryResponse,
  options: SummaryWithAttributedRecordsOptions<TRecord>,
): Promise<SummaryWithAttributedRecords<AttributedRecord<TRecord>>> {
  const attributedCategories = summary.categories.filter(isDirectCtvCategory)
  const attributed: AttributedSummary<AttributedRecord<TRecord>> = {
    total: attributedCategories.reduce((total, category) => total + category.count, 0),
    records: [],
    categories: [],
  }

  for (const category of attributedCategories) {
    const result = await fetchAllRecordPages<TRecord>({
      firstPage: 1,
      perPage: options.perPage,
      allPages: options.allPages,
      maxPages: options.maxPages,
      fetchPage: (page) => options.fetchRecords(category, page, options.perPage),
    })
    attributed.records.push(...result.records.map((record) => attributedRecord(category, record)))
    attributed.categories.push({
      slug: category.slug,
      name: category.name,
      assistedCount: category.assistedCount ?? 0,
      recordsFetched: result.records.length,
      recordsTotal: result.pagination.total,
      pagesFetched: result.pagination.pagesFetched,
      ...(result.pagination.nextPage ? { nextPage: result.pagination.nextPage } : {}),
    })
  }

  return {
    ...summary,
    attributionWindow: options.attributionWindow,
    attributed,
  }
}

function isDirectCtvCategory(category: SummaryCategory): boolean {
  const slug = category.slug.trim().toLowerCase()
  if (slug.startsWith('direct-') && slug.endsWith('-ctv')) {
    return true
  }

  const name = category.name.trim().replace(/\s+/g, ' ')
  return /^direct\s*-\s*.+\sctv$/i.test(name)
}

type AttributedRecord<TRecord> = TRecord & {
  categorySlug: string
  categoryName: string
  categoryAssistedCount: number
}

function attributedRecord<TRecord>(category: SummaryCategory, record: TRecord): AttributedRecord<TRecord> {
  const metadata = {
    categorySlug: category.slug,
    categoryName: category.name,
    categoryAssistedCount: category.assistedCount ?? 0,
  }

  if (record !== null && typeof record === 'object' && !Array.isArray(record)) {
    return {
      ...record,
      ...metadata,
    }
  }

  return {
    value: record,
    ...metadata,
  } as unknown as AttributedRecord<TRecord>
}
