import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import { RouteGuard } from './RouteGuard'
import { server } from '@/mocks/server'
import { setToken } from '@/lib/auth'
import { createWrapper } from '@/test/createWrapper'
import { initialCoach } from '@/mocks/fixtures'
import type { Coach } from '@/types/api'

function renderGuard(allow: Coach['status'][], initialPath = '/protected') {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route
            path="/protected"
            element={
              <RouteGuard allow={allow}>
                <div>conteúdo protegido</div>
              </RouteGuard>
            }
          />
          <Route path="/coach/login" element={<div>login page</div>} />
          <Route path="/coach/onboarding" element={<div>onboarding page</div>} />
          <Route path="/coach/pending-review" element={<div>analise page</div>} />
          <Route path="/coach" element={<div>dashboard page</div>} />
          <Route path="/coach/rejected" element={<div>reprovado page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('RouteGuard', () => {
  it('redireciona para /coach/login quando não há token', async () => {
    renderGuard(['APPROVED'])
    expect(await screen.findByText('login page')).toBeInTheDocument()
  })

  it('renderiza children quando status do coach está em allow', async () => {
    setToken('fake-jwt')
    renderGuard(['PENDING_PROFILE'])
    expect(await screen.findByText('conteúdo protegido')).toBeInTheDocument()
  })

  it('redireciona para a rota do status quando status não está em allow', async () => {
    setToken('fake-jwt')
    server.use(
      http.get('*/coaches/me', () =>
        HttpResponse.json<Coach>({ ...initialCoach, status: 'APPROVED' }),
      ),
    )
    renderGuard(['PENDING_PROFILE'])
    expect(await screen.findByText('dashboard page')).toBeInTheDocument()
  })

  it('em erro 401 limpa token e redireciona para /coach/login', async () => {
    setToken('fake-jwt')
    server.use(
      http.get('*/coaches/me', () => HttpResponse.json({ error: 'unauthorized' }, { status: 401 })),
    )
    renderGuard(['PENDING_PROFILE'])
    expect(await screen.findByText('login page')).toBeInTheDocument()
    expect(localStorage.getItem('idToken')).toBeNull()
  })

  it('em 404 redireciona para onboarding quando PENDING_PROFILE não está em allow', async () => {
    setToken('fake-jwt')
    server.use(
      http.get('*/coaches/me', () => HttpResponse.json({ error: 'not found' }, { status: 404 })),
    )
    renderGuard(['APPROVED'])
    expect(await screen.findByText('onboarding page')).toBeInTheDocument()
  })

  it('em 404 renderiza children quando PENDING_PROFILE está em allow', async () => {
    setToken('fake-jwt')
    server.use(
      http.get('*/coaches/me', () => HttpResponse.json({ error: 'not found' }, { status: 404 })),
    )
    renderGuard(['PENDING_PROFILE'])
    expect(await screen.findByText('conteúdo protegido')).toBeInTheDocument()
  })

  it('mostra spinner enquanto carrega', () => {
    setToken('fake-jwt')
    const { container } = renderGuard(['PENDING_PROFILE'])
    expect(container.querySelector('.animate-spin')).not.toBeNull()
  })
})
