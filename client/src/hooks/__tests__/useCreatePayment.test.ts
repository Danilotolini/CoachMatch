import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCreatePayment } from '../useCreatePayment'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { makeCardPayment, makeTransaction } from '@/test/fixtures'

// Mock da API
vi.mock('@/api/payments', () => ({
  createPayment: vi.fn(),
}))

describe('useCreatePayment', () => {
  it('chama a mutation corretamente com payload de cartão', async () => {
    const { createPayment } = await import('@/api/payments')
    vi.mocked(createPayment).mockResolvedValue(makeTransaction())

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCreatePayment(), { wrapper })

    const cardPayload = makeCardPayment()

    result.current.mutate(cardPayload)

    await waitFor(() => {
      expect(vi.mocked(createPayment)).toHaveBeenCalledWith(cardPayload)
    })
  })

  it('retorna dados da transação em caso de sucesso', async () => {
    const { createPayment } = await import('@/api/payments')
    const transactionData = makeTransaction({ transactionId: 'txn_123' })
    vi.mocked(createPayment).mockResolvedValue(transactionData)

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCreatePayment(), { wrapper })

    result.current.mutate(makeCardPayment())

    await waitFor(() => {
      expect(result.current.data).toEqual(transactionData)
    })
  })

  it('retorna erro em caso de falha', async () => {
    const { createPayment } = await import('@/api/payments')
    const error = new Error('Payment failed')
    vi.mocked(createPayment).mockRejectedValue(error)

    const queryClient = new QueryClient({
      defaultOptions: {
        mutations: { retry: false },
      },
    })

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    const { result } = renderHook(() => useCreatePayment(), { wrapper })

    result.current.mutate(makeCardPayment())

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
