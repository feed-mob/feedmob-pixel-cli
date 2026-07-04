import { FeedpixError } from './errors.js'

export type HttpMethod = 'GET' | 'HEAD'

export type QueryValue = string | number | boolean | null | undefined
export type QueryInput = Record<string, QueryValue> | Array<[string, string]> | URLSearchParams

export interface FilterOptions {
  advertiser?: string
  eventType?: string
  tv?: string
  registrationDateMode?: string
  impressionStart?: string
  impressionEnd?: string
  registrationStart?: string
  registrationEnd?: string
  dateFilterMode?: string
  maxAttributionHours?: string
}

export interface RequestMetadata {
  method: HttpMethod
  path: string
  query: Record<string, string>
  url: string
}

export interface DashboardClientOptions {
  baseUrl?: string
  token?: string
  fetchImpl?: typeof fetch
}

export interface DashboardResponse<T> {
  data: T
  status: number
  contentType: string
  request: RequestMetadata
}

export class DashboardClient {
  private readonly baseUrl?: string
  private readonly token?: string
  private readonly fetchImpl: typeof fetch

  constructor(options: DashboardClientOptions) {
    this.baseUrl = options.baseUrl
    this.token = options.token
    this.fetchImpl = options.fetchImpl ?? fetch
  }

  async getJson<T>(path: string, query: QueryInput = {}): Promise<DashboardResponse<T>> {
    return this.request<T>('GET', path, query, 'application/json')
  }

  async getText(path: string, query: QueryInput = {}): Promise<DashboardResponse<string>> {
    return this.request<string>('GET', path, query, 'text/csv, text/plain, */*')
  }

  async getRaw(path: string, query: QueryInput = {}): Promise<DashboardResponse<unknown>> {
    return this.request<unknown>('GET', path, query, '*/*')
  }

  async head(path: string, query: QueryInput = {}): Promise<DashboardResponse<{ headers: Record<string, string> }>> {
    return this.request<{ headers: Record<string, string> }>('HEAD', path, query, '*/*')
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    query: QueryInput,
    accept: string,
  ): Promise<DashboardResponse<T>> {
    if (!this.baseUrl) {
      throw new FeedpixError('config_error', 'Dashboard base URL is not configured.')
    }
    if (!this.token) {
      throw new FeedpixError('auth_error', 'API token is not configured. Set FEEDMOB_DASHBOARD_API_TOKEN.')
    }

    const url = buildDashboardUrl(this.baseUrl, path, query)
    const metadata = requestMetadata(method, url, normalizeDashboardPath(path))

    let response: Response
    try {
      response = await this.fetchImpl(url, {
        method,
        headers: {
          Accept: accept,
          Authorization: `Bearer ${this.token}`,
        },
      })
    } catch (error) {
      throw new FeedpixError('network_error', 'Network request failed', { cause: error })
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (!response.ok) {
      throw await responseError(response, contentType)
    }

    if (method === 'HEAD') {
      return {
        data: { headers: headersObject(response.headers) } as T,
        status: response.status,
        contentType,
        request: metadata,
      }
    }

    const data =
      contentType.includes('application/json') || accept === 'application/json'
        ? ((await response.json()) as T)
        : ((await response.text()) as T)

    return {
      data,
      status: response.status,
      contentType,
      request: metadata,
    }
  }
}

export function normalizeDashboardPath(path: string): string {
  const cleaned = path.trim()
  if (/^https?:\/\//i.test(cleaned)) {
    throw new FeedpixError('validation_error', 'Request path must be relative to the configured baseUrl.')
  }

  const withSlash = cleaned.startsWith('/') ? cleaned : `/${cleaned}`
  if (withSlash.startsWith('/rails/api/')) return withSlash
  if (withSlash.startsWith('/api/')) return `/rails${withSlash}`
  if (withSlash.startsWith('/dashboard_api/')) return `/rails/api/v1${withSlash}`
  return withSlash
}

export function buildDashboardUrl(baseUrl: string, path: string, query: QueryInput = {}): URL {
  const base = parseBaseUrl(baseUrl)
  const normalizedPath = normalizeDashboardPath(path)
  const basePath = trimTrailingSlash(base.pathname === '/' ? '' : base.pathname)
  const requestPath = basePath.endsWith('/rails') && normalizedPath.startsWith('/rails/')
    ? normalizedPath.slice('/rails'.length)
    : normalizedPath

  base.pathname = joinUrlPaths(basePath, requestPath)
  base.search = ''
  base.hash = ''

  for (const [key, value] of queryEntries(query)) {
    if (value !== '') base.searchParams.append(key, value)
  }

  return base
}

export function buildFilterQuery(options: FilterOptions): Record<string, string> {
  const registrationDateMode = options.registrationDateMode || 'auto'
  if (!['auto', 'manual'].includes(registrationDateMode)) {
    throw new FeedpixError('validation_error', 'registration-date-mode must be auto or manual.')
  }

  if (options.dateFilterMode && !['and', 'or'].includes(options.dateFilterMode)) {
    throw new FeedpixError('validation_error', 'date-filter-mode must be and or or.')
  }

  if (options.dateFilterMode === 'or' && registrationDateMode !== 'manual') {
    throw new FeedpixError('validation_error', 'dateFilterMode=or requires registrationDateMode=manual.')
  }

  if (
    registrationDateMode === 'auto' &&
    (options.registrationStart || options.registrationEnd || (options.dateFilterMode && options.dateFilterMode !== 'and'))
  ) {
    throw new FeedpixError(
      'validation_error',
      'registration-start, registration-end, and dateFilterMode=or are only allowed with registration-date-mode manual.',
    )
  }

  const query: Record<string, string> = {
    registrationDateMode,
  }

  setIfPresent(query, 'advertiser', options.advertiser)
  setIfPresent(query, 'eventType', options.eventType)
  setIfPresent(query, 'tv', options.tv)
  setIfPresent(query, 'impressionStartDate', options.impressionStart)
  setIfPresent(query, 'impressionEndDate', options.impressionEnd)
  setIfPresent(query, 'maxImpressionToRegistration', options.maxAttributionHours)

  if (registrationDateMode === 'manual') {
    setIfPresent(query, 'registrationStartDate', options.registrationStart)
    setIfPresent(query, 'registrationEndDate', options.registrationEnd)
    setIfPresent(query, 'dateFilterMode', options.dateFilterMode)
  } else if (options.dateFilterMode === 'and') {
    setIfPresent(query, 'dateFilterMode', options.dateFilterMode)
  }

  return query
}

export function capPerPage(value: string | number | undefined): number {
  if (value === undefined || value === '') return 100
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new FeedpixError('validation_error', 'per-page must be a positive number.')
  }
  return Math.min(500, Math.floor(parsed))
}

