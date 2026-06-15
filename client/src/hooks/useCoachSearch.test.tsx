import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { useCoachSearch, useDebouncedValue } from './useCoachSearch'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { clearAllSessions, loginAs } from '@/test/session'
import type { CoachSearchResponse } from '@/types/api'

beforeEach(() => {
  loginAs('client')
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useDebouncedValue', () => {
  it('atualiza o valor apenas depois do delay', () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 250), {
      initialProps: { value: 'mar' },
    })

    rerender({ value: 'marcos' })

    expect(result.current).toBe('mar')

    act(() => {
      vi.advanceTimersByTime(250)
    })

    expect(result.current).toBe('marcos')
  })
})

describe('useCoachSearch', () => {
  it('fica idle sem token de aluno', () => {
    clearAllSessions()
    const { wrapper } = createWrapper()
    const { result } = renderHook(() => useCoachSearch({ q: 'marcos' }), { wrapper })

    expect(result.current.fetchStatus).toBe('idle')
    expect(result.current.data).toBeUndefined()
  })

  it('normaliza filtros antes de chamar a API', async () => {
    let capturedUrl: URL | null = null
    server.use(
      http.get('*/student/coaches', ({ request }) => {
        capturedUrl = new URL(request.url)
        return HttpResponse.json<CoachSearchResponse>({
          data: [],
          pagination: {
            page: 1,
            limit: 12,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
        })
      }),
    )

    const { wrapper } = createWrapper()
    const { result } = renderHook(
      () =>
        useCoachSearch({
          q: '  marcos ',
          specialties: ['Funcional', '', 'Yoga'],
          address: '  Pinheiros ',
        }),
      { wrapper },
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(capturedUrl?.searchParams.get('q')).toBe('marcos')
    expect(capturedUrl?.searchParams.get('address')).toBe('Pinheiros')
    expect(capturedUrl?.searchParams.get('sort')).toBe('rating')
    expect(capturedUrl?.searchParams.get('page')).toBe('1')
    expect(capturedUrl?.searchParams.get('limit')).toBe('12')
    expect(capturedUrl?.searchParams.getAll('specialties[]')).toEqual(['Funcional', 'Yoga'])
  })
})
