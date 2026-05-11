import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import DashboardPage from './DashboardPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { setToken } from '@/lib/auth'
import { initialCoach } from '@/mocks/fixtures'
import * as cognito from '@/lib/cognito'
import type { Coach } from '@/types/api'

function renderPage() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <DashboardPage />
    </Wrapper>,
  )
}

beforeEach(() => {
  setToken('fake-jwt')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('DashboardPage', () => {
  it('mostra o primeiro nome do coach', async () => {
    server.use(
      http.get('*/coaches/me', () =>
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

  it('chama logout ao clicar em SAIR', async () => {
    const logoutSpy = vi.spyOn(cognito, 'logout').mockImplementation(() => undefined)
    renderPage()

    await userEvent.click(screen.getAllByRole('button', { name: 'SAIR' })[0])

    expect(logoutSpy).toHaveBeenCalled()
  })
})
