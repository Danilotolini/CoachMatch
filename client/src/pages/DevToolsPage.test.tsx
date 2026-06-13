import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import DevToolsPage from './DevToolsPage'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'

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

  it('limpa sessoes, cache e storage local', async () => {
    const user = userEvent.setup()
    loginAs('client')
    loginAs('coach')
    localStorage.setItem('coachmatch:mock:coach', '{"id":"coach_demo"}')

    renderPage()

    await user.click(screen.getByRole('button', { name: /limpar local/i }))

    expect(useSessionStore.getState()).toMatchObject({
      activeRole: null,
      sessions: {},
    })
    expect(localStorage.getItem('coachmatch:session')).toBeNull()
    expect(localStorage.getItem('coachmatch:mock:coach')).toBeNull()
    await waitFor(() => {
      expect(screen.getByText(/formulario local limpos/i)).toBeInTheDocument()
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

  it('prepara aluno base sem onboarding', async () => {
    const user = userEvent.setup()
    renderPage()

    const clientCard = screen
      .getByRole('heading', { name: 'Aluno', level: 2 })
      .closest<HTMLElement>('div.p-5')
    if (!clientCard) throw new Error('Card do aluno nao encontrado')
    await user.click(within(clientCard).getByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(screen.getByText(/Aluno base logado, sem onboarding/i)).toBeInTheDocument()
    })
    expect(useSessionStore.getState().activeRole).toBe('client')
    expect(useSessionStore.getState().sessions.client?.token).toBeTruthy()
    expect(useSessionStore.getState().sessions.coach).toBeUndefined()
  })

  it('prepara treinador base nao aprovado', async () => {
    const user = userEvent.setup()
    renderPage()

    const coachCard = screen
      .getByRole('heading', { name: 'Treinador', level: 2 })
      .closest<HTMLElement>('div.p-5')
    if (!coachCard) throw new Error('Card do treinador nao encontrado')
    await user.click(within(coachCard).getByRole('button', { name: /reset/i }))

    await waitFor(() => {
      expect(screen.getByText(/Treinador base logado, ainda nao aprovado/i)).toBeInTheDocument()
    })
    expect(useSessionStore.getState().activeRole).toBe('coach')
    expect(useSessionStore.getState().sessions.coach?.token).toBeTruthy()
    expect(useSessionStore.getState().sessions.client).toBeUndefined()
  })

  it('lista rotas sem abrir nova aba', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /callback treinador/i })).not.toHaveAttribute('target')
    expect(screen.getByRole('link', { name: /treinador rejeitado/i })).toHaveAttribute(
      'href',
      '/coach/rejected',
    )
  })
})
