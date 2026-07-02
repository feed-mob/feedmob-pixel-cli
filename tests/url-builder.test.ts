import { describe, expect, test } from 'vitest'
import {
  buildDashboardUrl,
  buildFilterQuery,
  capPerPage,
  normalizeDashboardPath,
} from '../src/client.js'

describe('URL builder', () => {
  test('normalizes dashboard API paths to the Rails prefix', () => {
    expect(normalizeDashboardPath('/api/v1/dashboard_api/summary')).toBe('/rails/api/v1/dashboard_api/summary')
    expect(normalizeDashboardPath('/rails/api/v1/dashboard_api/summary')).toBe('/rails/api/v1/dashboard_api/summary')
  })

  test('does not duplicate /rails when base URL already includes it', () => {
    const url = buildDashboardUrl('https://dashboard.example.com/rails', '/api/v1/dashboard_api/summary', {
      advertiser: 'chime',
      eventType: 'registration',
    })

    expect(url.toString()).toBe(
      'https://dashboard.example.com/rails/api/v1/dashboard_api/summary?advertiser=chime&eventType=registration',
    )
  })

  test('maps kebab-case CLI filter flags to camelCase API query keys', () => {
    expect(
      buildFilterQuery({
        advertiser: 'chime',
        eventType: 'registration',
        tv: 'lg-tv',
        registrationDateMode: 'auto',
        impressionStart: '2026-06-01',
        impressionEnd: '2026-06-30',
        maxAttributionHours: '336',
      }),
    ).toEqual({
      advertiser: 'chime',
      eventType: 'registration',
      tv: 'lg-tv',
      registrationDateMode: 'auto',
      impressionStartDate: '2026-06-01',
      impressionEndDate: '2026-06-30',
      maxImpressionToRegistration: '336',
    })
  })

  test('defaults registrationDateMode to auto for filtered endpoints', () => {
    expect(buildFilterQuery({ advertiser: 'chime' })).toMatchObject({
      advertiser: 'chime',
      registrationDateMode: 'auto',
    })
  })

  test('rejects dateFilterMode=or unless registrationDateMode is manual', () => {
    expect(() =>
      buildFilterQuery({
        advertiser: 'chime',
        dateFilterMode: 'or',
      }),
    ).toThrow(/manual/)
  })

  test('caps perPage at 500 and defaults to 100', () => {
    expect(capPerPage(undefined)).toBe(100)
    expect(capPerPage('250')).toBe(250)
    expect(capPerPage('999')).toBe(500)
  })
})
