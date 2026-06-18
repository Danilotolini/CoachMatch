import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import LoginPage from './LoginPage'
import * as cognito from '@/lib/cognito'
import { loginAs } from '@/test/session'
import { makeClient } from '@/test/fixtures'
import { useSessionStore } from '@/stores/sessionStore'
import { server } from '@/mocks/server'
import type { Client } from '@/types/api'

function mockLocation(overrides: Partial<Location>): Location {
  const base = {
    origin: 'http://localhost',
    href: 'http://localhost/',
    pathname: '/',
    search: '',
    hash: '',
    host: 'localhost',
    hostname: 'localhost',
    port: '',
    protocol: 'http:',
    assign: () => undefined,
    replace: () => undefined,
    reload: () => undefined,
    toString: () => 'http://localhost/',
  }
  return { ...base, ...overrides } as unknown as Location
}

function renderPage(audience: 'coach' | 'client', initialPath?: string) {
  const path = initialPath ?? (audience === 'client' ? '/client/login' : '/coach/login')
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={path} element={<LoginPage audience={audience} />} />
        <Route path="/coach" element={<div>coach dashboard</div>} />
        <Route path="/client" element={<div>client home</div>} />
        <Route path="/client/health" element={<div>client health</div>} />
        <Route path="/client/onboarding" element={<div>client onboarding</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.stubEnv('VITE_API_MOCKING', 'disabled')
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({ href: 'http://localhost/coach/login' }),
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: mockLocation({}),
  })
  vi.restoreAllMocks()
})

