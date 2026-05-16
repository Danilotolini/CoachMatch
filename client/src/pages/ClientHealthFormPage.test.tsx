import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import ClientHealthFormPage from './ClientHealthFormPage'
import { loginAs } from '@/test/session'
import { useSessionStore } from '@/stores/sessionStore'

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage(initialEntries = ['/client/health']) {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)

  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialEntries.length - 1}>
      <Routes>
        <Route path="/client/onboarding" element={<div>onboarding aluno page</div>} />
        <Route path="/client/health" element={<ClientHealthFormPage />} />
        <Route path="/client" element={<div>home aluno page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function answerAllParq(value: 'Sim' | 'Não') {
  const user = userEvent.setup()
  for (const button of screen.getAllByRole('button', { name: value })) {
    await user.click(button)
  }
}

describe('ClientHealthFormPage', () => {
  it('renderiza as seções principais do formulário de saúde', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'PAR-Q' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Observações' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Consentimentos' })).toBeInTheDocument()
  })

  it('mostra erros de validação ao concluir sem responder tudo', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /Concluir/i }))

    expect(await screen.findByText('Responda todas as perguntas.')).toBeInTheDocument()
    expect(screen.getAllByText('Necessário para prosseguir.')).toHaveLength(2)
  })

  it('mostra aviso quando alguma resposta do PAR-Q é sim', async () => {
    renderPage()

    await userEvent.click(screen.getAllByRole('button', { name: 'Sim' })[0])

    expect(
      screen.getByText(/recomendamos uma avaliação médica antes de começar/i),
    ).toBeInTheDocument()
  })

  it('navega para a home do aluno quando o formulário é válido', async () => {
    loginAs('client')
    renderPage()

    await answerAllParq('Não')
    await userEvent.type(
      screen.getByLabelText('Restrições, lesões ou cirurgias'),
      'Sem restrições.',
    )
    await userEvent.click(screen.getByRole('checkbox', { name: /compartilhar minhas respostas/i }))
    await userEvent.click(screen.getByRole('checkbox', { name: /não é serviço médico/i }))
    await userEvent.click(screen.getByRole('button', { name: /Concluir/i }))

    await waitFor(() => {
      expect(screen.getByText('home aluno page')).toBeInTheDocument()
    })
    expect(useSessionStore.getState().sessions.client?.onboarded).toBe(true)
  })

  it('volta para a etapa anterior ao clicar em Voltar', async () => {
    renderPage(['/client/onboarding', '/client/health'])

    await userEvent.click(screen.getByRole('button', { name: /Voltar/i }))

    await waitFor(() => {
      expect(screen.getByText('onboarding aluno page')).toBeInTheDocument()
    })
  })
})
