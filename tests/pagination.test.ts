import { describe, expect, test } from 'vitest'
import { fetchAllRecordPages } from '../src/commands/records.js'

describe('records pagination', () => {
  test('fetches pages until totalPages when allPages is enabled', async () => {
    const requestedPages: number[] = []
    const result = await fetchAllRecordPages({
      firstPage: 1,
      perPage: 2,
      allPages: true,
      fetchPage: async (page) => {
        requestedPages.push(page)
        return {
          records: [{ page }],
          pagination: { page, perPage: 2, total: 5, totalPages: 3 },
        }
      },
    })

    expect(requestedPages).toEqual([1, 2, 3])
    expect(result.records).toEqual([{ page: 1 }, { page: 2 }, { page: 3 }])
    expect(result.pagination).toMatchObject({ pagesFetched: 3, nextPage: undefined })
  })

  test('honors maxPages when allPages is enabled', async () => {
    const result = await fetchAllRecordPages({
      firstPage: 1,
      perPage: 2,
      allPages: true,
      maxPages: 2,
      fetchPage: async (page) => ({
        records: [{ page }],
        pagination: { page, perPage: 2, total: 10, totalPages: 5 },
      }),
    })

    expect(result.records).toEqual([{ page: 1 }, { page: 2 }])
    expect(result.pagination).toMatchObject({ pagesFetched: 2, nextPage: 3 })
  })

  test('fetches one page by default', async () => {
    const result = await fetchAllRecordPages({
      firstPage: 2,
      perPage: 100,
      allPages: false,
      fetchPage: async (page) => ({
        records: [{ page }],
        pagination: { page, perPage: 100, total: 200, totalPages: 2 },
      }),
    })

    expect(result.records).toEqual([{ page: 2 }])
    expect(result.pagination).toMatchObject({ pagesFetched: 1, nextPage: undefined })
  })
})
