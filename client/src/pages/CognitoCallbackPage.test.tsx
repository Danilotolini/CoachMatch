import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import CognitoCallbackPage from './CognitoCallbackPage'
import * as cognito from '@/lib/cognito'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import { getToken } from '@/lib/auth'
import type { Coach } from '@/types/api'

const ORIGINAL_LOCATION = window.location

function setLocationSearch(search: string) {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...ORIGINAL_LOCATION, pathname: '/auth/cognito/callback', search },
  })
}

function renderPage(audience: 'coach' | 'student' = 'coach') {
  const callbackPath =
    audience === 'student' ? '/auth/cognito/student/callback' : '/auth/cognito/callback'
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[callbackPath]}>
        <Routes>
          <Route
            path={callbackPath}
            element={<CognitoCallbackPage audience={audience} />}
          />
          <Route path="/coach/onboarding" element={<div>onboarding page</div>} />
          <Route path="/client/onboarding" element={<div>onboarding aluno page</div>} />
          <Route path="/coach/pending-review" element={<div>analise page</div>} />
          <Route path="/coach" element={<div>dashboard page</div>} />
          <Route path="/coach/rejected" element={<div>reprovado page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

beforeEach(() => {
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => {})
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: ORIGINAL_LOCATION,
  })
  vi.restoreAllMocks()
})

describe('CognitoCallbackPage', () => {
  it('mostra erro quando o callback chega sem code', () => {
    setLocationSearch('')
    renderPage()
    expect(screen.getByText('Código de autorização não encontrado.')).toBeInTheDocument()
  })

  it('mostra erro retornado pelo Cognito via query param', () => {
    setLocationSearch('?error=access_denied&error_description=Usuário+negou+acesso')
    renderPage()
    expect(screen.getByText('Usuário negou acesso')).toBeInTheDocument()
  })

  it('mostra link de retry para login de aluno quando callback de aluno falha', () => {
    setLocationSearch('?error=access_denied&error_description=Usuário+negou+acesso')
    renderPage('student')
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/client/login',
    )
  })

  it('troca code por tokens e redireciona para rota do status', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'id-token-123',
      access_token: 'access-token-123',
      expires_in: 3600,
    })
    server.use(
      http.get('*/coaches/me', () =>
        HttpResponse.json<Coach>({ ...initialCoach, status: 'APPROVED' }),
      ),
    )

    renderPage()

    expect(await screen.findByText('dashboard page')).toBeInTheDocument()
    expect(getToken()).toBe('id-token-123')
  })

  it('redireciona para onboarding em 404 do coaches/me', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'id-token-123',
      access_token: 'access-token-123',
      expires_in: 3600,
    })
    server.use(
      http.get('*/coaches/me', () => HttpResponse.json({ error: 'nf' }, { status: 404 })),
    )

    renderPage()

    expect(await screen.findByText('onboarding page')).toBeInTheDocument()
  })

  it('troca code como aluno e redireciona direto para onboarding de aluno', async () => {
    setLocationSearch('?code=abc&state=xyz')
    const exchangeSpy = vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'student-id-token-123',
      access_token: 'student-access-token-123',
      expires_in: 3600,
    })

    renderPage('student')

    expect(await screen.findByText('onboarding aluno page')).toBeInTheDocument()
    expect(getToken()).toBe('student-id-token-123')
    expect(exchangeSpy).toHaveBeenCalledWith('abc', 'xyz', 'student')
  })

  it('mostra erro quando exchangeCodeForTokens falha', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockRejectedValue(new Error('estado inválido'))

    renderPage()

    expect(await screen.findByText('estado inválido')).toBeInTheDocument()
  })
})