export function requestMetadata(method: HttpMethod, url: URL, path: string): RequestMetadata {
  return {
    method,
    path,
    query: Object.fromEntries(url.searchParams.entries()),
    url: url.toString(),
  }
}

export function parseQueryItems(items: string[] = []): Array<[string, string]> {
  return items.map((item) => {
    const index = item.indexOf('=')
    if (index <= 0) {
      throw new FeedpixError('validation_error', `Invalid --query value "${item}". Use key=value.`)
    }
    return [item.slice(0, index), item.slice(index + 1)]
  })
}

function parseBaseUrl(baseUrl: string): URL {
  try {
    return new URL(baseUrl)
  } catch (error) {
    throw new FeedpixError('validation_error', `Invalid baseUrl: ${baseUrl}`, { cause: error })
  }
}

function queryEntries(query: QueryInput): Array<[string, string]> {
  if (query instanceof URLSearchParams) return [...query.entries()]
  if (Array.isArray(query)) return query

  const entries: Array<[string, string]> = []
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) entries.push([key, String(value)])
  }
  return entries
}

function setIfPresent(query: Record<string, string>, key: string, value: string | undefined): void {
  const cleaned = value?.trim()
  if (cleaned) query[key] = cleaned
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

function joinUrlPaths(left: string, right: string): string {
  const prefix = left ? `/${left.replace(/^\/+|\/+$/g, '')}` : ''
  const suffix = right ? `/${right.replace(/^\/+/, '')}` : ''
  return `${prefix}${suffix}` || '/'
}

async function responseError(response: Response, contentType: string): Promise<FeedpixError> {
  let message = response.statusText || `HTTP ${response.status}`
  try {
    if (contentType.includes('application/json')) {
      const payload = (await response.json()) as { error?: unknown; message?: unknown }
      message = String(payload.error ?? payload.message ?? message)
    } else {
      const text = await response.text()
      if (text.trim()) message = text.trim()
    }
  } catch {
    // Keep statusText when the error response body cannot be parsed.
  }

  return new FeedpixError(response.status === 401 || response.status === 403 ? 'auth_error' : 'api_error', message, {
    status: response.status,
  })
}

function headersObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries())
}
