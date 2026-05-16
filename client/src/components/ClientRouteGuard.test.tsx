import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ClientRouteGuard } from './ClientRouteGuard'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/client']}>
      <Routes>
        <Route
          path="/client"
          element={
            <ClientRouteGuard>
              <div>home aluno</div>
            </ClientRouteGuard>
          }
        />
        <Route path="/client/login" element={<div>login aluno</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('ClientRouteGuard', () => {
  it('redireciona para /client/login quando não há sessão de aluno', async () => {
    renderGuard()
    expect(await screen.findByText('login aluno')).toBeInTheDocument()
  })

  it('renderiza children quando há sessão de aluno ativa', async () => {
    loginAs('client')
    renderGuard()
    expect(await screen.findByText('home aluno')).toBeInTheDocument()
  })

  it('promove sessão de aluno quando outro papel está ativo', async () => {
    loginAs('client')
    loginAs('coach')
    renderGuard()
    expect(await screen.findByText('home aluno')).toBeInTheDocument()
    await waitFor(() => {
      expect(useSessionStore.getState().activeRole).toBe('client')
    })
  })
})
