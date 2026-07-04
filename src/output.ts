import { FeedpixError, toFeedpixError } from './errors.js'

export interface JsonErrorPayload {
  error: {
    type: string
    message: string
    status?: number
  }
}

export function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`)
}

export function jsonErrorPayload(error: unknown): JsonErrorPayload {
  const feedpixError = toFeedpixError(error)
  const payload: JsonErrorPayload = {
    error: {
      type: feedpixError.type,
      message: redactSensitiveText(feedpixError.message),
    },
  }

  if (feedpixError.status !== undefined) {
    payload.error.status = feedpixError.status
  }

  return payload
}

export function writeError(error: unknown, json: boolean): number {
  const feedpixError = toFeedpixError(error)
  if (json) {
    writeJson(jsonErrorPayload(feedpixError))
  } else {
    process.stderr.write(`fpc: ${redactSensitiveText(feedpixError.message)}\n`)
  }
  return feedpixError.exitCode
}

export function redactSensitiveText(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [REDACTED]')
    .replace(/fmpat_[A-Za-z0-9_-]+/g, '[REDACTED]')
    .replace(/(authorization\s*:\s*)(?!Bearer\s+\[REDACTED\])[^\s]+/gi, '$1[REDACTED]')
    .replace(/(token=)[^&\s]+/gi, '$1[REDACTED]')
}

export function printTable(rows: Array<Record<string, unknown>>, columns: string[]): void {
  if (rows.length === 0) {
    process.stdout.write('No results.\n')
    return
  }

  const widths = columns.map((column) => {
    const cellWidths = rows.map((row) => String(row[column] ?? '').length)
    return Math.max(column.length, ...cellWidths)
  })

  const formatRow = (row: Record<string, unknown>) =>
    columns
      .map((column, index) => String(row[column] ?? '').padEnd(widths[index] ?? column.length))
      .join('  ')
      .trimEnd()

  process.stdout.write(`${columns.map((column, index) => column.padEnd(widths[index] ?? column.length)).join('  ')}\n`)
  process.stdout.write(`${widths.map((width) => '-'.repeat(width)).join('  ')}\n`)
  for (const row of rows) {
    process.stdout.write(`${formatRow(row)}\n`)
  }
}

export function isFeedpixError(error: unknown): error is FeedpixError {
  return error instanceof FeedpixError
}
