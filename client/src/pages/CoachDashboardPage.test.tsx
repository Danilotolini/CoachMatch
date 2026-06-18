import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachDashboardPage from './CoachDashboardPage'
import * as dateTime from '@/lib/dateTime'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import { loginAs } from '@/test/session'
import type { Coach } from '@/types/api'

const approvedCoach: Coach = {
  ...initialCoach,
  status: 'APPROVED',
  profile: {
    ...initialCoach.profile,
    name: 'Marina Silva',
    cref: '123456-G/SP',
    specialties: ['MUSCULATION'],
  },
  work_location: [{ type: 'GYM', gymId: 'gym_smartfit_paulista' }],
}

function renderPage() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <MemoryRouter>
        <CoachDashboardPage />
      </MemoryRouter>
    </Wrapper>,
  )
}

beforeEach(() => {
  loginAs('coach')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CoachDashboardPage', () => {
  it('mostra o primeiro nome do coach', async () => {
    server.use(http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)))

    renderPage()

    expect(await screen.findByText('Marina')).toBeInTheDocument()
  })

  it('leva solicitações pendentes para a agenda', async () => {
    // Fixa o "hoje" para que o slot REQUESTED semeado caia na janela consultada
    // pelo dashboard — sem isso o teste depende da data real e expira.
    vi.spyOn(dateTime, 'getTodayBrazilYMD').mockReturnValue('2026-06-15')
    server.use(http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)))

    renderPage()

    const respondLink = await screen.findByRole('link', { name: 'RESPONDER' })
    expect(respondLink).toHaveAttribute('href', '/coach/schedule')
    expect(screen.queryByRole('button', { name: 'DEPOIS' })).not.toBeInTheDocument()
  })

  it('não mostra CTA de perfil público enquanto não há rota dedicada', async () => {
    server.use(http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)))

    renderPage()

    expect((await screen.findAllByText('Seu perfil')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /VER PERFIL PÚBLICO/i })).not.toBeInTheDocument()
  })

  it('consulta a agenda com query params no dia brasileiro esperado', async () => {
    let capturedStart: string | null = null
    let capturedEnd: string | null = null

    vi.spyOn(dateTime, 'getTodayBrazilYMD').mockReturnValue('2026-06-15')

    server.use(
      http.get('*/coach/me', () => HttpResponse.json<Coach>(approvedCoach)),
      http.get('*/coach/schedule', ({ request }) => {
        const url = new URL(request.url)
        capturedStart = url.searchParams.get('startDateTime')
        capturedEnd = url.searchParams.get('endDateTime')
        return HttpResponse.json([])
      }),
    )

    renderPage()

    await waitFor(() => {
      expect(capturedStart).toBe('2026-06-15T00:00:00-03:00')
      expect(capturedEnd).toBe('2026-06-29T23:59:59-03:00')
    })
  })
})
