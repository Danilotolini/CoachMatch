import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCreatePayment } from '../useCreatePayment'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

vi.mock('@/api/payments', () => ({
  createPayment: vi.fn(),
}))

describe('useCreatePayment', () => {
  let mockCreatePayment: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const module = require('@/api/payments')
    mockCreatePayment = module.createPayment
  })

  it('chama a mutation corretamente com payload de cartão', async () => {
    mockCreatePayment.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    const cardPayload = {
      method: 'card' as const,
      cardNumber: '4111111111111111',
      holder: 'JOHN DOE',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
    }

    result.current.mutate(cardPayload)

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalledWith(cardPayload)
    })
  })

  it('chama a mutation corretamente com payload PIX', async () => {
    mockCreatePayment.mockResolvedValue({ success: true })

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    const pixPayload = {
      method: 'pix' as const,
      pixKey: 'pix_mock_00020126580014br.gov.bcb.pix0136mock-uuid',
    }

    result.current.mutate(pixPayload)

    await waitFor(() => {
      expect(mockCreatePayment).toHaveBeenCalledWith(pixPayload)
    })
  })

  it('retorna isPending true durante processamento', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    mockCreatePayment.mockReturnValue(promise)

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isPending).toBe(false)

    result.current.mutate({
      method: 'card' as const,
      cardNumber: '4111111111111111',
      holder: 'JOHN DOE',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
    })

    expect(result.current.isPending).toBe(true)

    await waitFor(() => {
      expect(result.current.isPending).toBe(false)
    })
  })

  it('retorna dados da transação em caso de sucesso', async () => {
    const transactionData = {
      success: true,
      transactionId: 'txn_123',
      status: 'approved',
    }
    mockCreatePayment.mockResolvedValue(transactionData)

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      method: 'card' as const,
      cardNumber: '4111111111111111',
      holder: 'JOHN DOE',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(transactionData)
    })
  })

  it('retorna erro em caso de falha', async () => {
    const error = new Error('Payment failed')
    mockCreatePayment.mockRejectedValue(error)

    const { result } = renderHook(() => useCreatePayment(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      method: 'card' as const,
      cardNumber: '4111111111111111',
      holder: 'JOHN DOE',
      expiryMonth: '12',
      expiryYear: '2025',
      cvv: '123',
    })

    await waitFor(() => {
      expect(result.current.error).toBeTruthy()
    })
  })
})
