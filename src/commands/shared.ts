import type { Command } from 'commander'
import { DashboardClient, type DashboardResponse, type FilterOptions } from '../client.js'
import { loadConfig, type ConfigState } from '../config.js'
import { FeedpixError } from '../errors.js'
import { printTable, writeError, writeJson } from '../output.js'

export interface GlobalOptions {
  json?: boolean
  baseUrl?: string
  token?: string
}

export interface CliContext {
  json: boolean
  config: ConfigState
  client: DashboardClient
}

export async function createContext(command: Command): Promise<CliContext> {
  const options = command.optsWithGlobals<GlobalOptions>()
  const config = await loadConfig({
    flagBaseUrl: options.baseUrl,
    flagToken: options.token,
  })

  return {
    json: Boolean(options.json),
    config,
    client: new DashboardClient({
      baseUrl: config.baseUrl.value,
      token: config.token.value,
    }),
  }
}

export function jsonEnabled(command: Command): boolean {
  return Boolean(command.optsWithGlobals<GlobalOptions>().json)
}

export async function runAction(command: Command, action: () => Promise<void>): Promise<void> {
  try {
    await action()
  } catch (error) {
    process.exitCode = writeError(error, jsonEnabled(command))
  }
}

export function addFilterOptions(command: Command): Command {
  return command
    .option('--advertiser <value>', 'advertiser value discovered from advertisers list')
    .option('--event-type <value>', 'event type value discovered from advertisers list')
    .option('--tv <value>', 'TV platform value discovered from tv-platforms list')
    .option('--registration-date-mode <mode>', 'registration date mode: auto or manual', 'auto')
    .option('--impression-start <date>', 'impression start date, YYYY-MM-DD')
    .option('--impression-end <date>', 'impression end date, YYYY-MM-DD')
    .option('--registration-start <date>', 'manual mode registration start date, YYYY-MM-DD')
    .option('--registration-end <date>', 'manual mode registration end date, YYYY-MM-DD')
    .option('--date-filter-mode <mode>', 'manual mode date filter: and or or')
    .option('--max-attribution-hours <hours>', 'maximum impression-to-registration window in hours')
}

export function filterOptions(options: Record<string, unknown>): FilterOptions {
  return {
    advertiser: stringOption(options.advertiser),
    eventType: stringOption(options.eventType),
    tv: stringOption(options.tv),
    registrationDateMode: stringOption(options.registrationDateMode),
    impressionStart: stringOption(options.impressionStart),
    impressionEnd: stringOption(options.impressionEnd),
    registrationStart: stringOption(options.registrationStart),
    registrationEnd: stringOption(options.registrationEnd),
    dateFilterMode: stringOption(options.dateFilterMode),
    maxAttributionHours: stringOption(options.maxAttributionHours),
  }
}

export function writeJsonOrHuman<T>(
  context: CliContext,
  jsonValue: T,
  humanWriter: (value: T) => void,
): void {
  if (context.json) {
    writeJson(jsonValue)
  } else {
    humanWriter(jsonValue)
  }
}

export function withRequest<T>(response: DashboardResponse<T>): T & { _request: DashboardResponse<T>['request'] } {
  if (response.data !== null && typeof response.data === 'object' && !Array.isArray(response.data)) {
    return {
      ...(response.data as T & Record<string, unknown>),
      _request: response.request,
    }
  }
  return {
    data: response.data,
    _request: response.request,
  } as unknown as T & { _request: DashboardResponse<T>['request'] }
}

export function parsePositiveInteger(value: string | undefined, name: string, defaultValue: number): number {
  if (value === undefined) return defaultValue
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new FeedpixError('validation_error', `${name} must be a positive integer.`)
  }
  return parsed
}

export function collectOption(value: string, previous: string[] = []): string[] {
  return [...previous, value]
}

export function printOptionTable<T extends Record<string, unknown>>(
  rows: T[],
  columns: string[],
): void {
  printTable(rows, columns)
}

function stringOption(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
