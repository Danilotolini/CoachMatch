import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachSchedulePage from './CoachSchedulePage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import { loginAs } from '@/test/session'
import type { Coach } from '@/types/api'

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
            name: 'Derik Oliveira',
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
})
