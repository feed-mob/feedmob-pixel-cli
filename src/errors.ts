export type FeedpixErrorType =
  | 'auth_error'
  | 'api_error'
  | 'config_error'
  | 'io_error'
  | 'network_error'
  | 'parse_error'
  | 'validation_error'

export interface FeedpixErrorOptions {
  status?: number
  exitCode?: number
  cause?: unknown
}

export class FeedpixError extends Error {
  readonly type: FeedpixErrorType
  readonly status?: number
  readonly exitCode: number

  constructor(type: FeedpixErrorType, message: string, options: FeedpixErrorOptions = {}) {
    super(message)
    this.name = 'FeedpixError'
    this.type = type
    this.status = options.status
    this.exitCode = options.exitCode ?? defaultExitCode(type)

    if (options.cause !== undefined) {
      this.cause = options.cause
    }
  }
}

export function toFeedpixError(error: unknown): FeedpixError {
  if (error instanceof FeedpixError) return error
  if (error instanceof Error) {
    return new FeedpixError('api_error', error.message, { cause: error })
  }
  return new FeedpixError('api_error', String(error))
}

function defaultExitCode(type: FeedpixErrorType): number {
  switch (type) {
    case 'auth_error':
      return 2
    case 'validation_error':
    case 'config_error':
      return 3
    case 'network_error':
      return 4
    case 'io_error':
      return 5
    default:
      return 1
  }
}
