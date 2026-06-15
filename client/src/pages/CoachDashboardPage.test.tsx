import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachDashboardPage from './CoachDashboardPage'
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
    server.use(
      http.get('*/coach/me', () =>
        HttpResponse.json<Coach>({
          ...initialCoach,
          status: 'APPROVED',
          profile: { ...initialCoach.profile, name: 'Marina Silva' },
        }),
      ),
    )

    renderPage()

    expect(await screen.findByText('Marina')).toBeInTheDocument()
  })
})
