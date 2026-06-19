import { describe, expect, it, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import PaymentPage from './PaymentPage'

const mutateMock = vi.fn()
const useCoachMeMock = vi.fn()

vi.mock('@/hooks/useCreatePayment', () => ({
  useCreatePayment: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

vi.mock('@/hooks/useCoachMe', () => ({
  useCoachMe: () => useCoachMeMock(),
}))

vi.mock('@/components/layout/ProgressHeader', () => ({
  ProgressHeader: ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
    <div>{`progress ${currentStep}/${totalSteps}`}</div>
  ),
}))

function renderPage(initialEntry = '/payment/session_123') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/payment/:sessionId" element={<PaymentPage />} />
        <Route path="/payment" element={<PaymentPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PaymentPage', () => {
  const payButtonName = /Pagar R\$\s*180,00/i

  beforeEach(() => {
    mutateMock.mockReset()
    useCoachMeMock.mockReset()
    useCoachMeMock.mockReturnValue({
      data: {
        email: 'coach@example.com',
      },
    })
  })

  it('abre em PIX por padrão e permite alternar para cartão com validações', async () => {
    const user = userEvent.setup()
    renderPage()

    expect(screen.getByText('Pague com PIX')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Já realizei o pagamento/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Cartão/i }))

    expect(screen.getByText('Dados do Cartão')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: payButtonName }))

    expect(screen.getByText('Número deve ter 16 dígitos.')).toBeInTheDocument()
    expect(screen.getByText('Nome muito curto.')).toBeInTheDocument()
    expect(screen.getByText('Validade inválida.')).toBeInTheDocument()
    expect(screen.getByText('CVV inválido.')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()
  })

  it('envia pagamento com cartão e mostra sucesso aprovado', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'approved' })
    })

    renderPage('/payment/session_card_ok')

    await user.click(screen.getByRole('button', { name: /Cartão/i }))
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'Maria Silva')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1229')
    await user.type(screen.getByPlaceholderText('000'), '123')
    await user.click(screen.getByRole('button', { name: payButtonName }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_card_ok',
        method: 'credit_card',
        amount: 18000,
        coachId: 'coach@example.com',
        studentId: 'coach@example.com',
        card: {
          number: '4111 1111 1111 1111',
          holder: 'MARIA SILVA',
          expiryMonth: '12',
          expiryYear: '2029',
          cvv: '123',
        },
      }),
      expect.any(Object),
    )

    expect(await screen.findByText('Pagamento Confirmado!')).toBeInTheDocument()
    expect(screen.getByText(/processados com sucesso/i)).toBeInTheDocument()
    expect(screen.getByText('Sessão')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir para o Dashboard/i })).toBeInTheDocument()
  })

  it('mostra recusa no cartão e permite tentar novamente', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'refused' })
    })

    renderPage('/payment/session_card_refused')

    await user.click(screen.getByRole('button', { name: /Cartão/i }))
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4222222222222222')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'Joao Silva')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1130')
    await user.type(screen.getByPlaceholderText('000'), '456')
    await user.click(screen.getByRole('button', { name: payButtonName }))

    expect(await screen.findByText('Pagamento Recusado')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ir para o Dashboard/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }))

    expect(await screen.findByText('Método de Pagamento')).toBeInTheDocument()
  })

  it('confirma PIX, usa fallback sem sessionId e mostra estorno', async () => {
    const user = userEvent.setup()
    useCoachMeMock.mockReturnValue({ data: undefined })
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'refunded' })
    })

    renderPage('/payment')

    await user.click(screen.getByRole('button', { name: /Já realizei o pagamento/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'session_mock_001',
        method: 'pix',
        coachId: 'coach_mock',
        studentId: 'student_mock',
      }),
      expect.any(Object),
    )

    expect(await screen.findByText('Pagamento Estornado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ir para o Dashboard/i })).toBeInTheDocument()
  })

  it('mostra erro ao processar PIX quando a mutation falha', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onError?.(new Error('Falha no gateway'))
    })

    renderPage('/payment/session_pix_error')

    await user.click(screen.getByRole('button', { name: /Já realizei o pagamento/i }))

    expect(await screen.findByText('Falha no gateway')).toBeInTheDocument()
    expect(screen.getByText('Pague com PIX')).toBeInTheDocument()
  })
})
