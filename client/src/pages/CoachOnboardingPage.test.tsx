import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import CoachOnboardingPage from './CoachOnboardingPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import { loginAs } from '@/test/session'
import { useOnboardingStore } from '@/stores/onboardingStore'

function renderPage() {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/coach/onboarding']}>
        <Routes>
          <Route path="/coach/onboarding" element={<CoachOnboardingPage />} />
          <Route path="/coach" element={<div>dashboard page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

beforeEach(() => {
  loginAs('coach')
  useOnboardingStore.getState().reset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CoachOnboardingPage', () => {
  it('renderiza as quatro seções principais', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: 'Identidade' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Autoridade' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Domínio' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Território' })).toBeInTheDocument()
  })

  it('atualiza store ao digitar telefone com máscara aplicada', async () => {
    const user = userEvent.setup()
    renderPage()

    const phoneInput = screen.getByPlaceholderText('(11) 99999-9999')
    await user.type(phoneInput, '11987654321')

    expect(useOnboardingStore.getState().form.phone).toBe('(11) 98765-4321')
  })

  it('permite editar o nome do treinador', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Nome Completo'), 'João Silva')

    expect(useOnboardingStore.getState().form.name).toBe('João Silva')
  })

  it('seleciona especialidade ao clicar no chip', async () => {
    const user = userEvent.setup()
    renderPage()

    // espera options carregarem da API
    const chip = await screen.findByRole('button', { name: /Musculação/i })
    await user.click(chip)

    expect(useOnboardingStore.getState().form.specialties).toContain('MUSCULATION')
  })

  it('mostra erro de validação ao tentar concluir perfil vazio', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /CONCLUIR PERFIL/i }))

    expect(await screen.findByText(/Existem erros no formulário/i)).toBeInTheDocument()
  })

  it('submete o perfil e navega para /coach quando válido', async () => {
    const user = userEvent.setup()

    // pre-popula store com dados válidos
    const store = useOnboardingStore.getState()
    store.updateName('João Silva')
    store.updatePhone('11987654321')
    store.updateCref('123456GSP')
    store.toggleSpecialty('MUSCULATION')
    store.addGym({
      gymId: 'gym_smartfit_paulista',
      name: 'Smart Fit Paulista',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Bela Vista',
      coordinates: null,
    })

    renderPage()

    await user.click(screen.getByRole('button', { name: /CONCLUIR PERFIL/i }))

    await waitFor(() => {
      expect(screen.getByText('dashboard page')).toBeInTheDocument()
    })
  })

  it('mostra erro se PUT do coach falhar', async () => {
    const user = userEvent.setup()

    const store = useOnboardingStore.getState()
    store.updateName('João Silva')
    store.updatePhone('11987654321')
    store.updateCref('123456GSP')
    store.toggleSpecialty('MUSCULATION')
    store.addGym({
      gymId: 'gym_smartfit_paulista',
      name: 'Smart Fit Paulista',
      address: 'Av. Paulista, 1000',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Bela Vista',
      coordinates: null,
    })

    server.use(http.put('*/coach/me', () => HttpResponse.json({ error: 'x' }, { status: 500 })))

    renderPage()

    await user.click(screen.getByRole('button', { name: /CONCLUIR PERFIL/i }))

    expect(await screen.findByText(/Não foi possível salvar seu perfil/i)).toBeInTheDocument()
  })
})
