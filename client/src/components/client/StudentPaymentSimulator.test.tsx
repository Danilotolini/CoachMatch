import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/lib/http'
import { createWrapper } from '@/test/createWrapper'
import { StudentPaymentSimulator } from './StudentPaymentSimulator'

const createPaymentMock = vi.fn()

vi.mock('@/api/payments', () => ({
  createPayment: (...args: unknown[]) => createPaymentMock(...args),
}))

describe('StudentPaymentSimulator', () => {
  beforeEach(() => {
    createPaymentMock.mockReset()
  })

  it('envia o pagamento e notifica quando conclui', async () => {
    const onPaid = vi.fn()
    createPaymentMock.mockResolvedValue({ transactionId: 'tx_1' })

    const { wrapper: Wrapper } = createWrapper()
    render(
      <Wrapper>
        <StudentPaymentSimulator
          scheduleId="schedule_1"
          coachId="coach_1"
          studentId="student_1"
          amountCents={18000}
          amountLabel="R$ 180"
          onPaid={onPaid}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /pagar r\$ 180/i }))

    await waitFor(() => {
      expect(createPaymentMock).toHaveBeenCalledWith({
        sessionId: 'schedule_1',
        coachId: 'coach_1',
        studentId: 'student_1',
        amount: 18000,
        method: 'pix',
      })
    })
    await waitFor(() => {
      expect(onPaid).toHaveBeenCalledTimes(1)
    })
  })

  it('mostra o erro da api quando o pagamento falha', async () => {
    createPaymentMock.mockRejectedValue(
      new ApiError(422, 'POST /payments failed', { errors: ['PIX indisponível agora'] }),
    )

    const { wrapper: Wrapper } = createWrapper()
    render(
      <Wrapper>
        <StudentPaymentSimulator
          scheduleId="schedule_1"
          coachId="coach_1"
          studentId="student_1"
          amountCents={18000}
          amountLabel="R$ 180"
          onPaid={vi.fn()}
        />
      </Wrapper>,
    )

    fireEvent.click(screen.getByRole('button', { name: /pagar r\$ 180/i }))

    expect(await screen.findByText('PIX indisponível agora')).toBeInTheDocument()
  })

  it('desabilita o botao enquanto a mutation esta pendente', async () => {
    createPaymentMock.mockImplementation(() => new Promise(() => {}))

    const { wrapper: Wrapper } = createWrapper()
    render(
      <Wrapper>
        <StudentPaymentSimulator
          scheduleId="schedule_1"
          coachId="coach_1"
          studentId="student_1"
          amountCents={18000}
          amountLabel="R$ 180"
          onPaid={vi.fn()}
        />
      </Wrapper>,
    )

    const button = screen.getByRole('button', { name: /pagar r\$ 180/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(button).toBeDisabled()
    })
  })
})
