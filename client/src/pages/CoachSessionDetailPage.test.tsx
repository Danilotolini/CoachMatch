import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachSessionDetailPage from './CoachSessionDetailPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import type { CoachScheduleResponse, CoachStudentDetail, Schedule } from '@/types/api'

function makeSchedule(overrides: Partial<Schedule>): Schedule {
  return {
    scheduleId: 'sch_req',
    coachId: 'mock-coach-id',
    gymId: 'gym_smartfit_paulista',
    specialtyId: 'MUSCULATION',
    startDateTime: '2030-12-01T09:00:00-03:00',
    endDateTime: '2030-12-01T10:00:00-03:00',
    price: '120.00',
    status: 'REQUESTED',
    studentId: null,
    paymentStatus: null,
    rating: null,
    studentComment: null,
    requests: null,
    createdAt: '2026-11-01T10:00:00Z',
    updatedAt: '2026-11-01T10:00:00Z',
    ...overrides,
  }
}

function scheduleResponse(schedule: Schedule): CoachScheduleResponse {
  return {
    coachId: 'mock-coach-id',
    startDateTime: '',
    endDateTime: '',
    count: 1,
    schedules: [schedule],
  }
}

const STUDENT_NAMES: Record<string, string> = {
  student_001: 'Ana Ferreira',
  student_002: 'Bruno Lima',
  student_003: 'Carla Mendes',
}

function mockStudentDetail() {
  server.use(
    http.get('*/coach/students/:studentId', ({ params }) => {
      const studentId = params['studentId'] as string
      return HttpResponse.json<CoachStudentDetail>({
        studentId,
        name: STUDENT_NAMES[studentId] ?? studentId,
        birthDate: null,
        gender: null,
        goal: null,
        health: null,
      })
    }),
  )
}

function renderDetail(scheduleId: string) {
  loginAs('coach')
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MemoryRouter initialEntries={[`/coach/schedule/${scheduleId}`]}>
        <Routes>
          <Route path="/coach/schedule/:scheduleId" element={<CoachSessionDetailPage />} />
          <Route path="/coach/schedule" element={<div>VOLTOU PARA AGENDA</div>} />
        </Routes>
      </MemoryRouter>
    </Wrapper>,
  )
}

beforeEach(() => {
  loginAs('coach')
})

describe('CoachSessionDetailPage', () => {
  it('lista todos os alunos que solicitaram e aprova o escolhido', async () => {
    let approveBody: { scheduleId: string; studentId: string } | null = null

    server.use(
      http.get('*/coach/schedule', () =>
        HttpResponse.json<CoachScheduleResponse>(
          scheduleResponse(
            makeSchedule({
              requests: [
                {
                  studentId: 'student_001',
                  status: 'REQUESTED',
                  requestedAt: '2026-11-01T10:00:00Z',
                },
                {
                  studentId: 'student_002',
                  status: 'REQUESTED',
                  requestedAt: '2026-11-01T11:00:00Z',
                },
              ],
            }),
          ),
        ),
      ),
      http.get('*/coach/schedule/requests', () =>
        HttpResponse.json({
          scheduleId: 'sch_req',
          startDateTime: '2030-12-01T09:00:00-03:00',
          endDateTime: '2030-12-01T10:00:00-03:00',
          status: 'REQUESTED',
          count: 2,
          requests: [
            {
              studentId: 'student_001',
              status: 'REQUESTED',
              requestedAt: '2026-11-01T10:00:00Z',
              studentName: 'Ana Ferreira',
            },
            {
              studentId: 'student_002',
              status: 'REQUESTED',
              requestedAt: '2026-11-01T11:00:00Z',
              studentName: 'Bruno Lima',
            },
          ],
        }),
      ),
      http.post('*/coach/schedule/approve', async ({ request }) => {
        approveBody = (await request.json()) as typeof approveBody
        return HttpResponse.json({
          message: 'ok',
          scheduleId: 'sch_req',
          studentId: approveBody?.studentId,
          status: 'BOOKED',
        })
      }),
    )
    mockStudentDetail()

    renderDetail('sch_req')

    expect(await screen.findByText('Ana Ferreira')).toBeInTheDocument()
    expect(await screen.findByText('Bruno Lima')).toBeInTheDocument()

    const approveButtons = await screen.findAllByRole('button', { name: /aprovar/i })
    expect(approveButtons).toHaveLength(2)

    await userEvent.click(approveButtons[0])

    await waitFor(() => {
      expect(approveBody).toEqual({ scheduleId: 'sch_req', studentId: 'student_001' })
    })
  })

  it('cancela a sessão pedindo confirmação e volta para a agenda', async () => {
    let cancelledId: string | null = null

    server.use(
      http.get('*/coach/schedule', () =>
        HttpResponse.json<CoachScheduleResponse>(
          scheduleResponse(
            makeSchedule({
              scheduleId: 'sch_booked',
              status: 'BOOKED',
              studentId: 'student_003',
              requests: [
                {
                  studentId: 'student_003',
                  status: 'APPROVED',
                  requestedAt: '2026-11-01T10:00:00Z',
                  studentName: 'Carla Mendes',
                },
              ],
            }),
          ),
        ),
      ),
      http.post('*/coach/schedule/cancel', async ({ request }) => {
        const body = (await request.json()) as { scheduleId: string }
        cancelledId = body.scheduleId
        return HttpResponse.json({
          message: 'cancelled',
          scheduleId: body.scheduleId,
          status: 'CANCELLED',
          notifiedStudents: 1,
          cancelledAt: '2026-11-02T10:00:00Z',
        })
      }),
    )
    mockStudentDetail()

    renderDetail('sch_booked')

    expect(await screen.findByText('Carla Mendes')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'CANCELAR SESSÃO' }))

    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Cancelar sessão?')).toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole('button', { name: 'CANCELAR SESSÃO' }))

    await waitFor(() => {
      expect(cancelledId).toBe('sch_booked')
    })
    expect(await screen.findByText('VOLTOU PARA AGENDA')).toBeInTheDocument()
  })
})
