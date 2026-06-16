import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { ClientRouteGuard } from './ClientRouteGuard'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'
import { createWrapper } from '@/test/createWrapper'
import { makeClient } from '@/test/fixtures'
import { server } from '@/mocks/server'
import type { Client, ClientStatus } from '@/types/api'

function encodeJwt(payload: Record<string, unknown>): string {
  const base64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${base64}.signature`
}

interface RenderOptions {
  requireOnboarded?: boolean
  initialPath?: string
  guardPath?: string
}

function renderGuard({
  requireOnboarded = false,
  initialPath = '/client',
  guardPath = '/client',
}: RenderOptions = {}) {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path={guardPath}
            element={
              <ClientRouteGuard requireOnboarded={requireOnboarded}>
                <div>conteudo protegido</div>
              </ClientRouteGuard>
            }
          />
          <Route path="/client" element={<div>home aluno</div>} />
          <Route path="/client/onboarding" element={<div>onboarding aluno</div>} />
          <Route path="/client/health" element={<div>saude aluno</div>} />
          <Route path="/client/login" element={<div>login aluno</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

function mockClient(status: ClientStatus) {
  server.use(http.get('*/student/me', () => HttpResponse.json<Client>(makeClient({ status }))))
}

function mockClientError(status: number) {
  server.use(http.get('*/student/me', () => HttpResponse.json({ error: 'boom' }, { status })))
}

describe('ClientRouteGuard', () => {
  it('redireciona para /client/login quando não há sessão de aluno', async () => {
    renderGuard()
    expect(await screen.findByText('login aluno')).toBeInTheDocument()
  })

  it('redireciona para /client/login e encerra sessão quando token está expirado', async () => {
    const requestSpy = vi.fn()
    server.use(
      http.get('*/student/me', () => {
        requestSpy()
        return HttpResponse.json({ error: 'should not happen' }, { status: 500 })
      }),
    )
    loginAs('client', encodeJwt({ exp: Math.floor(Date.now() / 1000) - 1 }))
    renderGuard()
    expect(await screen.findByText('login aluno')).toBeInTheDocument()
    expect(requestSpy).not.toHaveBeenCalled()
  })

  it('renderiza children quando há sessão de aluno ativa', async () => {
    loginAs('client')
    mockClient('ACTIVE')
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('conteudo protegido')).toBeInTheDocument()
  })

  it('promove sessão de aluno quando outro papel está ativo', async () => {
    loginAs('client')
    loginAs('coach')
    mockClient('ACTIVE')
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('conteudo protegido')).toBeInTheDocument()
    await waitFor(() => {
      expect(useSessionStore.getState().activeRole).toBe('client')
    })
  })

  it('redireciona home para onboarding quando aluno está na etapa de perfil', async () => {
    loginAs('client')
    mockClient('PENDING_PROFILE')
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('onboarding aluno')).toBeInTheDocument()
  })

  it('redireciona home para saúde quando aluno está na etapa de saúde', async () => {
    loginAs('client')
    mockClient('ONBOARDING_HEALTH')
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('saude aluno')).toBeInTheDocument()
  })

  it('permanece na etapa correta quando guard sem requireOnboarded combina com status', async () => {
    loginAs('client')
    mockClient('PENDING_PROFILE')
    renderGuard({ initialPath: '/client/onboarding', guardPath: '/client/onboarding' })
    expect(await screen.findByText('conteudo protegido')).toBeInTheDocument()
  })

  it('redireciona etapa errada para a etapa correta quando guard sem requireOnboarded', async () => {
    loginAs('client')
    mockClient('ONBOARDING_HEALTH')
    renderGuard({ initialPath: '/client/onboarding', guardPath: '/client/onboarding' })
    expect(await screen.findByText('saude aluno')).toBeInTheDocument()
  })

  it('trata status desconhecido como onboarding de perfil', async () => {
    loginAs('client')
    server.use(
      http.get('*/student/me', () =>
        HttpResponse.json({
          clientId: 'client_demo',
          email: 'aluno@coachmatch.app',
          status: 'UNKNOWN',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        }),
      ),
    )
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('onboarding aluno')).toBeInTheDocument()
  })

  it('redireciona aluno ACTIVE para /client quando está em etapa de onboarding', async () => {
    loginAs('client')
    mockClient('ACTIVE')
    renderGuard({ initialPath: '/client/onboarding', guardPath: '/client/onboarding' })
    expect(await screen.findByText('home aluno')).toBeInTheDocument()
  })

  it('encerra sessão e redireciona para login em erro 401 do /student/me', async () => {
    loginAs('client')
    mockClientError(401)
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('login aluno')).toBeInTheDocument()
    await waitFor(() => {
      expect(useSessionStore.getState().sessions.client).toBeUndefined()
    })
  })

  it('em erro genérico com requireOnboarded, redireciona para onboarding', async () => {
    loginAs('client')
    mockClientError(500)
    renderGuard({ requireOnboarded: true })
    expect(await screen.findByText('onboarding aluno')).toBeInTheDocument()
  })

  it('em erro genérico sem requireOnboarded, renderiza children como fallback', async () => {
    loginAs('client')
    mockClientError(500)
    renderGuard({ initialPath: '/client/onboarding', guardPath: '/client/onboarding' })
    expect(await screen.findByText('conteudo protegido')).toBeInTheDocument()
  })
})
