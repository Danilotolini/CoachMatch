import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCoachMe } from '../useCoachMe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

vi.mock('@/api/coaches', () => ({
  fetchCoachMe: vi.fn(),
  updateCoachMe: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({
  getToken: vi.fn(() => 'mock-token'),
}))

describe('useCoachMe', () => {
  let mockFetchCoachMe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const module = require('@/api/coaches')
    mockFetchCoachMe = module.fetchCoachMe
  })

  it('retorna dados do coach quando query tem sucesso', async () => {
    const coachData = {
      id: 'coach_123',
      name: 'João Silva',
      specialty: 'Musculação',
      rating: 4.8,
    }
    mockFetchCoachMe.mockResolvedValue(coachData)

    const { result } = renderHook(() => useCoachMe(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toEqual(coachData)
    })
  })

  it('retorna erro quando query falha', async () => {
    const error = new Error('Failed to fetch coach')
    mockFetchCoachMe.mockRejectedValue(error)

    const { result } = renderHook(() => useCoachMe(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
      expect(result.current.error).toBeTruthy()
    })
  })

  it('isLoading true durante carregamento', async () => {
    const promise = new Promise(resolve =>
      setTimeout(() => resolve({ id: 'coach_123', name: 'João Silva' }), 50),
    )
    mockFetchCoachMe.mockReturnValue(promise)

    const { result } = renderHook(() => useCoachMe(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
