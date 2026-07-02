import { describe, expect, test } from 'vitest'
import { FeedpixError } from '../src/errors.js'
import { jsonErrorPayload, redactSensitiveText } from '../src/output.js'

describe('output', () => {
  test('formats stable JSON error payloads', () => {
    const payload = jsonErrorPayload(new FeedpixError('auth_error', 'Unauthorized', { status: 401 }))

    expect(payload).toEqual({
      error: {
        type: 'auth_error',
        message: 'Unauthorized',
        status: 401,
      },
    })
  })

  test('redacts bearer tokens and dashboard API tokens from diagnostics', () => {
    const text = 'Authorization: Bearer fmpat_abcdefghijklmnopqrstuvwxyz123456 and token=fmpat_secret'

    expect(redactSensitiveText(text)).toBe('Authorization: Bearer [REDACTED] and token=[REDACTED]')
  })
})
