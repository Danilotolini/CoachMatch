import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCoachMe } from '../useCoachMe'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useSessionStore } from '@/stores/sessionStore'

vi.mock('@/api/coaches', () => ({
  fetchCoachMe: vi.fn(),
  updateCoachMe: vi.fn(),
}))

describe('useCoachMe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useSessionStore.setState({
      activeRole: 'coach',
      sessions: { coach: { token: 'mock-token' } },
    })
  })

  it('retorna dados do coach quando query tem sucesso', async () => {
    const { fetchCoachMe } = await import('@/api/coaches')
    const coachData = {
      id: 'coach_123',
      name: 'João Silva',
      specialty: 'Musculação',
      rating: 4.8,
    }
    vi.mocked(fetchCoachMe).mockResolvedValue(coachData)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCoachMe(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.data).toEqual(coachData)
    })
  })

  it('retorna erro quando query falha', async () => {
    const { fetchCoachMe } = await import('@/api/coaches')
    const error = new Error('Failed to fetch coach')
    vi.mocked(fetchCoachMe).mockRejectedValue(error)

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCoachMe(), { wrapper })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it('isLoading true durante carregamento', async () => {
    const { fetchCoachMe } = await import('@/api/coaches')
    vi.mocked(fetchCoachMe).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ id: 'coach_123', name: 'João Silva' }), 50),
        ),
    )

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCoachMe(), { wrapper })

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})
