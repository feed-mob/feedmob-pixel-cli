import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import type { Command } from 'commander'
import { buildFilterQuery, capPerPage, type DashboardResponse } from '../client.js'
import { writeJson } from '../output.js'
import {
  addFilterOptions,
  createContext,
  filterOptions,
  parsePositiveInteger,
  printOptionTable,
  runAction,
  writeJsonOrHuman,
} from './shared.js'

export interface RecordsPage<TRecord = unknown> {
  records: TRecord[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

export interface AggregatedRecordsPage<TRecord = unknown> {
  records: TRecord[]
  pagination: RecordsPage<TRecord>['pagination'] & {
    pagesFetched: number
    nextPage?: number
  }
}

export interface FetchAllRecordPagesOptions<TRecord = unknown> {
  firstPage: number
  perPage: number
  allPages: boolean
  maxPages?: number
  fetchPage: (page: number) => Promise<RecordsPage<TRecord>>
}

export async function fetchAllRecordPages<TRecord = unknown>(
  options: FetchAllRecordPagesOptions<TRecord>,
): Promise<AggregatedRecordsPage<TRecord>> {
  const first = await options.fetchPage(options.firstPage)
  if (!options.allPages) {
    return {
      records: first.records,
      pagination: {
        ...first.pagination,
        pagesFetched: 1,
        nextPage: undefined,
      },
    }
  }

  const records = [...first.records]
  let current = first
  let pagesFetched = 1
  const maxPages = options.maxPages ?? Number.POSITIVE_INFINITY

  while (current.pagination.page < current.pagination.totalPages && pagesFetched < maxPages) {
    current = await options.fetchPage(current.pagination.page + 1)
    records.push(...current.records)
    pagesFetched += 1
  }

  const nextPage = current.pagination.page < current.pagination.totalPages ? current.pagination.page + 1 : undefined

  return {
    records,
    pagination: {
      ...current.pagination,
      perPage: options.perPage,
      pagesFetched,
      nextPage,
    },
  }
}

export function addRecordsCommand(program: Command): void {
  const records = program.command('records').description('List or export category records')

  addFilterOptions(
    records
      .command('list')
      .description('List records for a category value or slug')
      .argument('<category>', 'category.value or category.slug from categories list')
      .option('--page <number>', 'page number, starting at 1', '1')
      .option('--per-page <number>', 'records per page; defaults to 100 and caps at 500')
      .option('--all-pages', 'fetch every page until totalPages or max-pages')
      .option('--max-pages <number>', 'maximum pages to fetch when --all-pages is set'),
  ).action(async (category, options, command) => {
    await runAction(command, async () => {
      const context = await createContext(command)
      const page = parsePositiveInteger(options.page, 'page', 1)
      const perPage = capPerPage(options.perPage)
      const maxPages = options.maxPages
        ? parsePositiveInteger(options.maxPages, 'max-pages', Number.POSITIVE_INFINITY)
        : undefined
      const query = {
        ...buildFilterQuery(filterOptions(options)),
        perPage,
      }
      const path = categoryRecordsPath(category, false)
      let firstResponse: DashboardResponse<RecordsPage> | undefined

      const result = await fetchAllRecordPages({
        firstPage: page,
        perPage,
        allPages: Boolean(options.allPages),
        maxPages,
        fetchPage: async (pageToFetch) => {
          const response = await context.client.getJson<RecordsPage>(path, {
            ...query,
            page: pageToFetch,
          })
          firstResponse ??= response
          return response.data
        },
      })

      const payload = {
        ...result,
        _request: firstResponse?.request,
      }

      writeJsonOrHuman(context, payload, (value) => {
        process.stdout.write(
          `records: ${value.records.length} (page ${value.pagination.page}/${value.pagination.totalPages}, total ${value.pagination.total})\n`,
        )
        process.stdout.write(`pagesFetched: ${value.pagination.pagesFetched}\n`)
        printOptionTable(
          value.records.slice(0, 20).map((record) => recordSummary(record)),
          ['index', 'recordKey', 'conversionId', 'eventTime', 'campaign', 'status'],
        )
        if (value.records.length > 20) {
          process.stdout.write(`Showing first 20 of ${value.records.length} records.\n`)
        }
      })
    })
  })

  addFilterOptions(
    records
      .command('export')
      .description('Export all matching records for a category as CSV')
      .argument('<category>', 'category.value or category.slug from categories list')
      .requiredOption('--out <path>', 'CSV output path'),
  ).action(async (category, options, command) => {
    await runAction(command, async () => {
      const context = await createContext(command)
      const query = buildFilterQuery(filterOptions(options))
      const response = await context.client.getText(categoryRecordsPath(category, true), query)
      const outPath = resolve(options.out)
      await mkdir(dirname(outPath), { recursive: true })
      await writeFile(outPath, response.data, 'utf8')
      const payload = {
        path: outPath,
        bytes: Buffer.byteLength(response.data),
        contentType: contentType(response.contentType),
      }

      if (context.json) {
        writeJson(payload)
      } else {
        process.stdout.write(`Wrote ${payload.path} (${payload.bytes} bytes, ${payload.contentType})\n`)
      }
    })
  })
}

export function categoryRecordsPath(category: string, exportCsv: boolean): string {
  const encoded = encodeURIComponent(category)
  return `/api/v1/dashboard_api/categories/${encoded}/records${exportCsv ? '/export' : ''}`
}

function contentType(value: string): string {
  return value.split(';', 1)[0] || 'text/csv'
}

function recordSummary(record: unknown): Record<string, unknown> {
  if (record == null || typeof record !== 'object') return { recordKey: String(record) }
  const source = record as Record<string, unknown>
  return {
    index: source.index ?? '',
    recordKey: source.recordKey ?? '',
    conversionId: source.conversionId ?? '',
    eventTime: source.eventTime ?? '',
    campaign: source.campaign ?? '',
    status: source.status ?? '',
  }
}
