import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import ClientSchedulePage from './ClientSchedulePage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import type { CoachDetail, StudentScheduleItem, StudentSchedulesResponse } from '@/types/api'

const createPaymentMock = vi.fn()

vi.mock('@/api/payments', () => ({
  createPayment: (...args: unknown[]) => createPaymentMock(...args),
}))

const coach: CoachDetail = {
  coachId: 'coach_border',
  name: 'Marcos Vieira',
  specialties: ['Musculação'],
  rating: 4.9,
  priceFrom: 180,
  neighborhood: 'Pinheiros',
  city: 'São Paulo',
  nextAvailability: 'Hoje',
  photo: null,
  cref: '123456-G/SP',
  bio: 'Coach de testes',
  experienceYears: 8,
  sessionsCount: 120,
  responseTime: 'até 1h',
  serviceAreas: ['Paulista'],
  trainingStyles: ['Presencial'],
  languages: ['Português'],
  instagram: null,
  reviews: [],
}

function makeSchedule(overrides: Partial<StudentScheduleItem>): StudentScheduleItem {
  return {
    scheduleId: 'schedule_default',
    coachId: 'coach_border',
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    price: '180.00',
    startDateTime: '2026-06-16T00:30:00Z',
    endDateTime: '2026-06-16T01:30:00Z',
    scheduleStatus: 'BOOKED',
    paymentStatus: null,
    request: null,
    ...overrides,
  }
}

function mockSchedulesResponse(schedules: StudentScheduleItem[]) {
  const response: StudentSchedulesResponse = {
    studentId: 'client_demo',
    count: schedules.length,
    schedules,
  }

  server.use(
    http.get('*/student/coach/schedules/request', () => HttpResponse.json(response)),
    http.get('*/coaches/coach_border', () => HttpResponse.json<CoachDetail>(coach)),
  )
}

function renderPage() {
  loginAs('client')
  const { wrapper: Wrapper, queryClient } = createWrapper()
  const view = render(
    <Wrapper>
      <MemoryRouter>
        <ClientSchedulePage />
      </MemoryRouter>
    </Wrapper>,
  )

  return { ...view, queryClient }
}

describe('ClientSchedulePage', () => {
  beforeEach(() => {
    createPaymentMock.mockReset()
  })

  it('mostra o dia do mes no fuso do Brasil em horarios na borda de timezone', async () => {
    mockSchedulesResponse([makeSchedule({ scheduleId: 'sch_border' })])

    renderPage()

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getByText('15')).toBeInTheDocument()
    expect(screen.getByText(/Musculação · seg\., 15 de jun\. · 21:30-22:30/i)).toBeInTheDocument()
    expect(screen.getAllByText('Confirmado')).toHaveLength(2)
  })

  it('mostra erro e recarrega a agenda ao tentar novamente', async () => {
    let shouldFail = true

    server.use(
      http.get('*/student/coach/schedules/request', () => {
        if (shouldFail) {
          return HttpResponse.json(
            { errors: ['Agenda temporariamente indisponível'] },
            { status: 500 },
          )
        }

        return HttpResponse.json({
          studentId: 'client_demo',
          count: 1,
          schedules: [makeSchedule({ scheduleId: 'schedule_after_retry' })],
        } satisfies StudentSchedulesResponse)
      }),
      http.get('*/coaches/coach_border', () => HttpResponse.json<CoachDetail>(coach)),
    )

    renderPage()

    expect(await screen.findByText('Agenda fora do ar')).toBeInTheDocument()
    expect(screen.getByText('Agenda temporariamente indisponível')).toBeInTheDocument()

    shouldFail = false
    fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }))

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
  })

  it('alterna filtros e mostra os estados vazios corretos', async () => {
    mockSchedulesResponse([makeSchedule({ scheduleId: 'schedule_upcoming_only' })])

    renderPage()

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }))
    expect(await screen.findByText('Nenhum pedido pendente agora.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Histórico' }))
    expect(
      await screen.findByText('Seu histórico aparece depois das primeiras sessões.'),
    ).toBeInTheDocument()
  })

  it('renderiza pedidos e historico, incluindo pagamento pendente', async () => {
    createPaymentMock.mockResolvedValue({ transactionId: 'tx_1' })

    mockSchedulesResponse([
      makeSchedule({ scheduleId: 'schedule_booked' }),
      makeSchedule({
        scheduleId: 'schedule_requested',
        scheduleStatus: 'REQUESTED',
        request: {
          studentId: 'client_demo',
          status: 'REQUESTED',
          requestedAt: '2026-06-15T12:00:00Z',
        },
      }),
      makeSchedule({
        scheduleId: 'schedule_pending_payment',
        scheduleStatus: 'COMPLETED',
        paymentStatus: 'PENDING',
      }),
      makeSchedule({
        scheduleId: 'schedule_paid',
        scheduleStatus: 'COMPLETED',
        paymentStatus: 'PAID',
      }),
      makeSchedule({
        scheduleId: 'schedule_rejected',
        scheduleStatus: 'CANCELLED',
        request: {
          studentId: 'client_demo',
          status: 'REJECTED',
          requestedAt: '2026-06-15T12:00:00Z',
        },
      }),
    ])

    const { queryClient } = renderPage()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    expect(await screen.findByText('Marcos Vieira')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pedidos' }))
    expect(await screen.findByText('Aguardando treinador')).toBeInTheDocument()
    expect(screen.getByText(/Pedido em seg\., 15 de jun\./i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Histórico' }))
    expect(await screen.findAllByText('Pagamento pendente')).toHaveLength(2)
    expect(screen.getByText('Pago')).toBeInTheDocument()
    expect(screen.getByText('Recusado')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /pagar r\$\s*180/i }))

    await waitFor(() => {
      expect(createPaymentMock).toHaveBeenCalledWith({
        sessionId: 'schedule_pending_payment',
        coachId: 'coach_border',
        studentId: 'client_demo',
        amount: 18000,
        method: 'pix',
      })
    })
    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['student-schedule-requests'] })
    })
  })
})
