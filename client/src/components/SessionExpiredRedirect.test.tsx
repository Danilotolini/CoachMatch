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
          <Route path="/coach/dashboard" element={<div>dashboard page</div>} />
          <Route path="/aluno" element={<div>aluno page</div>} />
          <Route path="/coach/entrar" element={<div>login profissional</div>} />
          <Route path="/aluno/entrar" element={<div>login aluno</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

describe('SessionExpiredRedirect', () => {
  it('redireciona rotas profissionais para /coach/entrar', async () => {
    renderWithRoutes('/coach/dashboard')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason: 'expired' } }),
      )
    })

    expect(await screen.findByText('login profissional')).toBeInTheDocument()
  })

  it('redireciona rotas de aluno para /aluno/entrar', async () => {
    renderWithRoutes('/aluno')

    act(() => {
      window.dispatchEvent(
        new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason: 'unauthorized', status: 401 } }),
      )
    })

    expect(await screen.findByText('login aluno')).toBeInTheDocument()
  })
})
