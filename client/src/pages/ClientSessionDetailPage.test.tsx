import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import ClientSessionDetailPage from './ClientSessionDetailPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import type { CoachDetail, StudentScheduleItem, StudentSchedulesResponse } from '@/types/api'

const coach: CoachDetail = {
  coachId: 'coach_border',
  status: 'APPROVED',
  profile: {
    name: 'Marcos Vieira',
    phone: null,
    specialties: ['Musculação'],
    cref: '123456-G/SP',
    instagram: null,
    profile_video: false,
  },
  work_location: [
    {
      type: 'GYM',
      gymId: 'gym_1',
      gym: { name: 'Studio X', neighborhood: 'Pinheiros', city: 'São Paulo', state: 'SP' },
    },
  ],
}

function makeItem(overrides: Partial<StudentScheduleItem>): StudentScheduleItem {
  return {
    scheduleId: 'sch_detail',
    coachId: 'coach_border',
    gymId: 'gym_1',
    specialtyId: 'MUSCULATION',
    price: '180.00',
    startDateTime: '2030-06-16T12:00:00-03:00',
    endDateTime: '2030-06-16T13:00:00-03:00',
    scheduleStatus: 'BOOKED',
    paymentStatus: null,
    request: null,
    ...overrides,
  }
}

function mockSchedules(item: StudentScheduleItem) {
  const response: StudentSchedulesResponse = {
    studentId: 'client_demo',
    count: 1,
    schedules: [item],
  }
  server.use(
    http.get('*/student/coach/schedules/request', () => HttpResponse.json(response)),
    http.get('*/student/coaches/coach_border', () => HttpResponse.json<CoachDetail>(coach)),
  )
}

function renderDetail(scheduleId: string) {
  loginAs('client')
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/client/schedule/${scheduleId}`]}>
        <Routes>
          <Route path="/client/schedule/:scheduleId" element={<ClientSessionDetailPage />} />
          <Route path="/client/schedule" element={<div>VOLTOU PARA AGENDA</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  )
}

beforeEach(() => {
  loginAs('client')
})

describe('ClientSessionDetailPage', () => {
  it('cancela apenas o pedido quando a sessão está pendente', async () => {
    let deletedId: string | null = null

    mockSchedules(
      makeItem({
        scheduleId: 'sch_pending',
        scheduleStatus: 'REQUESTED',
        request: {
          studentId: 'client_demo',
          status: 'REQUESTED',
          requestedAt: '2026-06-15T12:00:00Z',
        },
      }),
    )
    server.use(
      http.delete('*/student/coach/schedules/request', async ({ request }) => {
        deletedId = ((await request.json()) as { scheduleId: string }).scheduleId
        return HttpResponse.json({
          message: 'ok',
          scheduleId: deletedId,
          studentId: 'client_demo',
          scheduleStatus: 'AVAILABLE',
          cancelledAt: '2026-06-15T13:00:00Z',
        })
      }),
    )

    renderDetail('sch_pending')

    await userEvent.click(await screen.findByRole('button', { name: 'CANCELAR PEDIDO' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Cancelar pedido?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'CANCELAR PEDIDO' }))

    await waitFor(() => {
      expect(deletedId).toBe('sch_pending')
    })
    expect(await screen.findByText('VOLTOU PARA AGENDA')).toBeInTheDocument()
  })

  it('cancela a sessão confirmada quando há antecedência suficiente', async () => {
    let cancelledId: string | null = null

    mockSchedules(makeItem({ scheduleId: 'sch_booked', scheduleStatus: 'BOOKED' }))
    server.use(
      http.post('*/student/coach/schedules/cancel', async ({ request }) => {
        cancelledId = ((await request.json()) as { scheduleId: string }).scheduleId
        return HttpResponse.json({
          message: 'ok',
          scheduleId: cancelledId,
          status: 'CANCELLED',
          cancelledAt: '2026-06-15T13:00:00Z',
        })
      }),
    )

    renderDetail('sch_booked')

    await userEvent.click(await screen.findByRole('button', { name: 'CANCELAR SESSÃO' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Cancelar sessão?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'CANCELAR SESSÃO' }))

    await waitFor(() => {
      expect(cancelledId).toBe('sch_booked')
    })
    expect(await screen.findByText('VOLTOU PARA AGENDA')).toBeInTheDocument()
  })

  it('bloqueia o cancelamento quando a sessão começa em menos de 6 horas', async () => {
    const soon = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    mockSchedules(
      makeItem({ scheduleId: 'sch_soon', scheduleStatus: 'BOOKED', startDateTime: soon }),
    )

    renderDetail('sch_soon')

    const button = await screen.findByRole('button', { name: 'CANCELAR SESSÃO' })
    expect(button).toBeDisabled()
    expect(screen.getByText(/menos de 6 horas/i)).toBeInTheDocument()
  })
})
