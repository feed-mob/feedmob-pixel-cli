import { describe, expect, test } from 'vitest'
import { summaryWithAttributedRecords, type SummaryResponse } from '../src/commands/summary.js'

describe('summary attributed records', () => {
  test('adds attributed records and totals only for Direct CTV categories', async () => {
    const summary: SummaryResponse = {
      total: 33729,
      totalEvents: 33729,
      totalRegistrations: 33729,
      assistedTotal: 986,
      categories: [
        {
          name: 'Peer-to-Peer Viral Funnel',
          count: 10534,
          pct: 31.231,
          slug: 'peer-to-peer-viral-funnel',
          canViewDetails: false,
          assistedCount: 2,
        },
        {
          name: 'Direct / Untracked',
          count: 3633,
          pct: 10.777,
          slug: 'direct-untracked',
          canViewDetails: false,
          assistedCount: 0,
        },
        {
          name: 'Direct - LG CTV',
          count: 71,
          pct: 0.211,
          slug: 'direct-lg-ctv',
          canViewDetails: true,
        },
        {
          name: 'Direct - TCL CTV',
          count: 29,
          pct: 0.086,
          slug: 'direct-tcl-ctv',
          canViewDetails: true,
          assistedCount: 0,
        },
        {
          name: 'Other Marketing Funnel',
          count: 1,
          pct: 10,
          slug: 'other-marketing-funnel',
          canViewDetails: false,
          assistedCount: 1,
        },
      ],
    }
    const requested: string[] = []

    const result = await summaryWithAttributedRecords(summary, {
      attributionWindow: {
        hours: 336,
        days: 14,
        source: 'default',
      },
      perPage: 100,
      allPages: true,
      fetchRecords: async (category, page, perPage) => {
        requested.push(`${category.slug}:${page}:${perPage}`)
        if (category.slug === 'direct-lg-ctv') {
          return {
            records: [{ conversionId: 'a' }, { conversionId: 'b' }],
            pagination: { page, perPage, total: 2, totalPages: 1 },
          }
        }

        return {
          records: [{ conversionId: 'c' }],
          pagination: { page, perPage, total: 1, totalPages: 1 },
        }
      },
    })

    expect(requested).toEqual(['direct-lg-ctv:1:100', 'direct-tcl-ctv:1:100'])
    expect(result.attributionWindow).toEqual({
      hours: 336,
      days: 14,
      source: 'default',
    })
    expect(result.assistedTotal).toBe(986)
    expect(result.totalRegistrations).toBe(33729)
    expect(result.attributed).toEqual({
      total: 100,
      records: [
        {
          categorySlug: 'direct-lg-ctv',
          categoryName: 'Direct - LG CTV',
          categoryAssistedCount: 0,
          conversionId: 'a',
        },
        {
          categorySlug: 'direct-lg-ctv',
          categoryName: 'Direct - LG CTV',
          categoryAssistedCount: 0,
          conversionId: 'b',
        },
        {
          categorySlug: 'direct-tcl-ctv',
          categoryName: 'Direct - TCL CTV',
          categoryAssistedCount: 0,
          conversionId: 'c',
        },
      ],
      categories: [
        {
          slug: 'direct-lg-ctv',
          name: 'Direct - LG CTV',
          assistedCount: 0,
          recordsFetched: 2,
          recordsTotal: 2,
          pagesFetched: 1,
        },
        {
          slug: 'direct-tcl-ctv',
          name: 'Direct - TCL CTV',
          assistedCount: 0,
          recordsFetched: 1,
          recordsTotal: 1,
          pagesFetched: 1,
        },
      ],
    })
  })
})
