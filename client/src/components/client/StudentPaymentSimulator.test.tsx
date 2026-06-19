import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createWrapper } from '@/test/createWrapper'
import { StudentPaymentSimulator } from './StudentPaymentSimulator'

vi.mock('@/api/payments', () => ({
  createPayment: vi.fn(),
}))

function renderSimulator() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <StudentPaymentSimulator
        scheduleId="schedule_1"
        coachId="coach_1"
        studentId="student_1"
        amountCents={18000}
        amountLabel="R$ 180"
        coachName="Marcos V."
        specialtyLabel="Musculação"
        dateLabel="Sáb, 24 Jan · 08h00"
        onPaid={vi.fn()}
      />
    </Wrapper>,
  )
}

describe('StudentPaymentSimulator', () => {
  it('mostra o botão de pagamento sem abrir o modal de início', () => {
    renderSimulator()

    expect(screen.getByRole('button', { name: /pagar r\$ 180/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('abre o modal de pagamento ao clicar em PAGAR', () => {
    renderSimulator()

    fireEvent.click(screen.getByRole('button', { name: /pagar r\$ 180/i }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Confirme sua sessão')).toBeInTheDocument()
  })
})
