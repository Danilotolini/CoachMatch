import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachSchedulePage from './CoachSchedulePage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import { loginAs } from '@/test/session'
import type { Coach, CoachScheduleResponse, Schedule } from '@/types/api'

function renderPage() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MemoryRouter>
        <CoachSchedulePage />
      </MemoryRouter>
    </Wrapper>,
  )
}

// Coach aprovado, com uma academia e especialidade — habilita os selects do
// formulário de geração em lote e a resolução de labels na agenda.
const approvedCoach: Coach = {
  ...initialCoach,
  status: 'APPROVED',
  profile: {
    ...initialCoach.profile,
    name: 'João Silva',
    specialties: ['MUSCULATION'],
  },
  work_location: [{ type: 'GYM', gymId: 'gym_smartfit_paulista' }],
}

function useApprovedCoach() {
  server.use(http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)))
}

function makeSchedule(overrides: Partial<Schedule>): Schedule {
  return {
    scheduleId: 'sch_0001',
    coachId: 'mock-coach-id',
    gymId: 'gym_smartfit_paulista',
    specialtyId: 'MUSCULATION',
    startDateTime: '2026-12-01T09:00:00-03:00',
    endDateTime: '2026-12-01T10:00:00-03:00',
    price: '120.00',
    status: 'AVAILABLE',
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

function scheduleResponse(schedules: Schedule[]): CoachScheduleResponse {
  return {
    coachId: 'mock-coach-id',
    startDateTime: '',
    endDateTime: '',
    count: schedules.length,
    schedules,
  }
}

// Data YYYY-MM-DD deslocada em dias a partir de agora, para gerar slots
// passados/futuros independente do relógio em que o teste roda.
function dayOffset(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)
}

function approvedRequest(studentName: string) {
  return {
    studentId: 'student_001',
    status: 'APPROVED' as const,
    requestedAt: '2026-11-01T10:00:00Z',
    studentName,
  }
}

beforeEach(() => {
  loginAs('coach')
})

describe('CoachSchedulePage', () => {
  it('lista apenas academias e especialidades do coach na geração em lote', async () => {
    server.use(
      http.get('*/coach/me', () =>
        HttpResponse.json<Coach>({
          ...initialCoach,
          status: 'APPROVED',
          profile: {
            ...initialCoach.profile,
            name: 'João Silva',
            specialties: ['MUSCULATION', 'FUNCTIONAL'],
          },
          work_location: [{ type: 'GYM', gymId: 'gym_smartfit_paulista' }],
        }),
      ),
    )

    renderPage()

    await userEvent.click(screen.getByRole('tab', { name: /criar horários/i }))

    expect(await screen.findByRole('option', { name: /Smart Fit Paulista/i })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Musculação' })).toBeInTheDocument()
    expect(await screen.findByRole('option', { name: 'Funcional' })).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('option', { name: /Bluefit Pinheiros/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('option', { name: 'CrossFit' })).not.toBeInTheDocument()
    })
  })

  describe('aba Agenda', () => {
    it('mostra solicitações pendentes e aprova um aluno', async () => {
      let approveBody: { scheduleId: string; studentId: string } | null = null

      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_req',
                status: 'REQUESTED',
                requests: [
                  {
                    studentId: 'student_001',
                    status: 'REQUESTED',
                    requestedAt: '2026-11-01T10:00:00Z',
                  },
                ],
              }),
            ]),
          ),
        ),
        http.get('*/coach/schedule/requests', () =>
          HttpResponse.json({
            scheduleId: 'sch_req',
            startDateTime: '2026-12-01T09:00:00-03:00',
            endDateTime: '2026-12-01T10:00:00-03:00',
            status: 'REQUESTED',
            count: 1,
            requests: [
              {
                studentId: 'student_001',
                status: 'REQUESTED',
                requestedAt: '2026-11-01T10:00:00Z',
                studentName: 'Ana Ferreira',
              },
            ],
          }),
        ),
        http.post('*/coach/schedule/approve', async ({ request }) => {
          approveBody = (await request.json()) as typeof approveBody
          return HttpResponse.json({
            message: 'ok',
            scheduleId: 'sch_req',
            studentId: 'student_001',
            status: 'BOOKED',
          })
        }),
      )

      renderPage()

      expect(await screen.findByText(/1 aguardando resposta/i)).toBeInTheDocument()
      const approveButton = await screen.findByRole('button', { name: /aprovar/i })
      expect(await screen.findByText('Ana Ferreira')).toBeInTheDocument()

      await userEvent.click(approveButton)

      await waitFor(() => {
        expect(approveBody).toEqual({ scheduleId: 'sch_req', studentId: 'student_001' })
      })
    })

    it('abre o modal da sessão ao clicar num card de solicitação pendente', async () => {
      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_req',
                status: 'REQUESTED',
                requests: [
                  {
                    studentId: 'student_001',
                    status: 'REQUESTED',
                    requestedAt: '2026-11-01T10:00:00Z',
                  },
                ],
              }),
            ]),
          ),
        ),
        http.get('*/coach/schedule/requests', () =>
          HttpResponse.json({
            scheduleId: 'sch_req',
            startDateTime: '2026-12-01T09:00:00-03:00',
            endDateTime: '2026-12-01T10:00:00-03:00',
            status: 'REQUESTED',
            count: 1,
            requests: [
              {
                studentId: 'student_001',
                status: 'REQUESTED',
                requestedAt: '2026-11-01T10:00:00Z',
                studentName: 'Ana Ferreira',
              },
            ],
          }),
        ),
      )

      renderPage()

      expect(await screen.findByText(/1 aguardando resposta/i)).toBeInTheDocument()
      const pendingSection = screen
        .getByText('Solicitações pendentes')
        .closest('section') as HTMLElement
      await userEvent.click(within(pendingSection).getByRole('button', { name: /01 de dez/i }))

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByRole('button', { name: /ver detalhes/i })).toBeInTheDocument()
      expect(within(dialog).getByText('1 pendente')).toBeInTheDocument()
    })

    it('cancela um horário agendado pedindo confirmação', async () => {
      let cancelledId: string | null = null

      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
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
            ]),
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

      renderPage()

      // Expande o grupo externo e depois o dia para revelar a linha do horário.
      await userEvent.click(await screen.findByRole('button', { name: /lista de horários/i }))
      await userEvent.click(await screen.findByRole('button', { name: /01 de dez/i }))

      await userEvent.click(await screen.findByRole('button', { name: 'Cancelar horário' }))

      // Status BOOKED dispara o diálogo de confirmação.
      expect(await screen.findByText('Cancelar horário?')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'CANCELAR HORÁRIO' }))

      await waitFor(() => {
        expect(cancelledId).toBe('sch_booked')
      })
    })
  })

  describe('lista de horários', () => {
    it('não lista horários passados que estão disponíveis', async () => {
      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_past_avail',
                status: 'AVAILABLE',
                startDateTime: `${dayOffset(-2)}T08:00:00-03:00`,
                endDateTime: `${dayOffset(-2)}T09:00:00-03:00`,
              }),
            ]),
          ),
        ),
      )

      renderPage()

      expect(await screen.findByText(/0 horários no período/i)).toBeInTheDocument()

      await userEvent.click(await screen.findByRole('button', { name: /lista de horários/i }))
      expect(await screen.findByText(/Nenhum horário criado neste intervalo/i)).toBeInTheDocument()
    })

    it('mantém na lista os horários futuros que estão disponíveis', async () => {
      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_future_avail',
                status: 'AVAILABLE',
                startDateTime: `${dayOffset(10)}T14:00:00-03:00`,
                endDateTime: `${dayOffset(10)}T15:00:00-03:00`,
              }),
            ]),
          ),
        ),
      )

      renderPage()

      expect(await screen.findByText(/1 horário no período/i)).toBeInTheDocument()

      await userEvent.click(await screen.findByRole('button', { name: /lista de horários/i }))
      expect(screen.queryByText(/Nenhum horário criado neste intervalo/i)).not.toBeInTheDocument()
    })
  })

  describe('histórico de sessões', () => {
    it('lista apenas sessões fechadas, da mais recente para a mais antiga', async () => {
      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_completed',
                status: 'COMPLETED',
                startDateTime: `${dayOffset(-1)}T09:00:00-03:00`,
                endDateTime: `${dayOffset(-1)}T10:00:00-03:00`,
                requests: [approvedRequest('Bruno Lima')],
              }),
              makeSchedule({
                scheduleId: 'sch_noshow',
                status: 'NOSHOW',
                startDateTime: `${dayOffset(-3)}T09:00:00-03:00`,
                endDateTime: `${dayOffset(-3)}T10:00:00-03:00`,
                requests: [approvedRequest('Carla Souza')],
              }),
              // Futuro disponível: não deve entrar no histórico.
              makeSchedule({
                scheduleId: 'sch_future_avail',
                status: 'AVAILABLE',
                startDateTime: `${dayOffset(5)}T09:00:00-03:00`,
                endDateTime: `${dayOffset(5)}T10:00:00-03:00`,
              }),
            ]),
          ),
        ),
      )

      renderPage()

      const subtitle = await screen.findByText(/2 sessões fechadas no período/i)
      const section = within(subtitle.closest('section') as HTMLElement)

      const completed = section.getByText(/Bruno Lima/)
      const noShow = section.getByText(/Carla Souza/)
      expect(section.getByText('Concluído')).toBeInTheDocument()
      expect(section.getByText('Aluno Ausente')).toBeInTheDocument()

      // Mais recente (COMPLETED, ontem) vem antes da mais antiga (NOSHOW, 3 dias atrás).
      expect(
        completed.compareDocumentPosition(noShow) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })

    it('mostra estado vazio e não exibe a antiga mensagem de pagamento', async () => {
      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(
            scheduleResponse([
              makeSchedule({
                scheduleId: 'sch_future_avail',
                status: 'AVAILABLE',
                startDateTime: `${dayOffset(5)}T09:00:00-03:00`,
                endDateTime: `${dayOffset(5)}T10:00:00-03:00`,
              }),
            ]),
          ),
        ),
      )

      renderPage()

      expect(await screen.findByText(/Nenhuma sessão fechada no período/i)).toBeInTheDocument()
      expect(screen.queryByText(/pagamento sob cuidado da plataforma/i)).not.toBeInTheDocument()
    })
  })

  describe('aba Criar horários', () => {
    it('gera a prévia em lote e confirma os slots criados', async () => {
      useApprovedCoach()
      const created: Schedule[] = []

      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(scheduleResponse([])),
        ),
        http.post('*/coach/schedule', async ({ request }) => {
          const payload = (await request.json()) as Schedule
          const schedule = makeSchedule({
            ...payload,
            scheduleId: `created_${String(created.length)}`,
          })
          created.push(schedule)
          return HttpResponse.json<Schedule>(schedule, { status: 201 })
        }),
      )

      renderPage()
      await userEvent.click(screen.getByRole('tab', { name: /criar horários/i }))

      // Aguarda os selects carregarem academia/especialidade do coach.
      await screen.findByRole('option', { name: /Smart Fit Paulista/i })
      await userEvent.selectOptions(screen.getByLabelText('Academia'), 'gym_smartfit_paulista')
      await userEvent.selectOptions(screen.getByLabelText('Especialidade'), 'MUSCULATION')
      await userEvent.type(screen.getByLabelText('Preço (R$)'), '12000')

      // Janela curta de um único dia (segunda) → 2 slots de 1h.
      fireEvent.change(screen.getByLabelText('Data início'), { target: { value: '2026-06-15' } })
      fireEvent.change(screen.getByLabelText('Data fim'), { target: { value: '2026-06-15' } })
      fireEvent.change(screen.getByLabelText('Início da janela'), { target: { value: '08:00' } })
      fireEvent.change(screen.getByLabelText('Fim da janela'), { target: { value: '10:00' } })

      await userEvent.click(screen.getByRole('button', { name: /gerar prévia/i }))

      expect(await screen.findByText('2 slots')).toBeInTheDocument()
      expect(screen.getByText('08:00-09:00')).toBeInTheDocument()
      expect(screen.getByText('09:00-10:00')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /confirmar slots/i }))

      expect(await screen.findByText('2 criados')).toBeInTheDocument()
      expect(created).toHaveLength(2)
      expect(created[0].gymId).toBe('gym_smartfit_paulista')
      expect(created[0].specialtyId).toBe('MUSCULATION')
      expect(created[0].price).toBe('120.00')
    })

    it('permite editar e remover slots da prévia antes de confirmar', async () => {
      useApprovedCoach()

      server.use(
        http.get('*/coach/schedule', () =>
          HttpResponse.json<CoachScheduleResponse>(scheduleResponse([])),
        ),
      )

      renderPage()
      await userEvent.click(screen.getByRole('tab', { name: /criar horários/i }))

      await screen.findByRole('option', { name: /Smart Fit Paulista/i })
      await userEvent.selectOptions(screen.getByLabelText('Academia'), 'gym_smartfit_paulista')
      await userEvent.selectOptions(screen.getByLabelText('Especialidade'), 'MUSCULATION')
      await userEvent.type(screen.getByLabelText('Preço (R$)'), '10000')

      fireEvent.change(screen.getByLabelText('Data início'), { target: { value: '2026-06-15' } })
      fireEvent.change(screen.getByLabelText('Data fim'), { target: { value: '2026-06-15' } })
      fireEvent.change(screen.getByLabelText('Início da janela'), { target: { value: '08:00' } })
      fireEvent.change(screen.getByLabelText('Fim da janela'), { target: { value: '10:00' } })

      await userEvent.click(screen.getByRole('button', { name: /gerar prévia/i }))
      expect(await screen.findByText('2 slots')).toBeInTheDocument()

      // Edita o primeiro slot, antecipando o início para 07:00.
      await userEvent.click(screen.getAllByRole('button', { name: 'Editar slot' })[0])
      fireEvent.change(screen.getByLabelText('Início'), { target: { value: '07:00' } })
      await userEvent.click(screen.getByRole('button', { name: 'Salvar' }))
      expect(await screen.findByText('07:00-09:00')).toBeInTheDocument()

      // Remove o slot restante das 09:00-10:00 → sobra 1 slot.
      const removeButtons = screen.getAllByRole('button', { name: 'Remover slot' })
      await userEvent.click(removeButtons[removeButtons.length - 1])

      expect(await screen.findByText('1 slot')).toBeInTheDocument()
      expect(screen.queryByText('09:00-10:00')).not.toBeInTheDocument()
    })
  })
})
