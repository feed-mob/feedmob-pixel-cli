import { describe, expect, test } from 'vitest'
import { summaryWithAttributedRecords, type SummaryResponse } from '../src/commands/summary.js'

describe('summary attributed records', () => {
  test('adds records for categories that have assisted counts', async () => {
    const summary: SummaryResponse = {
      total: 10,
      totalEvents: 10,
      totalRegistrations: 10,
      assistedTotal: 3,
      categories: [
        {
          name: 'Peer-to-Peer Viral Funnel',
          count: 5,
          pct: 50,
          slug: 'peer-to-peer-viral-funnel',
          canViewDetails: false,
          assistedCount: 2,
        },
        {
          name: 'Direct / Untracked',
          count: 4,
          pct: 40,
          slug: 'direct-untracked',
          canViewDetails: false,
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
        if (category.slug === 'peer-to-peer-viral-funnel') {
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

    expect(requested).toEqual(['peer-to-peer-viral-funnel:1:100', 'other-marketing-funnel:1:100'])
    expect(result.attributionWindow).toEqual({
      hours: 336,
      days: 14,
      source: 'default',
    })
    expect(result.attributed).toEqual({
      total: 3,
      records: [
        {
          categorySlug: 'peer-to-peer-viral-funnel',
          categoryName: 'Peer-to-Peer Viral Funnel',
          categoryAssistedCount: 2,
          conversionId: 'a',
        },
        {
          categorySlug: 'peer-to-peer-viral-funnel',
          categoryName: 'Peer-to-Peer Viral Funnel',
          categoryAssistedCount: 2,
          conversionId: 'b',
        },
        {
          categorySlug: 'other-marketing-funnel',
          categoryName: 'Other Marketing Funnel',
          categoryAssistedCount: 1,
          conversionId: 'c',
        },
      ],
      categories: [
        {
          slug: 'peer-to-peer-viral-funnel',
          name: 'Peer-to-Peer Viral Funnel',
          assistedCount: 2,
          recordsFetched: 2,
          recordsTotal: 2,
          pagesFetched: 1,
        },
        {
          slug: 'other-marketing-funnel',
          name: 'Other Marketing Funnel',
          assistedCount: 1,
          recordsFetched: 1,
          recordsTotal: 1,
          pagesFetched: 1,
        },
      ],
    })
  })
})
