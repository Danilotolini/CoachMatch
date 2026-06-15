import { describe, expect, it } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { SessionExpiredRedirect } from './SessionExpiredRedirect'
import { SESSION_EXPIRED_EVENT } from '@/lib/auth'
import { createWrapper } from '@/test/createWrapper'

function renderWithRoutes(initialPath: string) {
  const { wrapper: QueryWrapper } = createWrapper()
  window.history.pushState(null, '', initialPath)

  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={[initialPath]}>
        <SessionExpiredRedirect />
        <Routes>
          <Route path="/coach" element={<div>dashboard page</div>} />
          <Route path="/client" element={<div>aluno page</div>} />
          <Route path="/coach/login" element={<div>login treinador</div>} />
          <Route path="/client/login" element={<div>login aluno</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('SessionExpiredRedirect', () => {
  it('redireciona rotas de treinador para /coach/login', async () => {
    renderWithRoutes('/coach')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason: 'expired' } }),
      )
    })

    expect(await screen.findByText('login treinador')).toBeInTheDocument()
  })

  it('redireciona rotas de aluno para /client/login', async () => {
    renderWithRoutes('/client')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason: 'unauthorized', status: 401 } }),
      )
    })

    expect(await screen.findByText('login aluno')).toBeInTheDocument()
  })

  it('ignora expiração de aluno enquanto usuário está em rota de treinador', async () => {
    renderWithRoutes('/coach')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, {
          detail: { reason: 'expired', status: 401, role: 'client' },
        }),
      )
    })

    expect(await screen.findByText('dashboard page')).toBeInTheDocument()
  })
})
