import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import LoginPage from './LoginPage'
import * as cognito from '@/lib/cognito'
import { loginAs } from '@/test/session'
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

  it('reativa sessão de aluno e redireciona conforme backend', async () => {
    vi.spyOn(cognito, 'getLoginUrl')
    loginAs('client')
    useSessionStore.setState((state) => ({ ...state, activeRole: null }))
    server.use(
      http.get('*/clients/me', () =>
        HttpResponse.json<Client>({
          clientId: 'client_demo',
          email: 'aluno@coachmatch.app',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    )

    renderPage('client')

    expect(await screen.findByText('client home')).toBeInTheDocument()
    expect(useSessionStore.getState().activeRole).toBe('client')
  })
})
