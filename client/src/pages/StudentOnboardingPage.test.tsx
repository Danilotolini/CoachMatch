import { describe, expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { http, HttpResponse } from 'msw'
import StudentOnboardingPage from './StudentOnboardingPage'
import { server } from '@/mocks/server'

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/aluno/cadastrar']}>
      <Routes>
        <Route path="/aluno/cadastrar" element={<StudentOnboardingPage />} />
        <Route path="/aluno/cadastrar/saude" element={<div>saude page</div>} />
      </Routes>
    </MemoryRouter>,
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

describe('StudentOnboardingPage', () => {
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

    expect(await screen.findByText('Telefone incompleto.')).toBeInTheDocument()
    expect(screen.getByText('Informe sua data de nascimento.')).toBeInTheDocument()
    expect(screen.getByText('Selecione uma opção.')).toBeInTheDocument()
    expect(screen.getByText('Informe um CEP válido.')).toBeInTheDocument()
    expect(screen.getByText('Escolha um objetivo principal.')).toBeInTheDocument()
  })

  it('navega para a etapa de saúde quando o formulário é válido', async () => {
    const user = userEvent.setup()
    mockCepSuccess()
    renderPage()

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

    await user.type(screen.getByPlaceholderText('(11) 99999-9999'), '11987654321')
    await user.type(screen.getByLabelText('Data de nascimento'), '1990-05-20')
    await user.click(screen.getByRole('button', { name: 'Mulher' }))
    await user.click(screen.getByRole('button', { name: /Emagrecimento/i }))
    await user.click(screen.getByRole('button', { name: /Continuar/i }))

    expect(await screen.findByText('Informe um CEP válido.')).toBeInTheDocument()
    expect(screen.queryByText('saude page')).not.toBeInTheDocument()
  })
})
