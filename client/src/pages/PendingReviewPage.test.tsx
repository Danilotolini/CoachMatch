import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import PendingReviewPage from './PendingReviewPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'
import * as cognito from '@/lib/cognito'

function renderPage() {
  const { wrapper: Wrapper } = createWrapper()
  return render(
    <Wrapper>
      <PendingReviewPage />
    </Wrapper>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PendingReviewPage', () => {
  it('renderiza título e steps de progresso', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /Perfil em análise/i })).toBeInTheDocument()
    expect(screen.getByText('Cadastro enviado')).toBeInTheDocument()
    expect(screen.getByText('Verificação de credenciais')).toBeInTheDocument()
    expect(screen.getByText('Acesso liberado')).toBeInTheDocument()
  })

  it('chama logout do Cognito ao clicar em SAIR', async () => {
    const logoutSpy = vi.spyOn(cognito, 'logout').mockImplementation(() => undefined)
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'SAIR' }))

    expect(logoutSpy).toHaveBeenCalledTimes(1)
  })

  it('mostra erro quando o approve dev falha', async () => {
    server.use(
      http.post('*/dev/approve-coach', () => HttpResponse.json({ error: 'x' }, { status: 500 })),
    )
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: /APROVAR PERFIL/i }))

    await waitFor(() => {
      expect(screen.getByText(/Falha ao aprovar/i)).toBeInTheDocument()
    })
  })
})
