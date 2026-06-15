import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import ClientOnboardingPage from './ClientOnboardingPage'
import { server } from '@/mocks/server'
import { createWrapper } from '@/test/createWrapper'

function renderPage() {
  const { wrapper: QueryWrapper } = createWrapper()
  return render(
    <QueryWrapper>
      <MemoryRouter initialEntries={['/client/onboarding']}>
        <Routes>
          <Route path="/client/onboarding" element={<ClientOnboardingPage />} />
          <Route path="/client/health" element={<div>saude page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryWrapper>,
  )
}

function mockCepSuccess() {
  server.use(
    http.get('https://viacep.com.br/ws/:cep/json/', () =>
      HttpResponse.json({
        cep: '01310-100',
        logradouro: 'Avenida Paulista',
        complemento: '',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    ),
  )
}

function dateInputValue(date = new Date()) {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

describe('ClientOnboardingPage', () => {
  it('renderiza as três seções principais', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Identidade' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Localização' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Objetivo principal' })).toBeInTheDocument()
  })

  it('aplica máscaras de celular e CEP ao digitar', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderPage()

    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11987654321')
    await user.type(screen.getByPlaceholderText('00000-000'), '01310100')

    expect(screen.getByDisplayValue('(11) 98765-4321')).toBeInTheDocument()
    expect(screen.getByDisplayValue('01310-100')).toBeInTheDocument()
  })

  it('busca endereço pelo CEP e preenche cidade e estado', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderPage()

    await user.type(screen.getByPlaceholderText('00000-000'), '01310100')

    expect(await screen.findByDisplayValue('São Paulo')).toBeInTheDocument()
    expect(screen.getByDisplayValue('SP')).toBeInTheDocument()
  })

  it('mostra erro de CEP quando ViaCEP retorna erro', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('https://viacep.com.br/ws/:cep/json/', () => HttpResponse.json({ erro: true })),
    )
    renderPage()

    await user.type(screen.getByPlaceholderText('00000-000'), '00000000')

    expect(await screen.findByText('Não encontramos esse CEP.')).toBeInTheDocument()
  })

  it('mostra erros de validação ao tentar continuar com formulário vazio', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    expect(await screen.findByText('Informe seu nome completo.')).toBeInTheDocument()
    expect(screen.getByText('Telefone incompleto.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua data de nascimento.')).toBeInTheDocument()
    expect(screen.getByText('Selecione uma opção.')).toBeInTheDocument()
    expect(screen.getByText('Informe um CEP válido.')).toBeInTheDocument()
    expect(screen.getByText('Escolha um objetivo principal.')).toBeInTheDocument()
  })

  it('limita o calendário de nascimento até a data atual', () => {
    renderPage()

    expect(screen.getByLabelText('Data de nascimento')).toHaveAttribute('max', dateInputValue())
  })

  it('não aceita ano de nascimento com mais de 4 dígitos', async () => {
    const user = userEvent.setup()
    renderPage()
    const birthDate = screen.getByLabelText('Data de nascimento')

    fireEvent.change(birthDate, { target: { value: '199999-05-20' } })
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    expect(birthDate).toHaveValue('')
    expect(screen.getByText('Informe sua data de nascimento.')).toBeInTheDocument()
  })

  it('não aceita data de nascimento futura', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderPage()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)

    await user.type(screen.getByLabelText('Nome completo'), 'Ana Ferreira')
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11987654321')
    fireEvent.change(screen.getByLabelText('Data de nascimento'), {
      target: { value: dateInputValue(tomorrow) },
    })
    await user.click(screen.getByRole('button', { name: 'Mulher' }))
    await user.type(screen.getByPlaceholderText('00000-000'), '01310100')
    await screen.findByDisplayValue('São Paulo')
    await user.click(screen.getByRole('button', { name: /Hipertrofia/i }))
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    expect(await screen.findByText('Informe uma data de nascimento válida.')).toBeInTheDocument()
    expect(screen.queryByText('saude page')).not.toBeInTheDocument()
  })

  it('navega para a etapa de saúde quando o formulário é válido', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderPage()

    await user.type(screen.getByLabelText('Nome completo'), 'Ana Ferreira')
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11987654321')
    await user.type(screen.getByLabelText('Data de nascimento'), '1990-05-20')
    await user.click(screen.getByRole('button', { name: 'Mulher' }))
    await user.type(screen.getByPlaceholderText('00000-000'), '01310100')
    await screen.findByDisplayValue('São Paulo')
    await user.click(screen.getByRole('button', { name: /Hipertrofia/i }))
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    await waitFor(() => {
      expect(screen.getByText('saude page')).toBeInTheDocument()
    })
  })

  it('mantém o formulário na tela quando o CEP ainda não foi encontrado', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Nome completo'), 'Ana Ferreira')
    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11987654321')
    await user.type(screen.getByLabelText('Data de nascimento'), '1990-05-20')
    await user.click(screen.getByRole('button', { name: 'Mulher' }))
    await user.click(screen.getByRole('button', { name: /Emagrecimento/i }))
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    expect(await screen.findByText('Informe um CEP válido.')).toBeInTheDocument()
    expect(screen.queryByText('saude page')).not.toBeInTheDocument()
  })
})
