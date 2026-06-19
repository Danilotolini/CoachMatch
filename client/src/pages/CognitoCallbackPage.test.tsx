import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import CognitoCallbackPage from './CognitoCallbackPage'
import * as cognito from '@/lib/cognito'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { makeClient } from '@/test/fixtures'
import { initialCoach } from '@/mocks/fixtures'
import { getToken } from '@/lib/auth'
import type { Client, Coach } from '@/types/api'

let currentSearch = ''

function setLocationSearch(search: string) {
  currentSearch = search
}

function renderPage(audience: 'coach' | 'client' = 'coach') {
  const callbackPath =
    audience === 'client' ? '/auth/cognito/student/callback' : '/auth/cognito/callback'
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[`${callbackPath}${currentSearch}`]}>
        <Routes>
          <Route path={callbackPath} element={<CognitoCallbackPage audience={audience} />} />
          <Route path="/coach/onboarding" element={<div>onboarding page</div>} />
          <Route path="/client/onboarding" element={<div>onboarding aluno page</div>} />
          <Route path="/client" element={<div>home aluno page</div>} />
          <Route path="/client/health" element={<div>health aluno page</div>} />
          <Route path="/coach" element={<div>dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

beforeEach(() => {
  currentSearch = ''
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined)
})

afterEach(() => {
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

  it('usa o error param quando error_description não existe', () => {
    setLocationSearch('?error=access_denied')
    renderPage()
    expect(screen.getByText('access_denied')).toBeInTheDocument()
  })

  it('mostra link de retry para login de cliente quando callback de aluno falha', () => {
    setLocationSearch('?error=access_denied&error_description=Usuário+negou+acesso')
    renderPage('client')
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
      http.get('*/coach/me', () =>
        HttpResponse.json<Coach>({ ...initialCoach, status: 'APPROVED' }),
      ),
    )

    renderPage()

    expect(await screen.findByText('dashboard page')).toBeInTheDocument()
    expect(getToken()).toBe('id-token-123')
  })

  it('redireciona para onboarding em 404 do coach/me', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'id-token-123',
      access_token: 'access-token-123',
      expires_in: 3600,
    })
    server.use(http.get('*/coach/me', () => HttpResponse.json({ error: 'nf' }, { status: 404 })))

    renderPage()

    expect(await screen.findByText('onboarding page')).toBeInTheDocument()
  })

  it('troca code como cliente e redireciona para onboarding quando ainda não onboarded', async () => {
    setLocationSearch('?code=abc&state=xyz')
    const exchangeSpy = vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'student-id-token-123',
      access_token: 'student-access-token-123',
      expires_in: 3600,
    })

    renderPage('client')

    expect(await screen.findByText('onboarding aluno page')).toBeInTheDocument()
    expect(getToken()).toBe('student-id-token-123')
    expect(exchangeSpy).toHaveBeenCalledWith('abc', 'xyz', 'client')
  })

  it('redireciona aluno direto para /client quando já onboarded', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'novo-token',
      access_token: 'acc',
      expires_in: 3600,
    })
    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(makeClient({ status: 'ACTIVE' }))),
    )

    renderPage('client')

    expect(await screen.findByText('home aluno page')).toBeInTheDocument()
    expect(getToken()).toBe('novo-token')
  })

  it('redireciona aluno para /client/health quando falta a ficha', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'student-health-token',
      access_token: 'student-health-access-token',
      expires_in: 3600,
    })
    server.use(
      http.get('*/student/me', () =>
        HttpResponse.json<Client>(makeClient({ status: 'ONBOARDING_HEALTH' })),
      ),
    )

    renderPage('client')

    expect(await screen.findByText('health aluno page')).toBeInTheDocument()
  })

  it('leva coach para onboarding quando /coach/me falha por rede', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'id-token-123',
      access_token: 'access-token-123',
      expires_in: 3600,
    })
    server.use(http.get('*/coach/me', () => HttpResponse.error()))

    renderPage()

    expect(await screen.findByText('onboarding page')).toBeInTheDocument()
  })

  it('mostra erro quando /student/me falha com erro inesperado', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockResolvedValue({
      id_token: 'student-id-token-123',
      access_token: 'student-access-token-123',
      expires_in: 3600,
    })
    server.use(
      http.get('*/student/me', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    renderPage('client')

    expect(await screen.findByRole('heading', { name: 'Erro na autenticação' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tentar novamente' })).toHaveAttribute(
      'href',
      '/client/login',
    )
  })

  it('mostra erro quando exchangeCodeForTokens falha', async () => {
    setLocationSearch('?code=abc&state=xyz')
    vi.spyOn(cognito, 'exchangeCodeForTokens').mockRejectedValue(new Error('estado inválido'))

    renderPage()

    expect(await screen.findByText('estado inválido')).toBeInTheDocument()
  })
})
