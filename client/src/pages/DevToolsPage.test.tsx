import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DevToolsPage from './DevToolsPage'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'
import { logout } from '@/lib/cognito'

vi.mock('@/lib/cognito', () => ({ logout: vi.fn() }))

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <DevToolsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('DevToolsPage', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_API_MOCKING', 'disabled')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // A 'ACTIVE' so existe no card do aluno e 'APPROVED' so no do treinador.
  function cardFor(statusLabel: string) {
    const card = screen.getByRole('button', { name: statusLabel }).closest<HTMLElement>('div.p-5')
    if (!card) throw new Error(`Card de ${statusLabel} nao encontrado`)
    return card
  }

  it('desloga pelo logout do sistema com o papel escolhido', async () => {
    const user = userEvent.setup()
    loginAs('client')

    renderPage()

    await user.click(within(cardFor('ACTIVE')).getByRole('button', { name: /deslogar/i }))

    expect(logout).toHaveBeenCalledWith('client')
  })

  it('limpa o estado local do papel escolhido', async () => {
    const user = userEvent.setup()
    loginAs('coach')
    localStorage.setItem('coachmatch:mock:coach', '{"id":"coach_demo"}')

    renderPage()

    await user.click(within(cardFor('APPROVED')).getByRole('button', { name: /limpar local/i }))

    expect(useSessionStore.getState().sessions.coach).toBeUndefined()
    expect(localStorage.getItem('coachmatch:mock:coach')).toBeNull()
    await waitFor(() => {
      expect(screen.getByText(/Estado local do treinador limpo/i)).toBeInTheDocument()
    })
  })

  it('nao cria sessao ao abrir atalho de rota', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('link', { name: /home aluno/i }))

    expect(useSessionStore.getState()).toMatchObject({
      activeRole: null,
      sessions: {},
    })
  })

  it('lista apenas home e criacao de perfil para aluno e treinador', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /home aluno/i })).toHaveAttribute('href', '/client')
    expect(screen.getByRole('link', { name: /criacao perfil aluno/i })).toHaveAttribute(
      'href',
      '/client/onboarding',
    )
    expect(screen.getByRole('link', { name: /home treinador/i })).toHaveAttribute('href', '/coach')
    expect(screen.getByRole('link', { name: /criacao perfil treinador/i })).toHaveAttribute(
      'href',
      '/coach/onboarding',
    )

    expect(screen.queryByText('Geral')).not.toBeInTheDocument()
    expect(screen.queryByText('Auth')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /login aluno/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /agenda treinador/i })).not.toBeInTheDocument()
  })
})
