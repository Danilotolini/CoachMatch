import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionSummaryModal } from './SessionSummaryModal'
import type { Schedule } from '@/types/api'

const BASE_SLOT: Schedule = {
  scheduleId: 's1',
  coachId: 'c1',
  status: 'BOOKED',
  startDateTime: '2026-08-10T10:00:00-03:00',
  endDateTime: '2026-08-10T11:00:00-03:00',
  price: '150',
  paymentStatus: 'PAID',
  requests: [],
  specialties: [],
  gymId: null,
}

describe('SessionSummaryModal', () => {
  it('renderiza o diálogo da sessão', () => {
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        specialtyLabel="Musculação"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    // specialtyLabel aparece tanto no título quanto na linha "Especialidade"
    expect(screen.getAllByText('Musculação').length).toBeGreaterThanOrEqual(1)
  })

  it('exibe o nome da contraparte quando fornecido', () => {
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        counterpartName="Carlos Silva"
        specialtyLabel="Yoga"
        onClose={vi.fn()}
      />,
    )
    // O título mostra o nome da contraparte
    expect(screen.getByRole('heading', { name: 'Carlos Silva' })).toBeInTheDocument()
  })

  it('mostra o status de pagamento para o aluno', () => {
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        specialtyLabel="Yoga"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Pago')).toBeInTheDocument()
  })

  it('não mostra status de pagamento para o treinador', () => {
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="coach"
        specialtyLabel="Yoga"
        onClose={vi.fn()}
      />,
    )
    expect(screen.queryByText('Pago')).not.toBeInTheDocument()
  })

  it('mostra solicitações pendentes para o treinador em status REQUESTED', () => {
    const slot = {
      ...BASE_SLOT,
      status: 'REQUESTED' as const,
      requests: [
        { requestId: 'r1', studentId: 'st1', status: 'REQUESTED' as const },
        { requestId: 'r2', studentId: 'st2', status: 'REQUESTED' as const },
      ],
    }
    render(
      <SessionSummaryModal
        slot={slot}
        viewer="coach"
        specialtyLabel="Yoga"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText(/2.*pendentes/i)).toBeInTheDocument()
  })

  it('chama onClose ao clicar no botão Fechar', async () => {
    const onClose = vi.fn()
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        specialtyLabel="Yoga"
        onClose={onClose}
      />,
    )
    // Há dois botões "Fechar": o backdrop (aria-label) e o botão visível (texto)
    const buttons = screen.getAllByRole('button', { name: /fechar/i })
    const closeBtn = buttons.find((btn) => btn.textContent?.trim() === 'Fechar')
    await userEvent.click(closeBtn!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('exibe botão Ver detalhes quando onViewDetails é fornecido', async () => {
    const onViewDetails = vi.fn()
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        specialtyLabel="Yoga"
        onViewDetails={onViewDetails}
        onClose={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /ver detalhes/i }))
    expect(onViewDetails).toHaveBeenCalledTimes(1)
  })

  it('exibe o label da academia quando gymLabel é fornecido', () => {
    render(
      <SessionSummaryModal
        slot={BASE_SLOT}
        viewer="client"
        specialtyLabel="Yoga"
        gymLabel="Smart Fit Paulista"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Smart Fit Paulista')).toBeInTheDocument()
  })

  it('exibe pagamento Pendente para status PENDING', () => {
    render(
      <SessionSummaryModal
        slot={{ ...BASE_SLOT, paymentStatus: 'PENDING' }}
        viewer="client"
        specialtyLabel="Yoga"
        onClose={vi.fn()}
      />,
    )
    expect(screen.getByText('Pendente')).toBeInTheDocument()
  })
})