describe('LoginPage', () => {
  it('cria sessao demo automaticamente em login local com MSW ligado', async () => {
    vi.stubEnv('VITE_API_MOCKING', 'enabled')
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl')

    renderPage('client')

    expect(screen.queryByRole('heading', { name: 'Login local' })).not.toBeInTheDocument()
    expect(getLoginUrlSpy).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(useSessionStore.getState().activeRole).toBe('client')
    })
    expect(useSessionStore.getState().sessions.client?.token).toBeTruthy()
    expect(await screen.findByText('client onboarding')).toBeInTheDocument()
  })

  it('cria sessao demo de treinador automaticamente em login local', async () => {
    vi.stubEnv('VITE_API_MOCKING', 'enabled')
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl')

    renderPage('coach')

    expect(getLoginUrlSpy).not.toHaveBeenCalled()
    await waitFor(() => {
      expect(useSessionStore.getState().activeRole).toBe('coach')
    })
    expect(useSessionStore.getState().sessions.coach?.token).toBeTruthy()
    expect(await screen.findByText('coach dashboard')).toBeInTheDocument()
  })

  it('redireciona para a URL de login do Cognito', async () => {
    const url = 'https://cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    renderPage('coach')

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('coach')
  })

  it('passa audience de aluno ao gerar URL de login', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    renderPage('client')

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('client')
  })

  it('mostra mensagem de erro se falhar ao gerar URL', async () => {
    vi.spyOn(cognito, 'getLoginUrl').mockRejectedValue(new Error('boom'))

    renderPage('coach')

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('redireciona para dashboard de coach quando já existe sessão de coach', async () => {
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl')
    loginAs('coach')

    renderPage('coach')

    expect(await screen.findByText('coach dashboard')).toBeInTheDocument()
    expect(getLoginUrlSpy).not.toHaveBeenCalled()
  })

  it('não volta para /coach quando login recebe sessão encerrada com token antigo', async () => {
    const url = 'https://cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)
    loginAs('coach', 'stale-token')

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/coach/login', state: { reason: 'unauthorized' } }]}
      >
        <Routes>
          <Route path="/coach/login" element={<LoginPage audience="coach" />} />
          <Route path="/coach" element={<div>coach dashboard</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(screen.queryByText('coach dashboard')).not.toBeInTheDocument()
    expect(useSessionStore.getState().sessions.coach).toBeUndefined()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledTimes(1)
  })

  it('reativa sessão de aluno e redireciona conforme backend', async () => {
    vi.spyOn(cognito, 'getLoginUrl')
    loginAs('client')
    useSessionStore.setState((state) => ({ ...state, activeRole: null }))
    server.use(
      http.get('*/student/me', () => HttpResponse.json<Client>(makeClient({ status: 'ACTIVE' }))),
    )

    renderPage('client')

    expect(await screen.findByText('client home')).toBeInTheDocument()
    expect(useSessionStore.getState().activeRole).toBe('client')
  })

  it('redireciona aluno para health quando o backend pede a ficha', async () => {
    loginAs('client')
    useSessionStore.setState((state) => ({ ...state, activeRole: null }))
    server.use(
      http.get('*/student/me', () =>
        HttpResponse.json<Client>(makeClient({ status: 'ONBOARDING_HEALTH' })),
      ),
    )

    renderPage('client')

    expect(await screen.findByText('client health')).toBeInTheDocument()
  })

  it('manda aluno para onboarding quando /student/me falha fora de 401/403', async () => {
    loginAs('client')
    useSessionStore.setState((state) => ({ ...state, activeRole: null }))
    server.use(
      http.get('*/student/me', () => HttpResponse.json({ error: 'boom' }, { status: 500 })),
    )

    renderPage('client')

    expect(await screen.findByText('client onboarding')).toBeInTheDocument()
  })

  it('não redireciona para onboarding quando /student/me recusa a sessão', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)
    loginAs('client', 'invalid-token')
    server.use(
      http.get('*/student/me', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )

    renderPage('client')

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(screen.queryByText('client onboarding')).not.toBeInTheDocument()
    expect(useSessionStore.getState().sessions.client).toBeUndefined()
    expect(window.location.href).toBe(url)
    expect(getLoginUrlSpy).toHaveBeenCalledTimes(1)
  })

  it('em mock, pede novo login quando chega por sessão expirada', async () => {
    vi.stubEnv('VITE_API_MOCKING', 'enabled')

    render(
      <MemoryRouter initialEntries={[{ pathname: '/client/login', state: { reason: 'expired' } }]}>
        <Routes>
          <Route path="/client/login" element={<LoginPage audience="client" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sessão encerrada pelo servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENTRAR NOVAMENTE' })).toBeInTheDocument()
    expect(useSessionStore.getState().sessions.client).toBeUndefined()
  })

  it('reconhece o formato legado de sessão encerrada', async () => {
    vi.stubEnv('VITE_API_MOCKING', 'enabled')

    render(
      <MemoryRouter
        initialEntries={[{ pathname: '/client/login', state: { sessionExpired: 'unauthorized' } }]}
      >
        <Routes>
          <Route path="/client/login" element={<LoginPage audience="client" />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Sessão encerrada pelo servidor.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENTRAR NOVAMENTE' })).toBeInTheDocument()
  })

  it('usa mensagem fallback quando getLoginUrl falha com valor não Error', async () => {
    vi.spyOn(cognito, 'getLoginUrl').mockRejectedValue('falha desconhecida')

    renderPage('coach')

    expect(await screen.findByText('Erro ao iniciar login.')).toBeInTheDocument()
  })

  // Regressão: ao cair no login sem sessão, getLoginUrl roda já no mount. O
  // double-invoke de efeitos do StrictMode (dev) chamaria getLoginUrl duas
  // vezes; como cada chamada grava state/PKCE concorrentes no sessionStorage e
  // pode resolver fora de ordem, o redirect sairia com um state que a outra
  // chamada já sobrescreveu — e o callback cairia em "Estado inválido".
  it('inicia o login do Cognito uma única vez sob StrictMode (coach)', async () => {
    const url = 'https://cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/coach/login']}>
          <Routes>
            <Route path="/coach/login" element={<LoginPage audience="coach" />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(getLoginUrlSpy).toHaveBeenCalledTimes(1)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('coach')
    expect(window.location.href).toBe(url)
  })

  it('inicia o login do Cognito uma única vez sob StrictMode (aluno)', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/client/login']}>
          <Routes>
            <Route path="/client/login" element={<LoginPage audience="client" />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )

    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    expect(getLoginUrlSpy).toHaveBeenCalledTimes(1)
    expect(getLoginUrlSpy).toHaveBeenCalledWith('client')
    expect(window.location.href).toBe(url)
  })

  // Regressão: no caminho timeout → relogin, a navegação concorrente para o
  // login pode remontar o LoginPage. Um useRef nasceria zerado e dispararia um
  // segundo getLoginUrl, sobrescrevendo o state/PKCE do redirect já em voo. O
  // guard de módulo dedupa entre montagens da mesma carga de página.
  it('não reinicia o /authorize ao remontar o LoginPage', async () => {
    const url = 'https://student-cognito.test/oauth2/authorize?x=1'
    const getLoginUrlSpy = vi.spyOn(cognito, 'getLoginUrl').mockResolvedValue(url)

    const { unmount } = renderPage('client')
    expect(await screen.findByText(/Clique aqui se não for redirecionado/i)).toBeInTheDocument()
    unmount()

    renderPage('client')
    await waitFor(() => {
      expect(getLoginUrlSpy).toHaveBeenCalledTimes(1)
    })
  })

  it('libera novo /authorize após falha do getLoginUrl', async () => {
    const getLoginUrlSpy = vi
      .spyOn(cognito, 'getLoginUrl')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce('https://cognito.test/oauth2/authorize?x=1')

    const { unmount } = renderPage('coach')
    expect(await screen.findByText('boom')).toBeInTheDocument()
    unmount()

    renderPage('coach')
    await waitFor(() => {
      expect(getLoginUrlSpy).toHaveBeenCalledTimes(2)
    })
  })
})
