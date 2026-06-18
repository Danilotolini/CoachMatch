import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/http'
import { StudentPaymentModal } from './StudentPaymentModal'

const mutateMock = vi.fn()

vi.mock('@/hooks/useCreatePayment', () => ({
  useCreatePayment: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

function renderModal(overrides?: { onPaid?: () => void; onClose?: () => void }) {
  const onPaid = overrides?.onPaid ?? vi.fn()
  const onClose = overrides?.onClose ?? vi.fn()
  render(
    <StudentPaymentModal
      scheduleId="schedule_1"
      coachId="coach_1"
      studentId="student_1"
      amountCents={18000}
      amountLabel="R$ 180,00"
      coachName="Marcos V."
      specialtyLabel="Musculação"
      dateLabel="Sáb, 24 Jan · 08h00"
      onPaid={onPaid}
      onClose={onClose}
    />,
  )
  return { onPaid, onClose }
}

describe('StudentPaymentModal', () => {
  beforeEach(() => {
    mutateMock.mockReset()
  })

  it('preenche o valor automaticamente e abre em PIX por padrão', () => {
    renderModal()

    expect(screen.getByText('Confirme sua sessão')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 180,00').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Já realizei o pagamento/i })).toBeInTheDocument()
  })

  it('confirma o PIX com o valor preenchido e notifica ao concluir', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'approved' })
    })
    const { onPaid, onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: /Já realizei o pagamento/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      {
        sessionId: 'schedule_1',
        method: 'pix',
        amount: 18000,
        coachId: 'coach_1',
        studentId: 'student_1',
      },
      expect.any(Object),
    )
    expect(await screen.findByText('Pagamento Confirmado!')).toBeInTheDocument()

    // onPaid só dispara ao fechar, para a tela de sucesso não desmontar antes.
    expect(onPaid).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /Concluir/i }))
    expect(onPaid).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('valida o cartão antes de enviar e processa a aprovação', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'approved' })
    })
    renderModal()

    await user.click(screen.getByRole('button', { name: /Cartão/i }))
    await user.click(screen.getByRole('button', { name: /Pagar R\$\s*180,00/i }))

    expect(screen.getByText('Número deve ter 16 dígitos.')).toBeInTheDocument()
    expect(mutateMock).not.toHaveBeenCalled()

    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4111111111111111')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'Maria Silva')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1229')
    await user.type(screen.getByPlaceholderText('000'), '123')
    await user.click(screen.getByRole('button', { name: /Pagar R\$\s*180,00/i }))

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: 'schedule_1',
        method: 'credit_card',
        amount: 18000,
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
  })

  it('mostra recusa do cartão e permite tentar novamente', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onSuccess?.({ status: 'refused' })
    })
    renderModal()

    await user.click(screen.getByRole('button', { name: /Cartão/i }))
    await user.type(screen.getByPlaceholderText('0000 0000 0000 0000'), '4222222222222222')
    await user.type(screen.getByPlaceholderText('Como está no cartão'), 'Joao Silva')
    await user.type(screen.getByPlaceholderText('MM/AA'), '1130')
    await user.type(screen.getByPlaceholderText('000'), '456')
    await user.click(screen.getByRole('button', { name: /Pagar R\$\s*180,00/i }))

    expect(await screen.findByText('Pagamento Recusado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Tentar novamente/i }))
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('mostra o erro da API quando a mutation falha', async () => {
    const user = userEvent.setup()
    mutateMock.mockImplementation((_payload, options) => {
      options?.onError?.(
        new ApiError(422, 'POST /payments failed', { errors: ['PIX indisponível'] }),
      )
    })
    renderModal()

    await user.click(screen.getByRole('button', { name: /Já realizei o pagamento/i }))

    expect(await screen.findByText('PIX indisponível')).toBeInTheDocument()
  })

  it('fecha sem notificar pagamento quando o usuário desiste', async () => {
    const user = userEvent.setup()
    const { onPaid, onClose } = renderModal()

    await user.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onPaid).not.toHaveBeenCalled()
  })
})
