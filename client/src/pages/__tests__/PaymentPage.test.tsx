import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentPage } from '../../pages/PaymentPage'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import React from 'react'

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      BrowserRouter,
      null,
      React.createElement(QueryClientProvider, { client: queryClient }, children),
    )
}

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ coachId: 'coach_123' }),
  }
})

vi.mock('@/hooks/useCreatePayment', () => ({
  useCreatePayment: () => ({
    mutate: vi.fn(),
    isPending: false,
    data: null,
    error: null,
  }),
}))

vi.mock('@/hooks/useCoachMe', () => ({
  useCoachMe: () => ({
    data: { id: 'coach_123', name: 'Marcos V.' },
    isLoading: false,
    error: null,
  }),
}))

describe('PaymentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza o formulário de cartão por padrão', () => {
    render(<PaymentPage />, { wrapper: createWrapper() })

    expect(screen.getByPlaceholderText(/0000 0000 0000 0000/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Como está/i)).toBeInTheDocument()
  })

  it('alterna para formulário de cartão ao clicar em "Cartão de Crédito"', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: createWrapper() })

    const pixButton = screen.getByRole('button', { name: /PIX/i })
    await user.click(pixButton)

    expect(screen.queryByPlaceholderText(/0000 0000 0000 0000/i)).not.toBeInTheDocument()

    const cardButton = screen.getByRole('button', { name: /Cartão de Crédito/i })
    await user.click(cardButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/0000 0000 0000 0000/i)).toBeInTheDocument()
    })
  })

  it('alterna para PIX ao clicar em "PIX"', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: createWrapper() })

    const pixButton = screen.getByRole('button', { name: /PIX/i })
    await user.click(pixButton)

    await waitFor(() => {
      expect(screen.getByText(/pix_mock_/i)).toBeInTheDocument()
    })
  })

  it('exibe erro de validação ao submeter número de cartão inválido', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: createWrapper() })

    const cardInput = screen.getByPlaceholderText(/0000 0000 0000 0000/i)
    await user.type(cardInput, '1234')

    const nameInput = screen.getByPlaceholderText(/Como está/i)
    await user.type(nameInput, 'John Doe')

    const submitButton = screen.getByRole('button', { name: /Pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Número deve ter 16 dígitos/i)).toBeInTheDocument()
    })
  })

  it('exibe erro de validação ao submeter nome muito curto', async () => {
    const user = userEvent.setup()
    render(<PaymentPage />, { wrapper: createWrapper() })

    const cardInput = screen.getByPlaceholderText(/0000 0000 0000 0000/i)
    await user.type(cardInput, '4111111111111111')

    const nameInput = screen.getByPlaceholderText(/Como está/i)
    await user.type(nameInput, 'Jo')

    const submitButton = screen.getByRole('button', { name: /Pagar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/Nome muito curto/i)).toBeInTheDocument()
    })
  })

  it('exibe tela de sucesso após pagamento aprovado', async () => {
    const { useCreatePayment } = await import('@/hooks/useCreatePayment')
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { status: 'approved' },
      error: null,
    } as any)

    render(<PaymentPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Pagamento Confirmado/i)).toBeInTheDocument()
    })
  })

  it('exibe tela de recusado após pagamento recusado', async () => {
    const { useCreatePayment } = await import('@/hooks/useCreatePayment')
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { status: 'refused' },
      error: null,
    } as any)

    render(<PaymentPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Pagamento Recusado/i)).toBeInTheDocument()
    })
  })

  it('exibe tela de pendente após pagamento pendente', async () => {
    const { useCreatePayment } = await import('@/hooks/useCreatePayment')
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { status: 'pending' },
      error: null,
    } as any)

    render(<PaymentPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Aguardando Confirmação/i)).toBeInTheDocument()
    })
  })

  it('botão "Tentar novamente" reseta o formulário', async () => {
    const user = userEvent.setup()
    const { useCreatePayment } = await import('@/hooks/useCreatePayment')
    const mockMutate = vi.fn()
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      data: { status: 'refused' },
      error: null,
    } as any)

    render(<PaymentPage />, { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText(/Pagamento Recusado/i)).toBeInTheDocument()
    })

    const retryButton = screen.getByRole('button', { name: /Tentar novamente/i })
    await user.click(retryButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/0000 0000 0000 0000/i)).toBeInTheDocument()
    })
  })

  it('link "Ir para o Dashboard" aparece apenas no estado aprovado', async () => {
    const { useCreatePayment } = await import('@/hooks/useCreatePayment')

    // Test that it doesn't appear when data is null
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: null,
      error: null,
    } as any)

    const { rerender } = render(<PaymentPage />, { wrapper: createWrapper() })

    expect(screen.queryByText(/Ir para o Dashboard/i)).not.toBeInTheDocument()

    // Test that it appears when status is approved
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { status: 'approved' },
      error: null,
    } as any)

    rerender(<PaymentPage />)

    await waitFor(() => {
      expect(screen.getByText(/Ir para o Dashboard/i)).toBeInTheDocument()
    })

    // Test that it doesn't appear when status is refused
    vi.mocked(useCreatePayment).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      data: { status: 'refused' },
      error: null,
    } as any)

    rerender(<PaymentPage />)

    await waitFor(() => {
      expect(screen.queryByText(/Ir para o Dashboard/i)).not.toBeInTheDocument()
    })
  })
})
